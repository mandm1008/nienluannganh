import { NextResponse } from 'next/server';
import { createDatabase } from '@/lib/cloud/sql/create-database';
import { deployCloudRun } from '@/lib/cloud/run/deploy-moodle';
import { getQuizById } from '@/lib/moodle-sql/get-quiz';
import { connect } from '@/lib/db/connect';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';

export async function GET(req) {
  try {
    const { searchParams } = req.nextUrl;
    const quizId = searchParams.get('id');
    const uniqueId = Date.now();
    const dbName = `moodle${uniqueId}`;
    const folderName = `moodledata-${uniqueId}/`;

    // Kiểm tra ID quiz hợp lệ
    const quizData = await getQuizById(quizId);
    if (!quizData) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }

    // Bước 1: Tạo Database
    await createDatabase(dbName);
    console.log('✅ Database created:', dbName);

    // Bước 2: Triển khai Cloud Run
    const { serviceUrl, serviceName } = await deployCloudRun(
      uniqueId,
      dbName,
      folderName
    );

    // Bước 3: Lưu vào db
    await connect();
    const examRoomInstance = new ExamRoomModel({
      quizId,
      containerName: serviceName,
      dbName,
      folderName,
      serviceUrl,
      timeOpen: quizData.timeopen,
      timeClose: quizData.timeclose,
    });

    await examRoomInstance.save();
    console.log('Save data to database successfully!');

    return NextResponse.json({
      message: 'Service deployed successfully!',
      serviceUrl,
      quizData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to deploy service' },
      { status: 500 }
    );
  }
}
