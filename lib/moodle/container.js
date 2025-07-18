import { backupCourse, exportUsers } from '@/lib/moodle/backup';
import FileInfoModel from '@/lib/db/models/FileInfo.model';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import {
  uploadFile,
  restoreCourse,
  restoreUsers,
  clearFile,
} from '@/lib/moodle/restore';
import { getQuizById } from './get-quiz';
import { connectDB } from '@/lib/db/connect';
import { STATUS_CODE, dispatchStatusEvent } from './status';
import { listenEventRestoreFinished } from './webhooks';

/**
 * Initializes a Moodle container by:
 * 1. Fetching a token from the container.
 * 2. Backing up the course and exporting users from the original system.
 * 3. Saving backup metadata to the database.
 * 4. Uploading backup files to the container.
 * 5. Restoring the course and users inside the container.
 *
 * @async
 * @function initContainer
 * @param {string} containerName - The container name (must match an ExamRoomModel document).
 * @returns {Promise<{ success: boolean, error?: string }>} Deployment result.
 *
 * @example
 * const result = await initContainer('quiz-container-123');
 * if (!result.success) console.error(result.error);
 */
export async function initContainer(containerName) {
  await connectDB();
  let room = await ExamRoomModel.findOne({ containerName });

  if (!room) {
    const msg = `❌ Room not found for container: ${containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  // set status
  room.status = STATUS_CODE.DEPLOYING_GETTING_TOKEN;
  await room.save();
  dispatchStatusEvent(room.containerName, room.status);
  // B1: Get Token CloudSupport
  console.log(`🌍 Get Token webservice ${containerName} ...`);
  room = await getTokenContainer(room.containerName);

  if (!room.token) {
    const msg = `❌ Token not retrieved for room: ${containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }
  console.log(`✅ Success get Token webservice ${containerName}`);

  // set status
  room.status = STATUS_CODE.DEPLOYING_RESTORING_DATA;
  await room.save();
  dispatchStatusEvent(room.containerName, room.status);
  // B2: Get File Backup & UserData
  console.log(`🔧 Get BackupFile ${containerName} ...`);
  const quizData = await getQuizById(room.quizId);
  if (!quizData || !quizData.courseid) {
    const msg = `❌ Failed to fetch quiz or courseId for ${room.quizId}`;
    console.error(msg);
    return { success: false, error: msg };
  }
  const courseId = quizData.courseid;

  const fileCourseData = await backupCourse(courseId);
  if (!fileCourseData.success) {
    console.error(`❌ Failed to fetch backupFile for ${room.quizId}`);
    console.log(fileCourseData);
    return {
      success: false,
      error: `❌ Failed to fetch backupFile for ${room.quizId}`,
    };
  }

  const fileUserData = await exportUsers(courseId);
  if (!fileUserData.success) {
    console.error(`❌ Failed to fetch userFile for ${room.quizId}`);
    console.error(fileUserData);
    return {
      success: false,
      error: `❌ Failed to fetch userFile for ${room.quizId}`,
    };
  }
  console.log(`✅ Success get BackupFile ${containerName}`);

  // B3: Save data
  console.log(`🔧 Save BackupFile ${containerName} ...`);
  const fileCourse = new FileInfoModel({
    fileName: fileCourseData.data.filename,
    contentHash: fileCourseData.data.contenthash,
    url: fileCourseData.data.url,
  });
  await fileCourse.save();

  const fileUsers = new FileInfoModel({
    fileName: fileUserData.data.filename,
    contentHash: fileUserData.data.contenthash,
    url: fileUserData.data.url,
  });
  await fileUsers.save();

  room.fileBackupId = fileCourse._id;
  room.fileUsersId = fileUsers._id;
  await room.save();
  console.log(`✅ Success save BackupFile ${containerName}`);

  // B4: Upload Data
  const resCourseUpFile = await uploadFile(fileCourse.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!resCourseUpFile.success) {
    const msg = `❌ Failed to upload course file - ${room.containerName}`;
    console.error(resCourseUpFile);
    return { success: false, error: msg };
  }

  const resUsersUpFile = await uploadFile(fileUsers.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!resUsersUpFile.success) {
    const msg = `❌ Failed to upload user file - ${room.containerName}`;
    console.error(resUsersUpFile);
    return { success: false, error: msg };
  }

  // B5: Import data in container
  const restoreUsersStatus = await restoreUsers(fileUsers.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!restoreUsersStatus.success) {
    const msg = `❌ Failed to import users in container - ${room.containerName}`;
    console.error(restoreUsersStatus);
    return { success: false, error: msg };
  }

  console.log('Import Users Status: ', restoreUsersStatus);

  const restoreCourseStatus = await restoreCourse(0, fileCourse.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!restoreCourseStatus.success) {
    const msg = `❌ Failed to restore course in container - ${room.containerName}`;
    console.error(restoreCourseStatus);
    return { success: false, error: msg };
  }

  console.log('Restore Status: ', restoreCourseStatus);

  // wait event
  await listenEventRestoreFinished(room.token);

  return { success: true };
}

/**
 * Retrieves a Moodle token from the deployed container and saves it to the given ExamRoomModel document.
 *
 * This function sends a POST request to the service's `create_token.php` endpoint using the main Moodle token.
 * If the request is successful, it stores the new token in `room.token` and saves the document.
 * If the request fails and retry count (`count`) is less than 3, it retries using `initContainer()`.
 *
 * @async
 * @function getTokenContainer
 * @param {import('@/lib/db/models/ExamRoom.model').default} room - An instance of ExamRoomModel, representing the exam container.
 * @param {number} [count=0] - The number of retry attempts made so far.
 * @returns {Promise<ExamRoomModel>} The updated room document, possibly with the `token` field updated.
 *
 * @example
 * const room = await ExamRoomModel.findById('...');
 * const updatedRoom = await getTokenContainer(room);
 * console.log(updatedRoom.token);
 */
async function getTokenContainer(containerName, count = 0) {
  const moodleToken = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
  const room = await ExamRoomModel.findOne({ containerName });

  if (room.token) {
    return room;
  }

  const moodleBaseUrl = room.serviceUrl;
  const apiUrl = `${moodleBaseUrl}/local/cloudsupport/create_token.php`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      main_token: moodleToken,
    }),
  });

  console.log(response);

  if (response.ok) {
    const data = await response.json();
    room.token = data.token;
    await room.save();
    return room;
  } else if (count < 3) {
    console.log(
      `Failed! Get Token (${room.serviceUrl}) - ${count + 1}. Retry!`
    );
    return await getTokenContainer(containerName, count + 1);
  }

  return room;
}

