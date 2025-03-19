import { scheduleJob } from 'node-schedule';
import { connect } from '../db/connect';
import ExamRoomModel from '../db/models/ExamRoom.model';
import { getQuizById } from '../moodle-sql/get-quiz';
import { fromZonedTime } from 'date-fns-tz';
import { subMinutes } from 'date-fns';
import { deployCloudRun } from '../cloud/run/deploy-moodle';
import { deleteCloudRun } from '../cloud/run/delete-moodle';

/**
 * @type {Map<String, Job>}
 */
let jobs = new Map();

export async function scheduleAllJob() {
  await connect();
  const examRoomData = await ExamRoomModel.find({});

  if (examRoomData) {
    for (const room of examRoomData) {
      updateSchedule(room.containerName);
    }
  }
}

export async function updateSchedule(containerName) {
  await connect();
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

    console.log(cronExpressionOpen, cronExpressionClose);

    // Cancel and reschedule existing job open if exists
    const jobOpen = jobs.get(jobOpenName);
    if (jobOpen) {
      jobOpen.cancel();
      jobs.delete(jobOpenName);
    }
    const newJobOpen = scheduleJob(cronExpressionOpen, async () => {
      // CREATE GCR
      try {
        const nroom = await ExamRoomModel.findOne({ containerName });
        if (!nroom.serviceUrl) {
          const { serviceUrl } = await deployCloudRun(
            room.containerName,
            room.dbName,
            room.folderName
          );
          nroom.serviceUrl = serviceUrl;
          await nroom.save();
        }
      } catch (err) {
        console.error(`�� ${err.message}`);
        return;
      }
    });
    jobs.set(jobOpenName, newJobOpen);

    // Cancel and reschedule existing job close if exists
    const jobClose = jobs.get(jobCloseName);
    if (jobClose) {
      jobClose.cancel();
      jobs.delete(jobCloseName);
    }
    const newJobClose = scheduleJob(cronExpressionClose, async () => {
      // DELETE GCR
      const { success, message } = await deleteCloudRun(containerName);
      if (success) {
        console.log(`�� ${message}`);
      } else {
        console.error(`�� ${message}`);
      }
    });
    jobs.set(jobCloseName, newJobClose);

    console.log(`��� Updated schedule for ${containerName}`);
  }
}

export async function deleteSchedule(containerName) {
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
