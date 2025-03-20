import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { getQuizById } from '@/lib/moodle/get-quiz';
import {
  DELETE_DATA,
  START_CTN,
  STOP_CTN,
  UPDATE_DATA,
} from '@/lib/tools/constants/exam-room';
import { deployCloudRun } from '@/lib/cloud/run/deploy-moodle';
import { deleteCloudRun } from '@/lib/cloud/run/delete-moodle';

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
      courseName: quizData.coursename,
      courseId: quizData.courseid,
      serviceUrl: room.serviceUrl
        ? `${room.serviceUrl}/mod/quiz/view.php?q=${room.quizId}`
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

  await connect();

  switch (action) {
    case START_CTN:
      for (const room of rooms) {
        // start container
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (!nroom.serviceUrl) {
            const { serviceUrl } = await deployCloudRun(
              nroom.containerName,
              nroom.dbName,
              nroom.folderName
            );
            nroom.serviceUrl = serviceUrl;
            await nroom.save();
          }
        } catch (err) {
          console.error(`�� ${err.message}`);
        }
      }
      break;
    case STOP_CTN:
      for (const room of rooms) {
        // delete container
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (nroom.serviceUrl) {
            // delete cloud run
            const { success, message } = await deleteCloudRun(
              nroom.containerName
            );
            if (success) {
              console.log(`�� ${message}`);
              nroom.serviceUrl = null;
              await nroom.save();
            } else {
              console.error(`�� ${message}`);
            }
          }
        } catch (err) {
          console.error(`�� ${err.message}`);
        }
      }
      break;
    case UPDATE_DATA:
      for (const room of rooms) {
        // update data
      }
      break;
    case DELETE_DATA:
      for (const room of rooms) {
        // delete data
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (nroom.serviceUrl) {
            // delete cloud run
            const { success, message } = await deleteCloudRun(
              nroom.containerName
            );
            if (success) {
              console.log(`�� ${message}`);
            } else {
              console.error(`�� ${message}`);
            }
          }

          await ExamRoomModel.deleteOne({ _id: nroom._id });
          console.log('Delete exam-room on db successfully');
        } catch (err) {
          console.error(`�� ${err.message}`);
        }
      }
      break;
    default:
      return NextResponse.json(
        { error: 'Hành đ��ng không h��p lệ' },
        { status: 400 }
      );
  }

  return NextResponse.json({ message: 'Xử lý thành công' }, { status: 200 });
}
