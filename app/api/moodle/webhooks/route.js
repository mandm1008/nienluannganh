import handleEvents from '@/lib/moodle/services/webhooks';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const event = await req.json();

    console.log('[WEBHOOK] Received Moodle Webhook:', event.eventname);

    const res = await handleEvents(event);

    return NextResponse.json({ res }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK] Error processing Moodle Webhook:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
