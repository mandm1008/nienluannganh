import { NextResponse } from 'next/server';
import {
  STATUS_CHANGE,
  STATUS_CODE,
  dispatchStatusEvent,
} from '@/lib/moodle/status';

export async function GET() {
  dispatchStatusEvent(
    'elearningsystem-20250717104633',
    STATUS_CODE.DEPLOYING_INITIALIZING
  );
  return NextResponse.json({ message: 'Event dispatch' });
}
