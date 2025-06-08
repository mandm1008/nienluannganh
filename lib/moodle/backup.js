import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Backup a Moodle course and optionally save the backup to the server
 *
 * @param {number} courseID - ID of the course to backup
 * @param {string} savePath - Folder to save the backup file, default = ./stemp
 * @returns {Promise<Object>} - Returns backup metadata or success/error message
 */
export async function backupCourse(courseID, savePath = 'stemp') {
  try {
    if (!courseID) {
      throw new Error('Missing courseID');
    }

    const moodleToken = process.env.MOODLE_BACKUP_RESTORE_TOKEN;
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

    console.log(response);

    if (!response.ok) {
      const errorData = await response.json();
      return { error: 'Moodle API error', details: errorData };
    }

    const data = await response.json();

    console.log(data);

    if (data.downloadurl) {
      downloadFile(data.downloadurl, savePath);
    }

    return data;
  } catch (error) {
    console.error('Export course error:', error);
    return { error: 'Failed to export course', details: error.message };
  }
}

export async function exportUsers(courseID, savePath = 'stemp') {
  try {
    if (!courseID) {
      throw new Error('Missing courseID');
    }

    const moodleToken = process.env.MOODLE_BACKUP_RESTORE_TOKEN;
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

    if (!response.ok) {
      const errorData = await response.json();
      return { error: 'Moodle API error', details: errorData };
    }

    const data = await response.json();

    console.log(data);

    if (data.downloadurl) {
      downloadFile(data.downloadurl, savePath);
    }

    return data;
  } catch (error) {
    console.error('Export users error:', error);
    return { error: 'Failed to export users', details: error.message };
  }
}

async function downloadFile(downloadurl, savePath = 'stemp') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const resolvedSavePath = path.resolve(__dirname, savePath);

  if (!fs.existsSync(resolvedSavePath)) {
    fs.mkdirSync(resolvedSavePath, { recursive: true });
  }

  if (downloadurl) {
    const fileRes = await fetch(downloadurl);

    if (!fileRes.ok) {
      return { error: 'Failed to download file from Moodle' };
    }

    const url = new URL(downloadurl);
    const backupFilename = url.searchParams.get('file');
    const savePath = path.join(resolvedSavePath, backupFilename);

    const fileStream = fs.createWriteStream(savePath);
    await pipeline(fileRes.body, fileStream);
  }
}
