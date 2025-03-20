import { getQuizIdsByCourseId } from '@/lib/moodle/get-quiz';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const event = await req.json();

    console.log('Received Moodle Webhook:', event);

    // data
    const eventName = event.eventname;

    if (
      eventName === '\\core\\event\\calendar_event_updated' ||
      eventName === '\\core\\event\\calendar_event_created'
    ) {
      const courseId = event.courseid;
      const quizIds = await getQuizIdsByCourseId(courseId);
      console.log(`Quiz updated: ${event.other.name}`);
      console.log(`Quiz updated ids: ${quizIds}`);

      // Update quiz in your database
      for (const quizId of quizIds) {
        const response = await fetch(
          `http://localhost:3000/api/moodle/create-room?id=${quizId}`
        );
        if (!response.ok) {
          console.error(`Failed to create room: ${await response.text()}`);
        }
      }
    }

    return NextResponse.json({ message: 'Webhook received' }, { status: 200 });
  } catch (error) {
    console.error('Error processing Moodle Webhook:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

/* Sample data
  Received Moodle Webhook: {
    eventname: '\\core\\event\\calendar_event_updated',
    component: 'core',
    action: 'updated',
    target: 'calendar_event',
    objecttable: 'event',
    objectid: '2',
    crud: 'u',
    edulevel: 0,
    contextid: 21,
    contextlevel: 50,
    contextinstanceid: '2',
    userid: '2',
    courseid: '2',
    relateduserid: null,
    anonymous: 0,
    other: { repeatid: 0, timestart: 1742774340, name: 'KTCK (Quiz closes)' },
    timecreated: 1742294358,
    host: '34.142.220.218',
    token: '',
    extra: ''
  }
    */
