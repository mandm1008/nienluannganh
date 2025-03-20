import { NextResponse } from 'next/server';
import { getQuizById } from '@/lib/moodle/get-quiz';
import { connect } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { updateSchedule } from '@/lib/tools/schedule';

export async function GET(req) {
  try {
    const { searchParams } = req.nextUrl;
    const quizId = parseInt(searchParams.get('id'), 10);
    const uniqueId = Date.now();
    const dbName = `moodle${uniqueId}`;
    const folderName = `moodledata-${uniqueId}/`;
    const serviceName = `elearningsystem-${uniqueId}`;

    // Kiểm tra ID quiz hợp lệ
    const quizData = await getQuizById(quizId);
    if (!quizData) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }

    await connect();
    // Check quiz in db
    const room = await ExamRoomModel.findOne({ quizId });
    if (room) {
      updateSchedule(room.containerName);

      return NextResponse.json({
        message: 'Update quiz time successfully',
        quizData,
      });
    }

    // Bước 1: Lưu vào db
    const examRoomInstance = new ExamRoomModel({
      quizId,
      containerName: serviceName,
      dbName,
      folderName,
    });
    await examRoomInstance.save();
    console.log('Save data to database successfully!');

    // Bước 2: Đặt lịch
    await updateSchedule(serviceName);

    return NextResponse.json({
      message: 'Service create successfully!',
      quizData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}
