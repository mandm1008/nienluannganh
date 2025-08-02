import pLimit from 'p-limit';
import { connectDB } from '@/lib/db/connect';
import { ExamRoomModel } from '@/lib/db/models';
import { EXAMROOM_ACTIONS } from '@/lib/moodle/actions/name';
import {
  createGCRJob,
  deleteGCRJob,
  stopGCRJob,
  fixErrorJob,
} from '@/lib/moodle/jobs';
import { STATUS_CODE, canActions } from '@/lib/moodle/state/status';
import { updateSchedule } from '@/lib/tools/schedule';

export async function handleActions(action, rooms) {
  const validActions = new Set(Object.values(EXAMROOM_ACTIONS));

  if (!validActions.has(action)) {
    return { error: 'Hành động không hợp lệ!', status: 400 };
  }

  await connectDB();

  const limit = pLimit(3);

  const tasks = rooms.map((room) =>
    limit(async () => {
      try {
        const nroom = await ExamRoomModel.findById(room.id);
        if (!nroom) return;

        switch (action) {
          case EXAMROOM_ACTIONS.START_CTN:
            if (!canActions(nroom.status)) return;
            if (!nroom.serviceUrl) {
              await createGCRJob(nroom.containerName);
            }
            break;

          case EXAMROOM_ACTIONS.STOP_CTN:
            if (!nroom.error && !canActions(nroom.status)) return;
            await stopGCRJob(nroom.containerName);
            break;

          case EXAMROOM_ACTIONS.UPDATE_DATA:
            // update data logic here
            break;

          case EXAMROOM_ACTIONS.DELETE_SAVE_DATA:
            if (!canActions(nroom.status)) return;
            if (nroom.serviceUrl) {
              await deleteGCRJob(nroom.containerName);
            } else {
              await deleteGCRJob(nroom.containerName, { saveData: false });
            }
            break;

          case EXAMROOM_ACTIONS.DELETE_DATA:
            if (!canActions(nroom.status)) return;
            await deleteGCRJob(nroom.containerName, { saveData: false });
            break;

          case EXAMROOM_ACTIONS.FIX_CTN:
            await fixErrorJob(nroom.containerName);
            break;

          case EXAMROOM_ACTIONS.RE_SCHEDULE:
            if (nroom.serviceUrl) return;
            if (!canActions(nroom.status)) return;

            nroom.status = STATUS_CODE.REGISTERED;
            await nroom.save();
            await updateSchedule(nroom.containerName);
            break;

          default:
            // Bỏ qua nếu không đúng action
            break;
        }
      } catch (err) {
        console.error(`[ADMIN_ACTION]@@ ${err.message}`);
      }
    })
  );

  await Promise.all(tasks);

  return { message: 'Xử lý thành công!', status: 200 };
}
