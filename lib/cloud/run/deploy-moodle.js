import { exec } from 'child_process';
import util from 'util';
import { initDatabase } from '../sql/moodle';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';

const execPromise = util.promisify(exec);

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION;
const IMAGE_URI = process.env.IMAGE_URI;
const BUCKET_NAME = process.env.BUCKET_NAME;

const GCP_DB_HOST = process.env.PUB_GCSQL_HOST;

export async function deployCloudRun(quizId, serviceName, dbName, folderName) {
  try {
    const quizData = ExamRoomModel.findOne({ containerName: serviceName });
    if (quizData && quizData.serviceUrl) {
      console.log(`@@@ Service ${serviceName} already deployed.`);
      return { serviceUrl: quizData.serviceUrl };
    }
    // Tạo database
    await initDatabase(quizId, dbName);
    console.log(`�� Database "${dbName}" created successfully`);

    // Tạo thư mục trên GCS
    // console.log(`🪣 Creating GCS bucket: ${folderName}...`);
    // await execPromise(`gsutil mb -l asia-southeast1 gs://${folderName}`);
    // console.log(`✅ Bucket ${folderName} created successfully.`);

    // Triển khai Cloud Run
    console.log(`🚀 Deploying service: ${serviceName}...`);
    const { stdout } = await execPromise(`
      gcloud run deploy ${serviceName} \
      --service-account exam-study-447514@appspot.gserviceaccount.com \
      --image ${IMAGE_URI} \
      --region ${REGION} \
      --project ${PROJECT_ID} \
      --allow-unauthenticated \
      --set-env-vars DB_NAME=${dbName},DB_HOST=${GCP_DB_HOST},GCS_BUCKET=${BUCKET_NAME},GCS_FOLDER=${folderName}
    `);
    console.log('✅ Service deployment output:', stdout);

    // Lấy URL dịch vụ
    console.log(`🌍 Fetching service URL for ${serviceName}...`);
    const { stdout: serviceUrlOutput } = await execPromise(`
      gcloud run services describe ${serviceName} \
      --region ${REGION} \
      --format 'value(status.url)'
    `);

    const serviceUrl = serviceUrlOutput.trim();
    if (!serviceUrl) {
      throw new Error('❌ Failed to retrieve service URL.');
    }

    console.log('✅ Service deployed at:', serviceUrl);
    return { serviceUrl };
  } catch (error) {
    console.log(error);
  }
}
