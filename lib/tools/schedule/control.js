import { CronJob } from 'cron';
import { connectDB } from '@/lib/db/connect';
import { ExamRoomModel } from '@/lib/db/models';
import { getQuizById } from '@/lib/moodle/db/control';
import { createGCRJob, deleteGCRJob } from '@/lib/moodle/jobs';
import { STATUS_CODE, dispatchStatusEvent } from '@/lib/moodle/state/status';
import {
  timestampToCron,
  cronToReadableTime,
  checkCronTime,
  storeJob,
} from '@/lib/tools/schedule';

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
    console.log('ℹ️  No exam rooms found to schedule.');
    return;
  }

  for (const room of examRoomData) {
    try {
      await updateSchedule(room.containerName);
    } catch (err) {
      console.log(`@@ Error (scheduleAllJob - ${room.containerName})`);
    }
  }

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

  if (room.serviceUrl) {
    console.warn(`⚠️ Container deployed! Can't update time!`);
    return;
  }

  if (room.status && room.status > STATUS_CODE.SCHEDULED) {
    console.warn(`⚠️ Container on run deploy! Can't update time!`);
    return;
  }

  const quizData = await getQuizById(room.quizId);
  if (!quizData) {
    console.warn(`⚠️ Quiz not found for room.quizId = ${room.quizId}`);
    return;
  }

  // Update status
  room.status = STATUS_CODE.SCHEDULE_UPDATING;
  await room.save();
  dispatchStatusEvent(room.containerName, room.status);

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

  const openStoreJob = storeJob.open();
  const closeStoreJob = storeJob.close();

  await openStoreJob.cancel(containerName);
  await closeStoreJob.cancel(containerName);

  // Chạy luôn nếu đang ở giữa open và close
  if (checkCronTime(cronOpen) && !checkCronTime(cronClose)) {
    createGCRJob(containerName);
  } else {
    openStoreJob.set(containerName, {
      time: cronOpen,
      handler: () => createGCRJob(containerName),
    });
  }

  closeStoreJob.set(containerName, {
    time: cronClose,
    handler: () => deleteGCRJob(containerName),
  });

  // Update status
  room.status = STATUS_CODE.SCHEDULED;
  await room.save();
  dispatchStatusEvent(room.containerName, room.status);
  console.log(`✅ Updated schedule for ${containerName}`);
}

/**
 * Cancels any scheduled open/close jobs for a given container.
 *
 * @param {string} containerName - The name of the container whose jobs should be cancelled.
 * @returns {Promise<void>}
 */
export async function cancelSchedule(containerName) {
  await storeJob.open().cancel(containerName);
  await storeJob.close().cancel(containerName);

  console.log(`🗑️  Cancel schedule for ${containerName}`);
}

/**
 * Cancels any scheduled open jobs for a given container.
 *
 * @param {string} containerName - The name of the container whose jobs should be cancelled.
 * @returns {Promise<void>}
 */
export async function cancelOpenSchedule(containerName) {
  await storeJob.open().cancel(containerName);

  console.log(`🗑️  Cancel open schedule for ${containerName}`);
}

/**
 * Cancels any scheduled close jobs for a given container.
 *
 * @param {string} containerName - The name of the container whose jobs should be cancelled.
 * @returns {Promise<void>}
 */
export async function cancelCloseSchedule(containerName) {
  await storeJob.close().cancel(containerName);

  console.log(`🗑️  Cancel close schedule for ${containerName}`);
}
