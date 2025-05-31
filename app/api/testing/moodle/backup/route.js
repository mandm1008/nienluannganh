import { NextRequest, NextResponse } from 'next/server';
import { backupCourse } from '@/lib/moodle/backup';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const courseid = searchParams.get('courseid');
  const download = searchParams.get('download') !== null;

  console.log(courseid, download);

  const res = await backupCourse(courseid, download);

  return NextResponse.json(res, { status: 200 });
}
