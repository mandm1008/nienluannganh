import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { ExamRoomModel } from '@/lib/db/models';
import { getQuizById, getQuizIdsByUsername } from '@/lib/moodle/db/control';
import { canActions } from '@/lib/moodle/state/status';
import { normalizeServiceUrl } from '@/lib/moodle/rooms';

export async function GET(req) {
  await connectDB();

  const url = new URL(req.url);
  const username = url.searchParams.get('username');

  let allowedQuizIds = null;

  if (username) {
    try {
      // Retrieve all accessible quiz IDs for the user
      allowedQuizIds = await getQuizIdsByUsername(username);
    } catch (err) {
      console.error('❌ Failed to get quiz IDs for username:', err);
      return NextResponse.json([]);
    }
  }

  const rooms = await ExamRoomModel.find();
  const data = [];

  for (const room of rooms) {
    // If filtering by username, skip room not in user's quiz list
    if (allowedQuizIds && !allowedQuizIds.includes(room.quizId)) {
      continue;
    }

    const quizData = await getQuizById(room.quizId);
    if (!quizData) continue;

    data.push({
      ...room.toObject(),
      timeOpen: quizData.timeopen,
      timeClose: quizData.timeclose,
      timeLimit: quizData.timelimit,
      quizName: quizData.name,
      courseName: quizData.coursename,
      courseShortName: quizData.courseshortname,
      courseId: quizData.courseid,
      serviceUrl: normalizeServiceUrl(room.serviceUrl, room.containerCourseId),
      canActions: !!room.error || canActions(room.status),
    });
  }

  return NextResponse.json(data);
}
