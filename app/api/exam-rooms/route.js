import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { getQuizById } from '@/lib/moodle/get-quiz';

export async function GET() {
  await connectDB();
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
      courseName: quizData.coursename,
      courseId: quizData.courseid,
      serviceUrl: room.serviceUrl
        ? `${room.serviceUrl}/course/view.php?id=${room.containerCourseId}`
        : null,
    });
  }

  return NextResponse.json(data);
}
