import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import path from 'path';

/**
 * Lấy thư mục gốc của project
 */
const projectRoot = path.resolve();

/**
 * Downloads a backup file from a given Moodle URL and saves it locally.
 *
 * @async
 * @function downloadFile
 * @param {Object} data - Backup metadata object, must contain `url` and `filename`.
 * @param {string} data.url - Direct URL to download the backup file from Moodle.
 * @param {string} data.filename - Name of the file to be saved.
 * @param {Object} options
 * @param {string} [options.saveFolder='stemp'] - Relative path to the folder where the file will be saved.
 * @param {string} [options.serviceUrl=''] - Service Url of container
 * @returns {Promise<{
 *   success: boolean,
 *   path?: string,
 *   error?: string,
 *   details?: any
 * }>} - Result indicating success or failure, with saved path or error details.
 *
 * @example
 * const result = await downloadFile({
 *   url: 'https://moodle.example.com/backup/xyz.mbz',
 *   filename: 'CT123-20250611-203546.mbz'
 * }, 'downloads');
 *
 * if (result.success) {
 *   console.log('📦 File saved at:', result.path);
 * } else {
 *   console.error('❌ Download failed:', result.error, result.details);
 * }
 */
export async function downloadFile(
  data,
  { saveFolder = 'stemp', serviceUrl = '' } = {}
) {
  try {
    const resolvedSavePath = path.resolve(projectRoot, saveFolder);

    // Ensure save folder exists
    await fs.mkdir(resolvedSavePath, { recursive: true });

    // Check localhost
    const urlDownload = data.url.replace('https://localhost', serviceUrl);

    // Download file from URL
    const fileRes = await fetch(urlDownload);

    if (!fileRes.ok || !fileRes.body) {
      console.error('❌ Error downloading file:', fileRes.status);
      return {
        success: false,
        error: 'Failed to download file from Moodle',
        status: fileRes.status,
      };
    }

    const backupFilename = data.filename;

    if (!backupFilename) {
      throw new Error('Filename could not be determined from data.');
    }

    const savePath = path.join(resolvedSavePath, backupFilename);

    const fileHandle = await fs.open(savePath, 'w');
    const writable = fileHandle.createWriteStream();

    await pipeline(fileRes.body, writable);
    await fileHandle.close();

    return { success: true, path: savePath };
  } catch (error) {
    console.error('Download file error:', error);
    return {
      success: false,
      error: 'Failed to download file',
      details: error.message,
    };
  }
}

/**
 * Uploads a Moodle backup file (.mbz) to a Moodle server via web service.
 *
 * This function reads a `.mbz` backup file from the local filesystem, encodes it in base64,
 * and uploads it to the configured Moodle server using a custom web service function:
 * `local_cloudsupport_upload_backup_file`.
 *
 * @async
 * @function uploadFile
 * @param {string} fileName - The name of the `.mbz` file to upload (must exist inside the `saveFolder` directory).
 * @param {Object} [options] - Optional configuration for the upload.
 * @param {string} [options.saveFolder='stemp'] - Folder relative to the current module where the `.mbz` file is stored.
 * @param {string} [options.baseUrl=process.env.MOODLE_URL] - Base URL of the Moodle instance.
 * @param {string} [options.token=process.env.MOODLE_CLOUDSUPPORT_TOKEN] - Web service token for Moodle API authentication.
 * @returns {Promise<{
 *   success: boolean,
 *   data?: any,
 *   error?: string,
 *   details?: any
 * }>} - Resolves to an object indicating success or failure, with result data or error details.
 *
 * @example
 * const result = await uploadFile('CT123-20250611-203546.mbz', {
 *   baseUrl: 'https://moodle.example.com',
 *   token: 'your_moodle_token',
 *   saveFolder: 'backups'
 * });
 *
 * if (result.success) {
 *   console.log('Upload successful:', result.data);
 * } else {
 *   console.error('Upload failed:', result.error, result.details);
 * }
 */
export async function uploadFile(
  fileName,
  {
    saveFolder = 'stemp',
    baseUrl = process.env.MOODLE_URL,
    token = process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  } = {}
) {
  try {
    const resolvedSavePath = path.resolve(projectRoot, saveFolder);
    const filepath = path.join(resolvedSavePath, fileName);

    if (!filepath) {
      throw new Error('Invalid file.');
    }

    const moodleToken = token;
    const moodleBaseUrl = baseUrl;
    const apiUrl = `${moodleBaseUrl}/webservice/rest/server.php`;

    const fileBuffer = await fs.readFile(filepath);
    const fileBase64 = fileBuffer.toString('base64');
    const filename = path.basename(filepath);

    const params = new URLSearchParams({
      wstoken: moodleToken,
      wsfunction: 'local_cloudsupport_upload_backup_file',
      moodlewsrestformat: 'json',
      filename,
      filecontent: fileBase64,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(response);
      console.error('@@@Token: ' + token);
      try {
        const errorData = JSON.parse(errorText);
        return {
          success: false,
          error: 'Moodle API error',
          details: errorData,
        };
      } catch (e) {
        return {
          success: false,
          error: 'Moodle API error',
          details: errorText,
        };
      }
    }

    const data = await response.json();

    if (data.exception) {
      return { success: false, error: 'Upload failed', details: data.message };
    }

    console.log('Upload successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Upload file error:', error);
    return {
      success: false,
      error: 'Failed to upload file',
      details: error.message,
    };
  }
}

/**
 * Deletes a file from the local filesystem after successful upload.
 *
 * @async
 * @function clearFile
 * @param {string} fileName - The name of the file to delete (relative to `stemp` folder).
 * @param {string} [saveFolder='stemp'] - Optional folder path where the file is located.
 * @returns {Promise<void>}
 *
 * @example
 * await clearFile('CT123-20250611-203546.mbz');
 */
export async function clearFile(fileName, saveFolder = 'stemp') {
  try {
    const resolvedSavePath = path.resolve(projectRoot, saveFolder);
    const filePath = path.join(resolvedSavePath, fileName);

    await fs.unlink(filePath);
    console.log(`🧹 File deleted: ${fileName}`);
  } catch (error) {
    console.warn(`⚠️ Could not delete file "${fileName}": ${error.message}`);
  }
}
