import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Backup a Moodle course and optionally save the backup to the server
 *
 * @param {number} courseID - ID of the course to backup
 * @param {boolean} download - Whether to download and save the backup
 * @param {string} savePath - Folder to save the backup file, default = ./stemp
 * @returns {Promise<Object>} - Returns backup metadata or success/error message
 */
export async function backupCourse(
  courseID,
  download = false,
  savePath = 'stemp'
) {
  try {
    if (!courseID) {
      throw new Error('Missing courseID');
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const resolvedSavePath = path.resolve(__dirname, savePath);

    if (download && !fs.existsSync(resolvedSavePath)) {
      fs.mkdirSync(resolvedSavePath, { recursive: true });
    }

    const moodleToken = process.env.MOODLE_BACKUP_RESTORE_TOKEN;
    const moodleBaseUrl = process.env.MOODLE_URL;

    const apiUrl = `${moodleBaseUrl}/webservice/rest/server.php`;
    const paramsConfig = {
      wstoken: moodleToken,
      wsfunction: 'local_course_restore_export_course',
      moodlewsrestformat: 'json',
      courseid: courseID,
    };
    const params = new URLSearchParams(
      download ? { ...paramsConfig, download: 1 } : paramsConfig
    );

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

    console.log(data)

    if (data.downloadurl) {
      const fileRes = await fetch(data.downloadurl);

      if (!fileRes.ok) {
        return { error: 'Failed to download file from Moodle' };
      }

      const url = new URL(data.downloadurl);
      const backupFilename = url.searchParams.get('file');
      const savePath = path.join(resolvedSavePath, backupFilename);

      const fileStream = fs.createWriteStream(savePath);
      await pipeline(fileRes.body, fileStream);
    }

    return data;
  } catch (error) {
    console.error('Export course error:', error);
    return { error: 'Failed to export course', details: error.message };
  }
}
