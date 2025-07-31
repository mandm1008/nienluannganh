import { listenEventBackupFinished } from '@/lib/moodle/services/webhooks';
import { downloadFile } from '@/lib/tools/files';

/**
 * Backs up a Moodle course via the `local_cloudsupport_export_course` web service.
 * Optionally downloads the backup file if a download URL is returned.
 *
 * @async
 * @function backupCourse
 * @param {number} courseID - ID of the Moodle course to back up.
 * @param {Object} [options] - Optional configuration.
 * @param {string} [options.baseUrl=process.env.MOODLE_URL] - Base URL of the Moodle server.
 * @param {string} [options.token=process.env.MOODLE_CLOUDSUPPORT_TOKEN] - Moodle API token.
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {
 *     status: string,
 *     filename: string,
 *     contenthash: string,
 *     url: string
 *   },
 *   downloadResult?: {
 *     success: boolean,
 *     path?: string,
 *     error?: string,
 *     details?: any
 *   },
 *   error?: string,
 *   details?: any
 * }>} Object indicating success or failure, with optional download result.
 *
 * @example
 * const result = await backupCourse(42, {
 *   baseUrl: 'https://moodle.example.com',
 *   token: 'your_moodle_token'
 * });
 *
 * if (result.success) {
 *   console.log('✅ Backup created:', result.data.filename);
 *   if (result.downloadResult?.success) {
 *     console.log('📦 File saved to:', result.downloadResult.path);
 *   }
 * } else {
 *   console.error('❌ Backup failed:', result.error, result.details);
 * }
 */
export async function backupCourse(
  courseID,
  {
    baseUrl = process.env.MOODLE_URL,
    token = process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  } = {}
) {
  try {
    if (!courseID) {
      throw new Error('Missing courseID');
    }

    const apiUrl = `${baseUrl}/webservice/rest/server.php`;

    let params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'local_cloudsupport_export_course',
      moodlewsrestformat: 'json',
      courseid: courseID.toString(),
    });

    if (baseUrl !== process.env.MOODLE_URL) {
      const WEBSERVICE_URL = process.env.WEBSERVICE_URL;

      params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'local_cloudsupport_export_course',
        moodlewsrestformat: 'json',
        courseid: courseID.toString(),
        webhookapi: WEBSERVICE_URL + '/api/moodle/webhooks',
        webhooktoken: token,
      });
    }

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
          error: 'Moodle API error',
          details: errorData,
        };
      } catch {
        return {
          success: false,
          error: 'Moodle API error',
          details: text,
        };
      }
    }

    let data = await response.json();

    if (data.exception) {
      return {
        success: false,
        error: data.message || 'Backup failed',
        details: data,
      };
    }

    console.log(data);

    if (baseUrl !== process.env.MOODLE_URL) {
      console.log('Start await event ' + token);
      data = await listenEventBackupFinished(token);
    }

    console.log(data);

    // Optional: download backup file
    console.log(`Start download ${courseID}: `, data);
    let downloadResult;
    if (data.url && data.filename) {
      if (baseUrl !== process.env.MOODLE_URL) {
        downloadResult = await downloadFile(data, { serviceUrl: baseUrl });
      } else {
        downloadResult = await downloadFile(data);
      }
    }

    return {
      success: true,
      data,
      ...(downloadResult && { downloadResult }),
    };
  } catch (error) {
    console.error('Export course error:', error);
    return {
      success: false,
      error: 'Failed to export course',
      details: error.message,
    };
  }
}

/**
 * Exports user data from a Moodle course and optionally downloads the file if a URL is returned.
 *
 * @param {number} courseID - ID of the Moodle course to export users from.
 * @param {Object} [options]
 * @param {string} [options.baseUrl=process.env.MOODLE_URL] - Moodle server URL.
 * @param {string} [options.token=process.env.MOODLE_CLOUDSUPPORT_TOKEN] - Moodle web service token.
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {
 *     filename: string,
 *     url: string,
 *     status: string
 *   },
 *   downloadResult?: {
 *     success: boolean,
 *     path?: string,
 *     error?: string,
 *     details?: any
 *   },
 *   error?: string,
 *   details?: any
 * }>}
 *
 * @example
 * const result = await exportUsers(12);
 * if (result.success) {
 *   console.log('Exported file:', result.data.filename);
 *   console.log('Saved to:', result.downloadResult?.path);
 * } else {
 *   console.error('Export failed:', result.error);
 * }
 */
export async function exportUsers(
  courseID,
  {
    baseUrl = process.env.MOODLE_URL,
    token = process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  } = {}
) {
  try {
    if (!courseID) {
      throw new Error('Missing courseID');
    }

    const apiUrl = `${baseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: token,
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
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        console.error(errorData);
        return {
          success: false,
          error: 'Moodle API error',
          details: errorData,
        };
      } catch {
        return { success: false, error: 'Moodle API error', details: text };
      }
    }

    const data = await response.json();

    console.log(data);

    if (data.exception) {
      return {
        success: false,
        error: data.message || 'Export failed',
        details: data,
      };
    }

    let downloadResult;
    if (data.url && data.filename) {
      downloadResult = await downloadFile(data);
    }

    return {
      success: true,
      data,
      ...(downloadResult && { downloadResult }),
    };
  } catch (error) {
    console.error('Export users error:', error);
    return {
      success: false,
      error: 'Failed to export users',
      details: error.message,
    };
  }
}
