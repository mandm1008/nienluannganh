import { exec } from 'child_process';
import util from 'util';
import { initDatabase } from '@/lib/cloud/sql/moodle';
import { createBucket } from '@/lib/cloud/storage/controls';
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
const ADMIN_USER = process.env.MOODLE_ADMIN_USER;
const ADMIN_PASS = process.env.MOODLE_ADMIN_PASS;
const ADMIN_EMAIL = process.env.MOODLE_ADMIN_EMAIL;
const MEMORY = process.env.MOODLE_CONTAINER_MEMORY;
const CPU = process.env.MOODLE_CONTAINER_CPU;
const CONCURRENCY = process.env.MOODLE_CONTAINER_CONCURRENCY;

/**
 * Deploys a Cloud Run service for a quiz.
 *
 * This function:
 * 1. Checks if the service already exists in the database.
 * 2. Creates a SQL database.
 * 3. Creates a GCS bucket.
 * 4. Deploys the Cloud Run service.
 * 5. Retrieves the deployed service URL.
 *
 * @async
 * @function deployCloudRun
 * @param {string} quizId - The quiz ID for tracking.
 * @param {string} serviceName - Name for the Cloud Run service.
 * @param {string} dbName - Name of the new database to create.
 * @param {string} bucketName - Name of the GCS bucket to create.
 * @returns {Promise<{ success: boolean, serviceUrl?: string, error?: string }>} Deployment result.
 *
 * @example
 * const result = await deployCloudRun('quiz001', 'quiz-service', 'quiz_db', 'quiz-bucket');
 * if (result.success) console.log(result.serviceUrl);
 * else console.error(result.error);
 */
export async function deployCloudRun(quizId, serviceName, dbName, bucketName) {
  // 1. Validate required environment variables
  if (
    !PROJECT_ID ||
    !REGION ||
    !IMAGE_URI ||
    !SERVICE_ACCOUNT ||
    !DB_HOST ||
    !DB_USER ||
    !DB_PASS ||
    !MAIN_TOKEN ||
    !ADMIN_USER ||
    !ADMIN_PASS ||
    !ADMIN_EMAIL
  ) {
    return {
      success: false,
      error: 'Missing required environment variables.',
    };
  }

  try {
    // 2. Check if service already exists
    const quizData = await ExamRoomModel.findOne({
      containerName: serviceName,
    });
    if (quizData && quizData.serviceUrl) {
      console.log(`@@@ Service ${serviceName} already deployed.`);
      return { success: true, serviceUrl: quizData.serviceUrl };
    }

    // 3. Create database
    console.log(`🛠️  Creating database: "${dbName}"...`);
    await initDatabase(dbName);
    console.log(`✅ Database "${dbName}" created.`);

    // 4. Create GCS bucket
    await createBucket(bucketName, REGION);

    // 5. Deploy Cloud Run service
    console.log(`🚀 Deploying Cloud Run service: "${serviceName}"...`);
    const { stdout: deployOutput } = await execPromise(`
      gcloud run deploy ${serviceName} \
      --service-account=${SERVICE_ACCOUNT} \
      --image=${IMAGE_URI} \
      --timeout=900s \
      --region=${REGION} \
      --project=${PROJECT_ID} \
      --min=1 \
      --min-instances=1 \
      --max-instances=5 \
      --execution-environment=gen2 \
      --no-cpu-throttling \
      --memory=${MEMORY || '4Gi'} \
      --cpu=${CPU || '1'} \
      --cpu-boost \
      --concurrency=${CONCURRENCY || '30'} \
      --allow-unauthenticated \
      --set-env-vars ADMIN_USER=${ADMIN_USER},ADMIN_PASS=${ADMIN_PASS},ADMIN_EMAIL=${ADMIN_EMAIL},DB_HOST=${DB_HOST},DB_NAME=${dbName},DB_USER=${DB_USER},DB_PASS=${DB_PASS},GCS_BUCKET=${bucketName},MAIN_TOKEN=${MAIN_TOKEN}
    `);
    console.log(`✅ Deployment output: ${deployOutput}`);

    // 6. Fetch service URL
    console.log(`🌍 Retrieving service URL...`);
    const { stdout: serviceUrlOutput } = await execPromise(`
      gcloud run services describe ${serviceName} \
      --region ${REGION} \
      --format 'value(status.url)'
    `);
    const serviceUrl = serviceUrlOutput.trim();

    if (!serviceUrl) {
      return {
        success: false,
        error: 'Failed to retrieve Cloud Run service URL.',
      };
    }
    console.log(`✅ Service deployed at: ${serviceUrl}`);

    return { success: true, serviceUrl };
  } catch (error) {
    console.error('❌ Deployment error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during deployment.',
    };
  }
}
