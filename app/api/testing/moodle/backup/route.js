import { NextResponse } from 'next/server';
import { backupCourse, exportUsers } from '@/lib/moodle/backup';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const courseid = searchParams.get('courseid');

  console.log('CourseID: ' + courseid);

  const resBackup = await backupCourse(courseid);
  const resUsers = await exportUsers(courseid);

  return NextResponse.json({ resBackup, resUsers }, { status: 200 });
}
