import handleEvents from '@/lib/moodle/webhooks';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const TOKEN = process.env.MOODLE_WEBHOOKS_TOKEN;

  try {
    const event = await req.json();

    console.log('Received Moodle Webhook:', event);

    if (event.token != TOKEN) {
      console.warn('@@@ Token webhooks in request not match: ' + event.token);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const res = await handleEvents(event);

    return NextResponse.json({ res }, { status: 200 });
  } catch (error) {
    console.error('Error processing Moodle Webhook:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