export async function exportContainer(containerName) {
  await connectDB();
  const TOKEN = process.env.MOODLE_TOKEN;
  const room = await ExamRoomModel.findOne({ containerName });

  if (!room) {
    const msg = `❌ Room not found for container: ${containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  if (!room.serviceUrl) {
    const msg = `❌ Room not deployment: ${containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  if (!room.token || !TOKEN) {
    const msg = `❌ Token not retrieved for room: ${containerName} or local moodle`;
    console.error(msg);
    return { success: false, error: msg };
  }

  const quizData = await getQuizById(room.quizId);
  if (!quizData || !quizData.courseid) {
    const msg = `❌ Failed to fetch quiz or courseId for ${room.quizId}`;
    console.error(msg);
    return { success: false, error: msg };
  }
  const targetCourseId = quizData.courseid;
  const courseId = room.containerCourseId;

  // set status
  room.status = STATUS_CODE.DELETING_EXPORTING_DATA;
  await room.save();
  dispatchStatusEvent(room.containerName, room.status);

  // B1: Get File Backup
  console.log(`🔧 Get BackupFile ${containerName} ...`);
  // keepLiveContainer(containerName, 10);
  const fileCourseData = await backupCourse(courseId, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });
  if (!fileCourseData.success) {
    console.error(`❌ Failed to fetch backupFile from ${room.containerName}`);
    console.log(fileCourseData);
    return {
      success: false,
      error: `❌ Failed to fetch backupFile from ${room.containerName}`,
    };
  }

  // B2: Upload File
  const resCourseUpFile = await uploadFile(fileCourseData.data.filename);

  if (!resCourseUpFile.success) {
    const msg = `❌ Failed to upload course file - ${room.containerName}`;
    console.error(resCourseUpFile);
    return { success: false, error: msg };
  }

  // B3: Import data in local moodle
  const restoreCourseStatus = await restoreCourse(
    targetCourseId,
    fileCourseData.data.filename
  );

  if (!restoreCourseStatus.success) {
    const msg = `❌ Failed to restore course in container - ${room.containerName}`;
    console.error(restoreCourseStatus);
    return { success: false, error: msg };
  }

  await listenEventRestoreFinished(TOKEN);

  await clearFile(fileCourseData.data.filename);

  console.log('Restore Status: ', restoreCourseStatus);

  return { success: true };
}
