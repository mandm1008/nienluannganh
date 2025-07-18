import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { getQuizById } from '@/lib/moodle/get-quiz';
import { EXAMROOM_ACTIONS } from '@/lib/tools/constants/actions';
import { deployCloudRun, deleteCloudRun } from '@/lib/cloud/run/controls';
import { createGCRJob, deleteGCRJob, stopGCRJob } from '@/lib/moodle/jobs';

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

export async function POST(req) {
  const { action, rooms } = await req.json();

  if (!action || !rooms) {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 });
  }

  console.log('@POST /api/exam-rooms -- ' + action + ': ', rooms);

  await connectDB();

  switch (action) {
    case EXAMROOM_ACTIONS.START_CTN:
      for (const room of rooms) {
        // start container
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (!nroom.serviceUrl) {
            await createGCRJob(nroom.containerName);
          }
        } catch (err) {
          console.error(`[ADMIN_ACTION]@@ ${err.message}`);
        }
      }
      break;
    case EXAMROOM_ACTIONS.STOP_CTN:
      for (const room of rooms) {
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (nroom.serviceUrl) {
            await stopGCRJob(nroom.containerName);
          }
        } catch (err) {
          console.error(`[ADMIN_ACTION]@@ ${err.message}`);
        }
      }
      break;
    case EXAMROOM_ACTIONS.UPDATE_DATA:
      for (const room of rooms) {
        // update data
      }
      break;
    case EXAMROOM_ACTIONS.DELETE_SAVE_DATA:
      for (const room of rooms) {
        // delete and save data
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (nroom.serviceUrl) {
            await deleteGCRJob(nroom.containerName);
          }
        } catch (err) {
          console.error(`[ADMIN_ACTION]@@ ${err.message}`);
        }
      }
      break;
    case EXAMROOM_ACTIONS.DELETE_DATA:
      for (const room of rooms) {
        // delete data
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (nroom.serviceUrl) {
            await deleteGCRJob(nroom.containerName, { saveData: false });
          }
        } catch (err) {
          console.error(`[ADMIN_ACTION]@@ ${err.message}`);
        }
      }
      break;
    default:
      return NextResponse.json(
        { error: 'Hành động không hợp lệ!' },
        { status: 400 }
      );
  }

  return NextResponse.json({ message: 'Xử lý thành công!' }, { status: 200 });
}
