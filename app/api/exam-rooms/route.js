import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { getQuizById } from '@/lib/moodle-sql/get-quiz';

export async function GET() {
  await connect();
  const rooms = await ExamRoomModel.find();
  const data = [];

  for (const room of rooms) {
    const quizData = await getQuizById(room.quizId);

    data.push({
      ...room.toObject(),
      timeOpen: quizData.timeopen,
      timeClose: quizData.timeclose,
      timeLimit: quizData.timelimit,
      quizName: quizData.name,
    });
  }

  return NextResponse.json(data);
}
