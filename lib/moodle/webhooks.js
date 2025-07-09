import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { connectDB } from '../db/connect';

const EVENTS = {
  QUIZ_TIME_UPDATED: '\\local_cloudsupport\\event\\quiz_time_updated',
  RESTORE_FINISHED: '\\local_cloudsupport\\event\\restore_finished',
};

async function handleEvents(eventData) {
  const eventName = eventData.eventname;

  if (eventName === EVENTS.QUIZ_TIME_UPDATED) {
    return await handleQuizTimeUpdatedEvent(eventData);
  }

  if (eventName === EVENTS.RESTORE_FINISHED) {
    return await handleRestoreFinish(eventData);
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
      // Handle for local moodle token
      return {
        message: 'OK!',
      };
    }

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

export default handleEvents;
