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

async function handleRestoreFinish(eventData) {}

export default handleEvents;
