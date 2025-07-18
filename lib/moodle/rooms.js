// lib/rooms/createRoomFromQuiz.js

import { getQuizById } from '@/lib/moodle/get-quiz';
import { connectDB } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { updateSchedule } from '@/lib/tools/schedule';

export async function createRoomFromQuiz(quizId) {
  try {
    const now = new Date();
    const uniqueId =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const dbName = `moodle_${uniqueId}`;
    const folderName = `moodledata-${uniqueId}`;
    const serviceName = `elearningsystem-${uniqueId}`;

    // Kiểm tra ID quiz hợp lệ
    const quizData = await getQuizById(quizId);
    if (!quizData) {
      return {
        ok: false,
        status: 400,
        message: 'Invalid quiz ID',
      };
    }

    // Check time quiz
    const OFFSETCLOSETIME = process.env.MOODLE_OFFSET_CLOSETIME;
    const offsetTime = OFFSETCLOSETIME ? parseInt(OFFSETCLOSETIME) : 10; // default: 10'
    const { timeopen, timeclose } = quizData;
    const nowTimestamp = now.getTime();
    const pastThreshold = nowTimestamp - offsetTime * 60 * 1000;

    if (
      typeof timeopen === 'number' &&
      typeof timeclose === 'number' &&
      timeopen * 1000 < pastThreshold &&
      timeclose * 1000 < pastThreshold
    ) {
      return {
        ok: false,
        status: 400,
        message: 'Quiz đã kết thúc quá lâu, không tạo room',
      };
    }

    await connectDB();

    // Check quiz in db
    const existingRoom = await ExamRoomModel.findOne({ quizId });
    if (existingRoom) {
      await updateSchedule(existingRoom.containerName);
      return {
        ok: true,
        status: 200,
        message: 'Update quiz time successfully',
        quizData,
      };
    }

    // Tạo room mới
    const examRoomInstance = new ExamRoomModel({
      quizId,
      containerName: serviceName,
      dbName,
      folderName,
    });
    await examRoomInstance.save();

    await updateSchedule(serviceName);

    return {
      ok: true,
      status: 200,
      message: 'Service create successfully!',
      quizData,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: error.message || 'Failed to create service',
    };
  }
}
