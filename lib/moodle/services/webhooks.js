import { ExamRoomModel } from '@/lib/db/models';
import { connectDB } from '@/lib/db/connect';
import { EventManager } from '@/lib/tools/events';
import { createRoomFromQuiz } from '@/lib/moodle/rooms';

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
  const TOKEN = process.env.MOODLE_WEBHOOKS_TOKEN;
  const quizId = eventData.other.quizid;
  const useCloud = eventData.other.usecloud;

  if (eventData.token != TOKEN) {
    console.warn('@@@ Token webhooks in request not match: ' + eventData.token);
    return { error: 'Invalid request' };
  }

  const response = await createRoomFromQuiz(quizId, useCloud, eventData.other);

  if (!response.ok) {
    console.error(`Failed to create room: `, response);

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
  const TOKEN = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
  if (eventData.other.status === 'success') {
    await connectDB();
    const courseid = eventData.other.courseid;
    const token = eventData.other.token;

    const examRoom = await ExamRoomModel.findOne({ token });

    if (!examRoom) {
      if (token !== TOKEN) {
        console.warn('[WEBHOOK] Invalid webhooks: ', eventData);
        return {
          message: 'Invalid request!',
        };
      }

      dispatchEventRestoreFinished({ courseid, token });
      return {
        message: 'OK!',
      };
    }

    examRoom.containerCourseId = courseid;
    await examRoom.save();

    dispatchEventRestoreFinished({ courseid, token });

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
  const TOKEN = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
  if (eventData.other.status === 'success') {
    await connectDB();
    const data = eventData.other;
    const token = eventData.other.token;

    const examRoom = await ExamRoomModel.findOne({ token });

    if (!examRoom) {
      if (token !== TOKEN) {
        console.warn('[WEBHOOK] Invalid webhooks: ', eventData);
        return {
          message: 'Invalid request!',
        };
      }

      dispatchEventBackupFinished(data);
      return {
        message: 'OK!',
      };
    }

    dispatchEventBackupFinished(data);
  }
}

export default handleEvents;
