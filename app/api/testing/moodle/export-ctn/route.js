import { NextResponse } from 'next/server';
import { exportContainer } from '@/lib/moodle/container';
import { dispatchEventBackupFinished } from '@/lib/moodle/webhooks';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const containerName = searchParams.get('containername');

  console.log('Container Name: ' + containerName);

  const res = await exportContainer(containerName);

  return NextResponse.json({ res }, { status: 200 });
}
