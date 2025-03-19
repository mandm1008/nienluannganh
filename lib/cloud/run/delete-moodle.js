import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION;

export async function deleteCloudRun(containerName) {
  try {
    // Xóa dịch vụ Cloud Run
    console.log(`🗑️ Deleting Cloud Run service: ${containerName}...`);
    await execPromise(
      `gcloud run services delete ${containerName} --region ${REGION} --project ${PROJECT_ID} --quiet`
    );
    console.log(`✅ Cloud Run service ${containerName} deleted.`);

    return {
      success: true,
      message: `Cloud Run service and GCS folder deleted.`,
    };
  } catch (error) {
    console.error('❌ Error deleting Cloud Run service:', error);
  }
}
