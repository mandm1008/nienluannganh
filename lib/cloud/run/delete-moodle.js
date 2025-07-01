import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION;

/**
 * Deletes a Cloud Run service using the gcloud CLI.
 *
 * @param {string} containerName - The name of the Cloud Run service to delete.
 * @returns {Promise<{ success: boolean, message: string }>} - The result of the deletion operation.
 *
 * @example
 * const result = await deleteCloudRun('my-cloudrun-service');
 * if (result.success) {
 *   console.log(result.message);
 * } else {
 *   console.error(result.message);
 * }
 */
export async function deleteCloudRun(containerName) {
  try {
    if (!PROJECT_ID || !REGION) {
      throw new Error('Missing PROJECT_ID or REGION in environment variables.');
    }
    console.log(`🗑️ Deleting Cloud Run service: ${containerName}...`);

    await execPromise(
      `gcloud run services delete ${containerName} --region ${REGION} --project ${PROJECT_ID} --quiet`
    );

    console.log(`✅ Cloud Run service ${containerName} deleted. GCS save!!!`);

    return {
      success: true,
      message: `Cloud Run service "${containerName}" deleted successfully.`,
    };
  } catch (error) {
    console.error('❌ Error deleting Cloud Run service:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}
