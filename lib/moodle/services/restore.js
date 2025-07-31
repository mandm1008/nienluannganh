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
  {
    baseUrl = process.env.MOODLE_URL,
    token = process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  } = {}
) {
  const WEBSERVICE_URL = process.env.WEBSERVICE_URL;

  try {
    if (!fileName || !WEBSERVICE_URL) {
      throw new Error('Missing courseID or WEBSERVICE_URL');
    }

    const apiUrl = `${baseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'local_cloudsupport_restore_course',
      moodlewsrestformat: 'json',
      courseid: courseID.toString(),
      filename: fileName,
      webhookapi: WEBSERVICE_URL + '/api/moodle/webhooks',
      webhooktoken: token,
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
          durationMs,
        };
      } catch {
        return {
          success: false,
          error: 'Moodle restore API failed',
          details: text,
          durationMs,
        };
      }
    }

    const result = await response.json();

    if (result.exception) {
      return {
        success: false,
        error: result.message || 'Restore failed',
        details: result,
        durationMs,
      };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[❌ Restore FAILED]', error);
    return {
      success: false,
      error: 'Restore request failed',
      details: error.message,
    };
  }
}

/**
 * Restores a Moodle course from a backup file (.mbz) using a custom web service. About 20m (on testing)
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
      throw new Error('Missing courseID');
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
