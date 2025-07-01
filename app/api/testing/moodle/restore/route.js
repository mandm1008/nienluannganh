import { NextResponse } from 'next/server';
import { restoreCourse } from '@/lib/moodle/restore';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filepath');
  const courseid = searchParams.get('courseid');

  console.log('FileName: ' + filename);
  console.log('CourseID: ' + courseid);

  const restoreRes = await restoreCourse(courseid, filename);

  return NextResponse.json({ restoreRes }, { status: 200 });
}
