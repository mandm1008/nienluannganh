import { NextResponse } from 'next/server';
import { deleteGCRJob } from '@/lib/moodle/jobs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const containerName = searchParams.get('containername');

  console.log('Container Name: ' + containerName);

  await deleteGCRJob(containerName);

  return NextResponse.json({ message: 'DELETE Successfully!' });
}

export const runtime = 'nodejs';
