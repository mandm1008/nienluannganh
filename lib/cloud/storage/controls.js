import { promisify } from 'util';
import { exec as execCb } from 'child_process';

const exec = promisify(execCb);

/**
 * Execute a shell command and return stdout. If it fails, throw an error.
 * @param {string} command
 * @returns {Promise<string>}
 */
async function execPromise(command) {
  const { stdout, stderr } = await exec(command);
  if (stderr) console.error(stderr);
  return stdout;
}

/**
 * Check if a GCS bucket exists.
 * @param {string} bucketName
 * @returns {Promise<boolean>}
 */
async function bucketExists(bucketName) {
  try {
    await execPromise(`gcloud storage buckets describe gs://${bucketName}`);
    return true;
  } catch (err) {
    if (err.stderr && err.stderr.includes('not found')) {
      return false;
    }
    throw err;
  }
}

/**
 * Create a GCS bucket if it doesn't already exist,
 * and set access control to fine-grained.
 * @param {string} bucketName
 * @param {string} region
 */
export async function createBucket(bucketName, region) {
  if (await bucketExists(bucketName)) {
    console.log(
      `⚠️  Bucket "${bucketName}" already exists. Skipping creation.`
    );
  } else {
    console.log(`🪣  Creating GCS bucket: "${bucketName}"...`);
    await execPromise(
      `gcloud storage buckets create gs://${bucketName} --location=${region}`
    );
    console.log(`✅ Bucket "${bucketName}" created.`);
  }

  // 🔧 Ensure bucket uses fine-grained access control
  console.log(`🔐 Switching "${bucketName}" to fine-grained access control...`);
  await execPromise(
    `gsutil uniformbucketlevelaccess set off gs://${bucketName}`
  );
  console.log(
    `✅ Bucket "${bucketName}" is now using fine-grained access control.`
  );
}

/**
 * Delete a GCS bucket if it exists.
 * @param {string} bucketName
 */
export async function deleteBucket(bucketName) {
  if (await bucketExists(bucketName)) {
    console.log(`🗑️  Deleting bucket "${bucketName}"...`);
    try {
      await execPromise(`gsutil -m rm -r gs://${bucketName}`);
      console.log(`✅ Bucket "${bucketName}" deleted.`);
    } catch (err) {
      console.error(`❌ Failed to delete bucket "${bucketName}":`, err.message);
      throw err;
    }
  } else {
    console.log(
      `⚠️  Bucket "${bucketName}" does not exist. Skipping deletion.`
    );
  }
}
