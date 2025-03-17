import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION;
const IMAGE_URI = process.env.IMAGE_URI;
const BUCKET_NAME = process.env.BUCKET_NAME;

export async function deployCloudRun(uniqueId, dbName, folderName) {
  try {
    const serviceName = `elearningsystem-${uniqueId}`;

    // Tạo thư mục trên GCS
    console.log(`📂 Creating GCS folder: ${folderName}...`);
    await execPromise(`gsutil cp /dev/null gs://${BUCKET_NAME}/${folderName}`);
    console.log(`✅ Folder ${folderName} created in bucket ${BUCKET_NAME}`);

    // Triển khai Cloud Run
    console.log(`🚀 Deploying service: ${serviceName}...`);
    const { stdout } = await execPromise(`
      gcloud run deploy ${serviceName} \
      --service-account exam-study-447514@appspot.gserviceaccount.com \
      --image ${IMAGE_URI} \
      --region ${REGION} \
      --project ${PROJECT_ID} \
      --allow-unauthenticated \
      --set-env-vars DB_NAME=${dbName},GCS_BUCKET=${BUCKET_NAME},GCS_FOLDER=${folderName}
    `);
    console.log("✅ Service deployment output:", stdout);

    // Lấy URL dịch vụ
    console.log(`🌍 Fetching service URL for ${serviceName}...`);
    const { stdout: serviceUrlOutput } = await execPromise(`
      gcloud run services describe ${serviceName} \
      --region ${REGION} \
      --format 'value(status.url)'
    `);

    const serviceUrl = serviceUrlOutput.trim();
    if (!serviceUrl) {
      throw new Error("❌ Failed to retrieve service URL.");
    }

    console.log("✅ Service deployed at:", serviceUrl);
    return { serviceUrl };
  } catch (error) {
    console.error("❌ Error deploying Cloud Run:", error);
    throw new Error(error.message || "Failed to deploy Cloud Run service");
  }
}
