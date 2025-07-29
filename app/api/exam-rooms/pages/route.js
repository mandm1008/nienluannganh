import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { getQuizById } from '@/lib/moodle/get-quiz';
import { canActions } from '@/lib/moodle/status';
import slugify from 'slugify';
import { includesOf } from '@/lib/tools/slug';

function normalize(text) {
  return slugify(text || '', {
    replacement: '',
    lower: true,
    strict: true,
    locale: 'vi',
  });
}

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
  const statusParams = searchParams.get('status') || '';
  const statusFilters = statusParams
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((s) => !isNaN(s)); // valid int only

  const allRooms = await ExamRoomModel.find();
  const results = [];

  for (const room of allRooms) {
    const quizData = await getQuizById(room.quizId);
    if (!quizData) continue;

    const record = {
      ...room.toObject(),
      timeOpen: quizData.timeopen,
      timeClose: quizData.timeclose,
      timeLimit: quizData.timelimit,
      quizName: quizData.name,
      courseName: quizData.coursename,
      courseShortName: quizData.courseshortname,
      courseId: quizData.courseid,
      serviceUrl: room.serviceUrl
        ? `${room.serviceUrl}/course/view.php?id=${room.containerCourseId}`
        : null,
      canActions: !!room.error || canActions(room.status),
    };

    results.push(record);
  }

  let filtered = results;

  if (search) {
    filtered = results.filter((item) => {
      return (
        includesOf(item.quizName, search) ||
        includesOf(item.courseName, search) ||
        includesOf(item.courseShortName, search) ||
        includesOf(item.containerName, search)
      );
    });
  }

  if (statusFilters.length > 0) {
    filtered = filtered.filter((item) => statusFilters.includes(item.status));
  }

  filtered.sort((a, b) => {
    const aTime = a.timeOpen || 0;
    const bTime = b.timeOpen || 0;
    return sort === 'asc' ? aTime - bTime : bTime - aTime;
  });

  const total = filtered.length;
  const pagedData = filtered.slice(skip, skip + limit);

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data: pagedData,
  });
}
