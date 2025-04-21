import { scheduleJob } from 'node-schedule';
import { connectDB } from '../db/connect';
import ExamRoomModel from '../db/models/ExamRoom.model';
import { getQuizById } from '../moodle/get-quiz';
import { fromZonedTime } from 'date-fns-tz';
import { subMinutes } from 'date-fns';
import { deployCloudRun } from '../cloud/run/deploy-moodle';
import { deleteCloudRun } from '../cloud/run/delete-moodle';

/**
 * @type {Map<String, Job>}
 */
let jobs = new Map();

export async function scheduleAllJob() {
  await connectDB();
  const examRoomData = await ExamRoomModel.find({});

  if (examRoomData) {
    for (const room of examRoomData) {
      updateSchedule(room.containerName);
    }
  }
}

export async function updateSchedule(containerName) {
  await connectDB();
  const room = await ExamRoomModel.findOne({ containerName });
  if (room) {
    const quizData = await getQuizById(room.quizId);
    const jobOpenName = containerName + '--Open';
    console.log(quizData);
    const cronExpressionOpen = timestampToCron(
      parseInt(quizData.timeopen, 10),
      10
    );
    const jobCloseName = containerName + '--Close';
    const cronExpressionClose = timestampToCron(
      parseInt(quizData.timeclose, 10),
      -30
    );

    console.log(cronExpressionOpen, cronExpressionClose, dateNowToCron());

    // Cancel and reschedule existing job open if exists
    const jobOpen = jobs.get(jobOpenName);
    if (jobOpen) {
      jobOpen.cancel();
      jobs.delete(jobOpenName);
    }

    // Check cron time
    if (
      checkCronTime(cronExpressionOpen) &&
      !checkCronTime(cronExpressionClose)
    ) {
      createGCRJob(containerName);
    }

    const newJobOpen = scheduleJob(cronExpressionOpen, () => {
      createGCRJob(containerName);
    });
    jobs.set(jobOpenName, newJobOpen);

    // Cancel and reschedule existing job close if exists
    const jobClose = jobs.get(jobCloseName);
    if (jobClose) {
      jobClose.cancel();
      jobs.delete(jobCloseName);
    }
    const newJobClose = scheduleJob(cronExpressionClose, () => {
      deleteGCRJob(containerName);
    });
    jobs.set(jobCloseName, newJobClose);

    console.log(`��� Updated schedule for ${containerName}`);
  }
}

export async function cancelSchedule(containerName) {
  const jobOpenName = containerName + '--Open';
  const jobCloseName = containerName + '--Close';
  const jobOpen = jobs.get(jobOpenName);
  if (jobOpen) {
    jobOpen.cancel();
    jobs.delete(jobOpenName);
  }
  const jobClose = jobs.get(jobCloseName);
  if (jobClose) {
    jobClose.cancel();
    jobs.delete(jobCloseName);
  }
  console.log(`��� Deleted schedule for ${containerName}`);
}

/**
 *
 * @param {Number} timestamp
 * @param {String} timezone
 * @returns
 */
export function timestampToCron(
  timestamp,
  minutesOffset = 0,
  timezone = 'Asia/Ho_Chi_Minh'
) {
  let date = fromZonedTime(new Date(timestamp * 1000), timezone);
  date = subMinutes(date, minutesOffset);

  return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${
    date.getMonth() + 1
  } *`;
}

export function checkCronTime(cronExpr) {
  const [minute, hour, day, month] = cronExpr.split(' ').map(Number);
  const now = new Date();

  // Tạo một đối tượng Date từ cron
  const cronDate = new Date(now.getFullYear(), month - 1, day, hour, minute);

  return cronDate < now; // Kiểm tra cron có nhỏ hơn now không
}

export async function createGCRJob(containerName) {
  // CREATE GCR
  try {
    const nroom = await ExamRoomModel.findOne({ containerName });
    if (!nroom.serviceUrl) {
      const { serviceUrl } = await deployCloudRun(
        nroom.quizId,
        nroom.containerName,
        nroom.dbName,
        nroom.folderName
      );
      nroom.serviceUrl = serviceUrl;
      await nroom.save();
    }
  } catch (err) {
    console.error(`�� ${err.message}`);
    return;
  }
}

export async function deleteGCRJob(containerName) {
  // DELETE GCR
  const { success, message } = await deleteCloudRun(containerName);
  if (success) {
    console.log(`�� ${message}`);
  } else {
    console.error(`�� ${message}`);
  }

  await ExamRoomModel.findOneAndDelete({ containerName });
  console.log(`��� Deleted ${containerName} from database`);
}

function dateNowToCron() {
  const now = new Date(Date.now());

  const minute = now.getMinutes();
  const hour = now.getHours();
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;
  const dayOfWeek = '*';

  const cron = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  return cron;
}
