import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import FileInfoModel from '@/lib/db/models/FileInfo.model';
import { getQuizById } from '@/lib/moodle/get-quiz';
import { toZonedTime, format } from 'date-fns-tz';
import { deployCloudRun } from '@/lib/cloud/run/deploy-moodle';
import { deleteCloudRun } from '@/lib/cloud/run/delete-moodle';
import { initContainer, exportContainer } from '@/lib/moodle/container';
import { CronJob } from 'cron';
import { clearFile } from '@/lib/moodle/restore';
import { deleteBucket } from '@/lib/cloud/storage/controls';

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
  const openTimeOffset = parseInt(
    process.env.MOODLE_OFFSET_OPENTIME || '-10', // default -10'
    10
  );
  const closeTimeOffset = parseInt(
    process.env.MOODLE_OFFSET_CLOSETIME || '10', // default +10'
    10
  );

  const cronOpen = timestampToCron(openTimestamp, openTimeOffset);
  const cronClose = timestampToCron(closeTimestamp, closeTimeOffset);

  console.log('📆 Open:', cronOpen, '->', cronToReadableTime(cronOpen));
  console.log('📆 Close:', cronClose, '->', cronToReadableTime(cronClose));

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
    'UTC'
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
    'UTC'
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
 * Convert Unix timestamp (seconds) to UTC cron expression
 * @param timestamp Unix timestamp in seconds (UTC)
 * @param offsetMinutes Optional offset in minutes (can be negative)
 * @returns string Cron string in UTC
 */
export function timestampToCron(timestamp, offsetMinutes = 0) {
  const baseDate = new Date(timestamp * 1000);
  const adjustedTime = baseDate.getTime() + offsetMinutes * 60 * 1000;
  const adjustedDate = new Date(adjustedTime);

  const min = adjustedDate.getUTCMinutes();
  const hour = adjustedDate.getUTCHours();
  const day = adjustedDate.getUTCDate();
  const month = adjustedDate.getUTCMonth() + 1; // Month is 0-based

  return `${min} ${hour} ${day} ${month} *`;
}

/**
 * Convert a UTC cron string to a human-readable time in a specific timezone
 * @param cronExpr - Cron string in UTC format (e.g. "41 6 6 7 *")
 * @param timeZone - Timezone to convert to (default: 'Asia/Ho_Chi_Minh')
 * @returns {string} Readable time like "Sunday, 6 July 2025, 1:41 PM (GMT+7)"
 */
export function cronToReadableTime(cronExpr, timeZone = 'Asia/Ho_Chi_Minh') {
  const [minStr, hourStr, dayStr, monthStr] = cronExpr.split(' ');

  const year = new Date().getUTCFullYear(); // or your fixed year
  const utcDate = new Date(
    Date.UTC(
      year,
      parseInt(monthStr) - 1,
      parseInt(dayStr),
      parseInt(hourStr),
      parseInt(minStr)
    )
  );

  return format(
    toZonedTime(utcDate, timeZone),
    'EEEE, d MMMM yyyy, h:mm a (zzz)',
    { timeZone }
  );
}

/**
 * Checks if the given cron time (in format "m h d M *") is earlier than current UTC time.
 *
 * Only supports fixed cron expressions like "30 14 1 7 *".
 * Does NOT support wildcards (*), ranges (x-y), or step values (*\/x).
 *
 * @param {string} cronExpr - The cron expression in fixed format (e.g., "30 14 1 7 *").
 * @returns {boolean} True if the UTC time from cron is earlier than now (also UTC).
 *
 * @example
 * checkCronTime("30 14 1 7 *"); // true if now is after July 1st 14:30 UTC this year
 */
export function checkCronTime(cronExpr) {
  const [minute, hour, day, month] = cronExpr.split(' ').map(Number); // month is 1-based

  const now = new Date(); // current time in UTC
  const cronDate = new Date(
    Date.UTC(now.getUTCFullYear(), month - 1, day, hour, minute)
  );

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

    fetch(room.serviceUrl).catch(() => {});

    async function waitWithCountdown(seconds) {
      for (let i = seconds; i > 0; i--) {
        process.stdout.write(`⏳ Đợi ${i}s...\r`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      console.log('\n✅ Đã hết thời gian chờ.');
    }

    await waitWithCountdown(30);

    // Init container with Moodle backup/user setup
    console.log(`⚙️  Initializing container: ${containerName}`);
    const initResult = await initContainer(containerName);

    if (!initResult?.success) {
      console.error(
        `❌ Failed to initialize container ${containerName}: ${initResult?.error}`
      );
    } else {
      console.log(`✅ Container ${containerName} initialized successfully.`);

      // keepLiveContainer(containerName, 14);
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

    // Begin
    await exportContainer(containerName);

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

    // Delete Bucket
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
  } catch (error) {
    console.error(
      `❌ Error deleting GCR job (${containerName}): ${error.message}`
    );
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
