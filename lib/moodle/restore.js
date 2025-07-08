import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Restores a Moodle course from a previously uploaded backup file (.mbz)
 * using a custom Moodle web service function (`local_cloudsupport_restore_course`).
 *
 * This function sends a POST request to the Moodle server, instructing it to
 * restore the given backup file into the specified course.
 *
 * @async
 * @function restoreCourse
 * @param {number} courseID - The ID of the course where the backup should be restored.
 * @param {string} fileName - The name of the .mbz file that has already been uploaded to Moodle.
 * @param {Object} [options] - Optional configuration object.
 * @param {string} [options.baseUrl=process.env.MOODLE_URL] - Base URL of the Moodle server.
 * @param {string} [options.token=process.env.MOODLE_CLOUDSUPPORT_TOKEN] - Moodle API token for authentication.
 * @returns {Promise<{
 *   success: boolean,
 *   data?: any,
 *   error?: string,
 *   details?: any
 * }>} - An object indicating success or failure, with API response or error details.
 *
 * @example
 * const result = await restoreCourse(25, 'CT123-20250611-203546.mbz', {
 *   baseUrl: 'https://moodle.example.com',
 *   token: 'your_moodle_token'
 * });
 *
 * if (result.success) {
 *   console.log('Restore successful:', result.data);
 * } else {
 *   console.error('Restore failed:', result.error, result.details);
 * }
 */
export async function restoreCourse(
  courseID,
  fileName,
  { baseUrl, token } = {
    baseUrl: process.env.MOODLE_URL,
    token: process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  }
) {
  try {
    if (!fileName) {
      throw new Error('Missing courseID or fileName');
    }

    const apiUrl = `${baseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'local_cloudsupport_restore_course',
      moodlewsrestformat: 'json',
      courseid: courseID.toString(),
      filename: fileName,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        return {
          success: false,
          error: 'Moodle restore API failed',
          details: errorData,
        };
      } catch {
        return {
          success: false,
          error: 'Moodle restore API failed',
          details: text,
        };
      }
    }

    const result = await response.json();

    if (result.exception) {
      return {
        success: false,
        error: result.message || 'Restore failed',
        details: result,
      };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Restore course error:', error);
    return {
      success: false,
      error: 'Restore request failed',
      details: error.message,
    };
  }
}

/**
 * Restores a Moodle course from a backup file (.mbz) using a custom web service.
 *
 * This function sends a request to the Moodle server to restore a backup into the given course ID,
 * using the `local_cloudsupport_restore_course` web service function.
 *
 * @async
 * @function restoreUsers
 * @param {number} courseID - The ID of the Moodle course where the backup will be restored.
 * @param {string} fileName - The name of the .mbz file (previously uploaded to Moodle) to be restored.
 * @param {Object} [options] - Optional configuration for Moodle connection.
 * @param {string} [options.baseUrl=process.env.MOODLE_URL] - Base URL of the Moodle instance.
 * @param {string} [options.token=process.env.MOODLE_CLOUDSUPPORT_TOKEN] - Web service token for authentication.
 * @returns {Promise<{
 *   success: boolean,
 *   data?: any,
 *   error?: string,
 *   details?: any
 * }>} - Resolves to an object indicating success or failure, with Moodle API response or error details.
 *
 * @example
 * // Restore a course from a backup file called "CT123-20250611-203546.mbz"
 * const result = await restoreUsers(25, 'CT123-20250611-203546.mbz', {
 *   baseUrl: 'https://moodle.example.com',
 *   token: 'your_moodle_token'
 * });
 *
 * if (result.success) {
 *   console.log('Restore successful:', result.data);
 * } else {
 *   console.error('Restore failed:', result.error, result.details);
 * }
 */
export async function restoreUsers(
  fileName,
  {
    baseUrl = process.env.MOODLE_URL,
    token = process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  } = {}
) {
  try {
    if (!fileName) {
      throw new Error('Missing courseID or fileName');
    }

    const apiUrl = `${baseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'local_cloudsupport_import_users',
      moodlewsrestformat: 'json',
      filename: fileName,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        return {
          success: false,
          error: 'Moodle restore API failed',
          details: errorData,
        };
      } catch {
        return {
          success: false,
          error: 'Moodle restore API failed',
          details: text,
        };
      }
    }

    const result = await response.json();

    if (result.exception) {
      return {
        success: false,
        error: result.message || 'Restore failed',
        details: result,
      };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Restore course error:', error);
    return {
      success: false,
      error: 'Restore request failed',
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
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const resolvedSavePath = path.resolve(__dirname, saveFolder);
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
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = path.resolve(__dirname, saveFolder, fileName);

    await fs.unlink(filePath);
    console.log(`🧹 File deleted: ${fileName}`);
  } catch (error) {
    console.warn(`⚠️ Could not delete file "${fileName}": ${error.message}`);
    // Không throw để tránh crash logic gọi hàm uploadFile
  }
}
