import { exec } from 'child_process';
import util from 'util';
import { initDatabase } from '../sql/moodle';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';

const execPromise = util.promisify(exec);

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION;
const IMAGE_URI = process.env.IMAGE_URI;
const SERVICE_ACCOUNT = process.env.SERVICE_ACCOUNT;
const DB_HOST = process.env.PUB_GCSQL_HOST;
const DB_USER = process.env.PUB_GCSQL_USER;
const DB_PASS = process.env.PUB_GCSQL_PASS;
const MAIN_TOKEN = process.env.MOODLE_CLOUDSUPPORT_TOKEN;

export async function deployCloudRun(quizId, serviceName, dbName, bucketName) {
  try {
    const quizData = ExamRoomModel.findOne({ containerName: serviceName });
    if (quizData && quizData.serviceUrl) {
      console.log(`@@@ Service ${serviceName} already deployed.`);
      return { serviceUrl: quizData.serviceUrl };
    }

    // B1: Tạo database
    console.log(`Create database: "${dbName}"...`);
    await initDatabase(quizId, dbName);
    console.log(`✅ Database "${dbName}" created successfully`);

    // B2: Tạo bucket trên GCS
    console.log(`🪣 Creating GCS bucket: ${bucketName}...`);
    await execPromise(`gcloud storage buckets create ${bucketName} --location=${REGION}`);
    console.log(`✅ Bucket ${bucketName} created successfully.`);

    // B3: Triển khai Cloud Run
    console.log(`🚀 Deploying service: ${serviceName}...`);
    const { stdout } = await execPromise(`
      gcloud run deploy ${serviceName} \
      --service-account ${SERVICE_ACCOUNT} \
      --image ${IMAGE_URI} \
      --region ${REGION} \
      --project ${PROJECT_ID} \
      --allow-unauthenticated \
      --set-env-vars DB_HOST=${DB_HOST},DB_NAME=${dbName},DB_USER=${DB_USER},DB_PASS=${DB_PASS},GCS_BUCKET=${bucketName},MAIN_TOKEN=${MAIN_TOKEN}
    `);
    console.log('✅ Service deployment output:', stdout);

    // B4: Lấy URL dịch vụ
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
