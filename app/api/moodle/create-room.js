import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import { createDatabase } from "@/lib/cloud/sql/create-database";

const execPromise = util.promisify(exec);

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION;
const IMAGE_URI = process.env.IMAGE_URI;
const BUCKET_NAME = process.env.BUCKET_NAME;

export async function POST() {
  try {
    const uniqueId = Date.now();
    const serviceName = `elearningsystem-${uniqueId}`;
    const dbName = `moodle${uniqueId}`;
    const folderName = `moodledata-${uniqueId}/`;

    // Step 1: Create Database
    await createDatabase(dbName);
    console.log("✅ Database created:", dbName);

    // Step 2: Create GCS Folder
    console.log(`📂 Creating GCS folder: ${folderName}...`);
    await execPromise(`gsutil cp /dev/null gs://${BUCKET_NAME}/${folderName}`);
    console.log(`✅ Folder ${folderName} created in bucket ${BUCKET_NAME}`);

    // Step 3: Deploy Cloud Run Service
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

    // Step 4: Fetch Service URL
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

    return NextResponse.json({
      message: "Service deployed successfully!",
      serviceUrl,
    });
  } catch (error) {
    console.error("❌ Error deploying service:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deploy service" },
      { status: 500 }
    );
  }
}
