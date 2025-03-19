import { scheduleAllJob } from '@/lib/tools/schedule';
import { NextResponse } from 'next/server';

export async function GET() {
  scheduleAllJob();

  return NextResponse.json(
    { message: 'Schedule job started successfully' },
    { status: 200 }
  );
}
