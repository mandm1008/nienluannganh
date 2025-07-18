import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { connectDB } from '../db/connect';
import { EventManager } from '../tools/events';

const EVENTS = {
  QUIZ_TIME_UPDATED: '\\local_cloudsupport\\event\\quiz_time_updated',
  RESTORE_FINISHED: '\\local_cloudsupport\\event\\restore_finished',
  BACKUP_FINISHED: '\\local_cloudsupport\\event\\backup_finished',
};

function dispatchEvent(eventName, data) {
  console.log(`Dispatch event (${eventName}): `, data);
  EventManager.emit(eventName, data);
}

export function dispatchEventRestoreFinished(data) {
  dispatchEvent(EVENTS.RESTORE_FINISHED, data);
}

export function dispatchEventBackupFinished(data) {
  dispatchEvent(EVENTS.BACKUP_FINISHED, data);
}

async function listenEvent(eventName) {
  const [data] = await EventManager.once(eventName);

  return data;
}

export async function listenEventRestoreFinished(token) {
  const data = await listenEvent(EVENTS.RESTORE_FINISHED);

  if (data.token === token) {
    return data;
  } else {
    return await listenEventRestoreFinished(token);
  }
}

export async function listenEventBackupFinished(token) {
  const data = await listenEvent(EVENTS.BACKUP_FINISHED);

  console.log('Event backup: ', data);

  if (data.token === token) {
    return data;
  } else {
    return await listenEventBackupFinished(token);
  }
}

export const LOCAL_MOODLE = 'local_moodle';

async function handleEvents(eventData) {
  const eventName = eventData.eventname;

  if (eventName === EVENTS.QUIZ_TIME_UPDATED) {
    return await handleQuizTimeUpdatedEvent(eventData);
  }

  if (eventName === EVENTS.RESTORE_FINISHED) {
    return await handleRestoreFinish(eventData);
  }

  if (eventName === EVENTS.BACKUP_FINISHED) {
    return await handleBackupFinish(eventData);
  }
}

async function handleQuizTimeUpdatedEvent(eventData) {
  const quizId = eventData.other.quizid;

  const response = await fetch(
    `http://localhost:3000/api/moodle/create-room?id=${quizId}`
  );

  if (!response.ok) {
    console.error(`Failed to create room: ${await response.text()}`);

    return {
      error: 'Failed to create room!',
    };
  }

  return {
    message: 'OK!',
    quizId,
  };
}

async function handleRestoreFinish(eventData) {
  if (eventData.other.status === 'success') {
    await connectDB();
    const courseid = eventData.other.courseid;
    const token = eventData.other.token;

    const examRoom = await ExamRoomModel.findOne({ token });

    if (!examRoom) {
      console.error('Not exam room match token: ' + token);

      dispatchEventRestoreFinished({ courseid, token });
      // Handle for local moodle token
      return {
        message: 'OK!',
      };
    }

    dispatchEventRestoreFinished({ courseid, token });

    examRoom.containerCourseId = courseid;

    await examRoom.save();

    return {
      message: 'OK!',
    };
  } else {
    console.error('Failed restore course!!!!', eventData.other.error);
    return {
      message: 'OK!',
    };
  }
}

async function handleBackupFinish(eventData) {
  if (eventData.other.status === 'success') {
    await connectDB();
    const data = eventData.other;
    const token = eventData.other.token;

    const examRoom = await ExamRoomModel.findOne({ token });

    if (!examRoom) {
      console.error('Not exam room match token: ' + token);

      dispatchEventBackupFinished(eventData.other);
      // Handle for local moodle token
      return {
        message: 'OK!',
      };
    }

    dispatchEventBackupFinished(eventData.other);
  }
}

export default handleEvents;
