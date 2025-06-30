import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Backup a Moodle course and optionally save the backup to the server.
 *
 * @param {number} courseID - ID of the course to backup.
 * @param {string} [savePath='stemp'] - Folder to save the backup file (default: 'stemp').
 * @returns {Promise<{
 *   status: string,
 *   filename: string,
 *   contenthash: string,
 *   url: string
 * }>} Promise resolving to backup metadata.
 */
export async function backupCourse(courseID, savePath = 'stemp') {
  try {
    if (!courseID) {
      throw new Error('Missing courseID');
    }

    const moodleToken = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
    const moodleBaseUrl = process.env.MOODLE_URL;
    const apiUrl = `${moodleBaseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: moodleToken,
      wsfunction: 'local_cloudsupport_export_course',
      moodlewsrestformat: 'json',
      courseid: courseID.toString(),
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log('Backup: ', response);

    if (!response.ok) {
      const data = await response.text();

      try {
        const errorData = JSON.parse(data);
        return { error: 'Moodle API error', details: errorData };
      } catch (error) {
        return { error: 'Moodle API error', details: data };
      }
    }

    const data = await response.json();

    console.log(data);

    if (data.url) {
      downloadFile(data, savePath);
    }

    return data;
  } catch (error) {
    console.error('Export course error:', error);
    return { error: 'Failed to export course', details: error.message };
  }
}

export async function restoreCourse(courseID, fileName) {
  try {
    if (!courseID || !fileName) {
      throw new Error('Missing courseID or fileName');
    }

    const moodleToken = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
    const moodleBaseUrl = process.env.MOODLE_URL;

    const apiUrl = `${moodleBaseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: moodleToken,
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
        return { error: 'Moodle restore API failed', details: errorData };
      } catch {
        return { error: 'Moodle restore API failed', details: text };
      }
    }

    const result = await response.json();

    if (result.exception) {
      return { error: result.message || 'Restore failed', details: result };
    }

    return result;
  } catch (error) {
    console.error('Restore course error:', error);
    return { error: 'Restore request failed', details: error.message };
  }
}

export async function exportUsers(courseID, savePath = 'stemp') {
  try {
    if (!courseID) {
      throw new Error('Missing courseID');
    }

    const moodleToken = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
    const moodleBaseUrl = process.env.MOODLE_URL;
    const apiUrl = `${moodleBaseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: moodleToken,
      wsfunction: 'local_cloudsupport_export_users',
      moodlewsrestformat: 'json',
      courseid: courseID.toString(),
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log('Get Users: ', response);

    if (!response.ok) {
      const errorData = await response.json();
      return { error: 'Moodle API error', details: errorData };
    }

    const data = await response.json();

    console.log(data);

    if (data.url) {
      downloadFile(data, savePath);
    }

    return data;
  } catch (error) {
    console.error('Export users error:', error);
    return { error: 'Failed to export users', details: error.message };
  }
}

/**
 * Download a file from Moodle to local filesystem
 *
 * @param {Object} data - The download URL from Moodle response
 * @param {string} saveFolder - Local folder to save file into (default = stemp)
 * @returns {Promise<Object | void>} - Error object or undefined if successful
 */
export async function downloadFile(data, saveFolder = 'stemp') {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const resolvedSavePath = path.resolve(__dirname, saveFolder);

    // Ensure folder exists
    try {
      await fs.mkdir(resolvedSavePath, { recursive: true });
    } catch (mkdirErr) {
      throw new Error(`Failed to create save folder: ${mkdirErr.message}`);
    }

    // Fetch file stream from Moodle
    const fileRes = await fetch(data.url);

    if (!fileRes.ok || !fileRes.body) {
      console.log('Error download file: ', fileRes);

      return {
        error: 'Failed to download file from Moodle',
        status: fileRes.status,
      };
    }

    const backupFilename = data.filename;

    if (!backupFilename) {
      throw new Error('Filename could not be determined from URL.');
    }

    const savePath = path.join(resolvedSavePath, backupFilename);

    const fileHandle = await fs.open(savePath, 'w');
    const writable = fileHandle.createWriteStream();

    await pipeline(fileRes.body, writable);
    await fileHandle.close();
  } catch (error) {
    console.error('Download file error:', error);
    return { error: 'Failed to download file', details: error.message };
  }
}

/**
 * Upload a .mbz backup file to Moodle
 *
 * @param {string} fileName - Full path to the .mbz file
 * @returns {Promise<Object>} - Returns upload result or error
 */
export async function uploadFile(fileName, saveFolder = 'stemp') {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const resolvedSavePath = path.resolve(__dirname, saveFolder);
    const filepath = path.join(resolvedSavePath, fileName);

    if (!filepath || path.extname(filepath) !== '.mbz') {
      throw new Error('Invalid file. Only .mbz files are supported.');
    }

    const moodleToken = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
    const moodleBaseUrl = process.env.MOODLE_URL;
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
      try {
        const errorData = JSON.parse(errorText);
        return { error: 'Moodle API error', details: errorData };
      } catch (e) {
        return { error: 'Moodle API error', details: errorText };
      }
    }

    const data = await response.json();

    if (data.exception) {
      return { error: 'Upload failed', details: data.message };
    }

    console.log('Upload successful:', data);
    return data;
  } catch (error) {
    console.error('Upload file error:', error);
    return { error: 'Failed to upload file', details: error.message };
  }
}
