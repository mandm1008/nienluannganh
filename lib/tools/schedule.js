import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import FileInfoModel from '@/lib/db/models/FileInfo.model';
import { getQuizById } from '@/lib/moodle/get-quiz';
import { fromUnixTime, subMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { deployCloudRun } from '@/lib/cloud/run/deploy-moodle';
import { deleteCloudRun } from '@/lib/cloud/run/delete-moodle';
import { initContainer } from '@/lib/moodle/container';
import { CronJob } from 'cron';
import { clearFile } from '@/lib/moodle/restore';

/**
 * Job store map: key = `${containerName}--Open` or `--Close`
 * @type {Map<string, CronJob>}
 */
let jobs = new Map();

/**
 * Schedules background jobs for all existing exam containers.
 *
 * Connects to the database, fetches all exam rooms,
 * and asynchronously calls updateSchedule() for each room.
 *
 * @async
 * @function scheduleAllJob
 * @returns {Promise<void>}
 */
export async function scheduleAllJob() {
  await connectDB();

  const examRoomData = await ExamRoomModel.find({});

  if (!examRoomData.length) {
    console.log('ℹ️ No exam rooms found to schedule.');
    return;
  }

  await Promise.all(
    examRoomData.map((room) => updateSchedule(room.containerName))
  );

  console.log(`✅ Scheduled ${examRoomData.length} job(s).`);
}

/**
 * Updates (or creates) two scheduled jobs for a container:
 * - One to deploy the container at `timeopen`
 * - One to delete the container at `timeclose`
 *
 * If jobs already exist, they are cancelled and rescheduled.
 *
 * @async
 * @param {string} containerName - The unique container name (used as job key).
 * @returns {Promise<void>}
 */
export async function updateSchedule(containerName) {
  await connectDB();
  const room = await ExamRoomModel.findOne({ containerName });

  if (!room) return;

  const quizData = await getQuizById(room.quizId);
  if (!quizData) {
    console.warn(`⚠️ Quiz not found for room.quizId = ${room.quizId}`);
    return;
  }

  const jobOpenName = `${containerName}--Open`;
  const jobCloseName = `${containerName}--Close`;

  const openTimestamp = parseInt(quizData.timeopen, 10);
  const closeTimestamp = parseInt(quizData.timeclose, 10);

  const cronOpen = timestampToCron(openTimestamp, 10); // chạy sớm hơn 10'
  const cronClose = timestampToCron(closeTimestamp, -30); // trễ hơn 30'

  console.log('📆 Open:', cronOpen);
  console.log('📆 Close:', cronClose);

  // Hủy job cũ (open)
  if (jobs.has(jobOpenName)) {
    jobs.get(jobOpenName).stop();
    jobs.delete(jobOpenName);
  }

  // Chạy luôn nếu đang ở giữa open và close
  if (checkCronTime(cronOpen) && !checkCronTime(cronClose)) {
    createGCRJob(containerName);
  }

  const newJobOpen = new CronJob(
    cronOpen,
    () => createGCRJob(containerName),
    null,
    true,
    'Asia/Ho_Chi_Minh'
  );
  jobs.set(jobOpenName, newJobOpen);

  // Hủy job cũ (close)
  if (jobs.has(jobCloseName)) {
    jobs.get(jobCloseName).stop();
    jobs.delete(jobCloseName);
  }

  // if (checkCronTime(cronClose)) {
  //   deleteGCRJob(containerName);
  // }

  const newJobClose = new CronJob(
    cronClose,
    () => deleteGCRJob(containerName),
    null,
    true,
    'Asia/Ho_Chi_Minh'
  );
  jobs.set(jobCloseName, newJobClose);

  console.log(`✅ Updated schedule for ${containerName}`);
}

/**
 * Cancels any scheduled open/close jobs for a given container.
 *
 * @param {string} containerName - The name of the container whose jobs should be cancelled.
 * @returns {Promise<void>}
 */
export async function cancelSchedule(containerName) {
  const jobOpenName = containerName + '--Open';
  const jobCloseName = containerName + '--Close';

  const jobOpen = jobs.get(jobOpenName);
  if (jobOpen) {
    jobOpen.stop();
    jobs.delete(jobOpenName);
  }
  const jobClose = jobs.get(jobCloseName);
  if (jobClose) {
    jobClose.stop();
    jobs.delete(jobCloseName);
  }

  console.log(`🗑️ Deleted schedule for ${containerName}`);
}

/**
 * Convert ICT timestamp to UTC-based cron expression
 * @param {number} timestamp - Unix timestamp in seconds (in Asia/Ho_Chi_Minh timezone)
 * @param {number} offsetMinutes - Time offset in minutes
 * @returns {string} - Cron string in UTC
 */
export function timestampToCron(timestamp, offsetMinutes = 0) {
  const localDate = fromUnixTime(timestamp - offsetMinutes * 60);

  // fromZonedTime converts ICT local time to UTC date (type: Date)
  const utcDate = fromZonedTime(localDate, 'Asia/Ho_Chi_Minh');

  const min = utcDate.getUTCMinutes();
  const hour = utcDate.getUTCHours();
  const day = utcDate.getUTCDate();
  const month = utcDate.getUTCMonth() + 1;

  return `${min} ${hour} ${day} ${month} *`;
}

/**
 * Checks if the given cron time (in format "m h d M *") is earlier than the current time.
 *
 * Only supports fixed cron expressions like "30 14 1 7 *".
 * Does NOT support wildcards (*), ranges (x-y), or step values (*\/x).
 *
 * @param {string} cronExpr - The cron expression in fixed format (e.g., "30 14 1 7 *").
 * @returns {boolean} True if the time from cron is earlier than now.
 *
 * @example
 * checkCronTime("30 14 1 7 *"); // true if after July 1st 14:30 this year
 */
export function checkCronTime(cronExpr) {
  const [minute, hour, day, month] = cronExpr.split(' ').map(Number); // month is 1-based
  const now = new Date();

  // Construct the cron-based Date (assumes current year)
  const cronDate = new Date(now.getFullYear(), month - 1, day, hour, minute);

  return cronDate < now;
}

/**
 * Creates a GCR (Google Cloud Run) job for a given container.
 *
 * - If the container's service URL is missing, it triggers a new deployment.
 * - Then, it initializes the container by calling `initContainer`.
 *
 * @param {string} containerName - The name of the container (must match an ExamRoomModel document).
 * @returns {Promise<void>}
 */
export async function createGCRJob(containerName) {
  try {
    const room = await ExamRoomModel.findOne({ containerName });

    if (!room) {
      console.error(`❌ Room not found for container: ${containerName}`);
      return;
    }

    if (!room.serviceUrl) {
      console.log(`🚀 Deploying Cloud Run for container: ${containerName}`);
      const result = await deployCloudRun(
        room.quizId,
        room.containerName,
        room.dbName,
        room.folderName
      );

      if (!result?.serviceUrl) {
        console.error(`❌ Failed to deploy Cloud Run for ${containerName}`);
        return;
      }

      room.serviceUrl = result.serviceUrl;
      await room.save();
    } else {
      console.log(`✅ Cloud Run already exists for ${containerName}`);
    }

    // Init container with Moodle backup/user setup
    console.log(`⚙️  Initializing container: ${containerName}`);
    const initResult = await initContainer(containerName);

    if (!initResult?.success) {
      console.error(
        `❌ Failed to initialize container ${containerName}: ${initResult?.error}`
      );
    } else {
      console.log(`✅ Container ${containerName} initialized successfully.`);
    }
  } catch (err) {
    console.error(`❌ Error in createGCRJob(${containerName}): ${err.message}`);
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
 * @returns {Promise<void>} - Resolves when cleanup is complete.
 *
 * @example
 * await deleteGCRJob('quiz-container-001');
 */
export async function deleteGCRJob(containerName) {
  try {
    await connectDB();

    // Step 1: Delete Cloud Run service
    const { success, message } = await deleteCloudRun(containerName);

    if (success) {
      console.log(`🗑️ Cloud Run deleted: ${message}`);
    } else {
      console.error(`❌ Failed to delete Cloud Run: ${message}`);
    }

    // Step 2: Find and delete ExamRoom document
    const room = await ExamRoomModel.findOneAndDelete({ containerName });
    if (!room) {
      console.warn(`⚠️ No DB record found for container "${containerName}".`);
      return;
    }

    console.log(`✅ Deleted container "${containerName}" from database.`);

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
  } catch (error) {
    console.error(
      `❌ Error deleting GCR job (${containerName}): ${error.message}`
    );
  }
}
