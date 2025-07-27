import { NextResponse } from 'next/server';
import { restoreCourse } from '@/lib/moodle/restore';
import { updateQuizTime } from '@/lib/moodle/update';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const courseid = searchParams.get('courseid');
  const quizName = searchParams.get('quizname');
  const timeOpen = searchParams.get('timeopen');
  const timeClose = searchParams.get('timeclose');
  const timeLimit = searchParams.get('timelimit');

  const updateRes = await updateQuizTime(
    courseid,
    quizName,
    parseInt(timeOpen, 10),
    parseInt(timeClose, 10),
    parseInt(timeLimit, 10)
  );

  return NextResponse.json({ updateRes }, { status: 200 });
}
