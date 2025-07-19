import { NextResponse } from 'next/server';
import {
  STATUS_CHANGE,
  STATUS_CODE,
  dispatchStatusEvent,
} from '@/lib/moodle/status';
import { dispatchEventRestoreFinished } from '@/lib/moodle/webhooks';

export async function GET() {
  dispatchEventRestoreFinished({
    token: process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  });
  return NextResponse.json({ message: 'Event dispatch' });
}
