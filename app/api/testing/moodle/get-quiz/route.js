import { NextResponse } from 'next/server';
import { getQuizById } from '@/lib/moodle/db/control';

export async function GET(req) {
  const { searchParams } = req.nextUrl;
  const quizId = parseInt(searchParams.get('id'), 10);

  if (!quizId || isNaN(quizId)) {
    return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
  }

  try {
    const quiz = await getQuizById(quizId);

    console.log(quiz);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    return NextResponse.json(
      { error: 'Database query error', details: error.message },
      { status: 500 }
    );
  }
}
