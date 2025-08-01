import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db/connect';
import { ExamRoomModel } from '@/lib/db/models';
import { EXAMROOM_ACTIONS } from '@/lib/tools/constants/actions';
import {
  createGCRJob,
  deleteGCRJob,
  stopGCRJob,
  fixErrorJob,
} from '@/lib/moodle/jobs';
import { authOptions } from '@/lib/auth/options';
import { STATUS_CODE, canActions } from '@/lib/moodle/state/status';
import { updateSchedule } from '@/lib/tools/schedule';

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

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
          if (!canActions(nroom.status)) continue;

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
          if (!canActions(nroom.status)) continue;

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
          if (!canActions(nroom.status)) continue;

          if (nroom.serviceUrl) {
            await deleteGCRJob(nroom.containerName);
          } else {
            await deleteGCRJob(nroom.containerName, { saveData: false });
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
          if (!canActions(nroom.status)) continue;

          await deleteGCRJob(nroom.containerName, { saveData: false });
        } catch (err) {
          console.error(`[ADMIN_ACTION]@@ ${err.message}`);
        }
      }
      break;
    case EXAMROOM_ACTIONS.FIX_CTN:
      for (const room of rooms) {
        // try fix
        try {
          const nroom = await ExamRoomModel.findById(room.id);

          await fixErrorJob(nroom.containerName);
        } catch (err) {
          console.error(`[ADMIN_ACTION]@@ ${err.message}`);
        }
      }
      break;
    case EXAMROOM_ACTIONS.RE_SCHEDULE:
      for (const room of rooms) {
        // reset schedule
        try {
          const nroom = await ExamRoomModel.findById(room.id);
          if (nroom.serviceUrl) continue;
          if (!canActions(nroom.status)) continue;

          nroom.status = STATUS_CODE.REGISTERED;
          await nroom.save();
          await updateSchedule(nroom.containerName);
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
