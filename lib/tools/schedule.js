import { CronJob } from 'cron';
import { toZonedTime, format } from 'date-fns-tz';
import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { getQuizById } from '@/lib/moodle/get-quiz';
import { createGCRJob, deleteGCRJob } from '@/lib/moodle/jobs';
import { STATUS_CODE, dispatchStatusEvent } from '@/lib/moodle/status';
import { timestampToCron, cronToReadableTime, checkCronTime } from './crontime';

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

  if (room.serviceUrl) {
    console.warn(`⚠️ Container deployed! Can't update time!`);
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

  // Update status
  room.status = STATUS_CODE.SCHEDULED;
  await room.save();
  dispatchStatusEvent(room.containerName, room.status);
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
