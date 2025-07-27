import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import FileInfoModel from '@/lib/db/models/FileInfo.model';
import { getQuizById } from '@/lib/moodle/get-quiz';
import { deployCloudRun, deleteCloudRun } from '@/lib/cloud/run/controls';
import { initContainer, exportContainer } from '@/lib/moodle/container';
import { clearFile } from '@/lib/moodle/restore';
import { deleteBucket } from '@/lib/cloud/storage/controls';
import { dropDatabase } from '@/lib/cloud/sql/controls';
import { STATUS_CODE, dispatchStatusEvent } from './status';
import { ERROR_CODE, dispatchErrorEvent } from './errors';

/**
 * Creates a GCR (Google Cloud Run) job for a given container.
 *
 * - If the container's service URL is missing, it triggers a new deployment.
 * - Then, it initializes the container by calling `initContainer`.
 *
 * @param {string} containerName - The name of the container (must match an ExamRoomModel document).
 * @returns {Promise<boolean>}
 */
export async function createGCRJob(containerName) {
  await connectDB();
  const room = await ExamRoomModel.findOne({ containerName });

  if (!room) {
    console.error(`❌ Room not found for container: ${containerName}`);
    return true;
  }

  try {
    if (!room.serviceUrl) {
      // set status
      room.status = STATUS_CODE.DEPLOYING_STARTING;
      await room.save();
      dispatchStatusEvent(room.containerName, STATUS_CODE.DEPLOYING_STARTING);

      // set status
      room.status = STATUS_CODE.DEPLOYING_CREATING_CONTAINER;
      await room.save();
      dispatchStatusEvent(
        room.containerName,
        STATUS_CODE.DEPLOYING_CREATING_CONTAINER
      );

      console.log(`🚀 Deploying Cloud Run for container: ${containerName}`);
      const result = await deployCloudRun(
        room.quizId,
        room.containerName,
        room.dbName,
        room.folderName
      );

      if (!result?.serviceUrl) {
        console.error(`❌ Failed to deploy Cloud Run for ${containerName}`);
        room.error = ERROR_CODE.ERROR_DEPLOY;
        await room.save();
        dispatchErrorEvent(room.containerName, room.error);
        return false;
      }

      room.serviceUrl = result.serviceUrl;
      await room.save();
    } else {
      console.log(`✅ Cloud Run already exists for ${containerName}`);
    }

    // set status
    room.status = STATUS_CODE.DEPLOYING_INITIALIZING;
    await room.save();
    dispatchStatusEvent(room.containerName, STATUS_CODE.DEPLOYING_INITIALIZING);

    fetch(room.serviceUrl).catch(() => {});

    async function waitWithCountdown(seconds) {
      for (let i = seconds; i >= 0; i--) {
        process.stdout.write(
          `⏳ Chờ hệ thống ổn định ${i}s...${i == 0 ? 'done.' : ''}\r`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await waitWithCountdown(20);

    // Init container with Moodle backup/user setup
    console.log(`⚙️  Initializing container: ${containerName}`);
    const initResult = await initContainer(containerName);

    if (!initResult?.success) {
      console.error(
        `❌ Failed to initialize container ${containerName}: ${initResult?.error}`
      );
      room.error = ERROR_CODE.ERROR_INIT;
      await room.save();
      dispatchErrorEvent(room.containerName, room.error);
      return false;
    } else {
      console.log(`✅ Container ${containerName} initialized successfully.`);

      // set status
      room.status = STATUS_CODE.DEPLOYED;
      await room.save();
      dispatchStatusEvent(room.containerName, STATUS_CODE.DEPLOYED);

      // keepLiveContainer(containerName, 14);
      return true;
    }
  } catch (err) {
    console.error(`❌ Error in createGCRJob(${containerName}): ${err.message}`);
    console.error(err.stack);
    room.error = ERROR_CODE.ERROR_DIE;
    await room.save();
    dispatchErrorEvent(room.containerName, room.error);
    return false;
  }
}

/**
 * Deletes a Cloud Run service and cleans up associated resources.
 *
 * This function performs the following steps:
 * 1. Deletes the Cloud Run service with the given container name.
 * 2. Removes the corresponding ExamRoom record from the database.
 * 3. Deletes any associated FileInfo documents and their physical files from disk.
 *
 * @async
 * @function deleteGCRJob
 * @param {string} containerName - The name of the Cloud Run container to delete.
 * @param {Object} options - The name of the Cloud Run container to delete.
 * @param {boolean} [options.saveData=true] - The name of the Cloud Run container to delete.
 * @returns {Promise<boolean>} - Resolves when cleanup is complete.
 *
 * @example
 * await deleteGCRJob('quiz-container-001');
 */
export async function deleteGCRJob(containerName, { saveData = true } = {}) {
  await connectDB();
  const room = await ExamRoomModel.findOne({ containerName });

  if (!room) {
    console.warn(`⚠️ No DB record found for container "${containerName}".`);
    return true;
  }

  try {
    // set status
    room.status = STATUS_CODE.DELETING_STARTING;
    await room.save();
    dispatchStatusEvent(room.containerName, room.status);

    // Begin
    if (saveData) {
      await exportContainer(containerName);
    }

    // set status
    room.status = STATUS_CODE.DELETING_CONTAINER;
    await room.save();
    dispatchStatusEvent(room.containerName, room.status);

    // Step 1: Delete Cloud Run service
    if (room.serviceUrl) {
      const { success, message } = await deleteCloudRun(containerName);

      if (success) {
        console.log(`🗑️  Cloud Run deleted: ${message}`);
      } else {
        console.error(`❌ Failed to delete Cloud Run: ${message}`);
      }
    }

    // Step 2: Delete ExamRoom document
    await ExamRoomModel.deleteOne({ containerName });

    // Step 3: Delete Bucket
    await deleteBucket(room.folderName);

    console.log(`✅ Delete container "${containerName}" from database.`);

    // Step 4: Delete file info and actual files
    const fileIdsToDelete = [room.fileBackupId, room.fileUsersId].filter(
      Boolean
    );

    for (const fileId of fileIdsToDelete) {
      const fileDoc = await FileInfoModel.findByIdAndDelete(fileId);
      if (fileDoc) {
        await clearFile(fileDoc.fileName);
        console.log(`🧹 Deleted file and document: ${fileDoc.fileName}`);
      }
    }

    // Step 5: Drop db moodle
    await dropDatabase(room.dbName);

    // set status
    dispatchStatusEvent(room.containerName, STATUS_CODE.DELETED);
    return true;
  } catch (error) {
    console.error(
      `❌ Error deleting GCR job (${containerName}): ${error.message}`
    );
    return false;
  }
}

export async function stopGCRJob(containerName) {
  await connectDB();
  const room = await ExamRoomModel.findOne({ containerName });

  if (!room) {
    console.warn(`⚠️ No DB record found for container "${containerName}".`);
    return true;
  }

  try {
    // set status
    room.status = STATUS_CODE.STOPING;
    await room.save();
    dispatchStatusEvent(room.containerName, room.status);

    // Step 1: Delete Cloud Run service
    const { success, message } = await deleteCloudRun(containerName);

    if (success) {
      console.log(`🗑️  Cloud Run deleted: ${message}`);
      room.serviceUrl = undefined;
      room.token = undefined;
      room.containerCourseId = undefined;
      room.markModified('serviceUrl');
      room.markModified('token');
      room.markModified('containerCourseId');
      await room.save();
    } else {
      console.error(`❌ Failed to delete Cloud Run: ${message}`);
    }

    // Step 2: Delete Bucket
    await deleteBucket(room.folderName);
    console.log(`✅ Delete container "${containerName}" from database.`);

    // Step 3: Delete file info and actual files
    const fileIdsToDelete = [room.fileBackupId, room.fileUsersId].filter(
      Boolean
    );

    for (const fileId of fileIdsToDelete) {
      const fileDoc = await FileInfoModel.findByIdAndDelete(fileId);
      if (fileDoc) {
        await clearFile(fileDoc.fileName);
        console.log(`🧹 Deleted file and document: ${fileDoc.fileName}`);
      }
    }

    room.fileBackupId = undefined;
    room.markModified('fileBackupId');
    room.fileUsersId = undefined;
    room.markModified('fileUsersId');
    await room.save();

    // Step 5: Drop db moodle
    await dropDatabase(room.dbName);

    // set status
    room.status = STATUS_CODE.STOPED;
    await room.save();
    dispatchStatusEvent(room.containerName, room.status);
    return true;
  } catch (error) {
    console.error(`❌ Error stop GCR job (${containerName}): ${error.message}`);
    return false;
  }
}

export async function fixErrorJob(containerName) {
  await connectDB();
  const room = await ExamRoomModel.findOne({ containerName });

  if (!room) {
    console.warn(
      `[AUTO_FIX] No DB record found for container "${containerName}".`
    );
    return true;
  }

  try {
    const errorCode = room.error;
    if (!errorCode) {
      console.warn(`[AUTO_FIX] No error in "${containerName}". Exit`);
      return true;
    }

    // clear error and start auto fix
    room.error = undefined;
    room.markModified('error');
    await room.save();

    if (errorCode === ERROR_CODE.ERROR_DIE) {
      if (!(await stopGCRJob(containerName))) return false;
      if (!(await createGCRJob(containerName))) return false;
    }

    if (errorCode === ERROR_CODE.ERROR_DEPLOY) {
      if (!(await createGCRJob(containerName))) return false;
    }

    if (errorCode === ERROR_CODE.ERROR_INIT) {
      // Init container with Moodle backup/user setup
      console.log(`⚙️  Initializing container: ${containerName}`);
      const initResult = await initContainer(containerName);

      if (!initResult?.success) {
        console.error(
          `[AUTO_FIX] Failed to initialize container ${containerName}: ${initResult?.error}`
        );
        room.error = ERROR_CODE.ERROR_INIT;
        await room.save();
        dispatchErrorEvent(room.containerName, room.error);
        return false;
      } else {
        console.log(`✅ Container ${containerName} initialized successfully.`);

        // set status
        room.status = STATUS_CODE.DEPLOYED;
        await room.save();
        dispatchStatusEvent(room.containerName, STATUS_CODE.DEPLOYED);
        return true;
      }
    }

    // update error
    room.error = undefined;
    await room.save();
    return true;
  } catch (error) {
    console.log('[AUTO_FIX] Error: ', error.message);
    room.error = ERROR_CODE.ERROR_DIE;
    await room.save();
    dispatchErrorEvent(room.containerName, room.error);
    return false;
  }
}

export async function keepLiveContainer(containerName, waitCountdown = 8) {
  const room = await ExamRoomModel.findOne({ containerName });
  console.log(`⚙️  Start keep alive container ${containerName}.`);
  let i = 0;
  const interval = setInterval(() => {
    fetch(room.serviceUrl).catch(() => {});
    console.log(`✅ Fetch ${i + 1} to ${room.serviceUrl}.`);
    if (i >= waitCountdown - 1) {
      clearInterval(interval);
      console.log(`⚙️  End keep alive container ${containerName}`);
    }
    i++;
  }, 3 * 60 * 1000);
}
