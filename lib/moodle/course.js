/**
 * Updates the visibility of a Moodle course using the `core_course_update_courses` API.
 *
 * This function sets the course as visible or hidden depending on the `visible` flag.
 *
 * @async
 * @function updateCourseVisibility
 * @param {number} courseID - The ID of the course to update.
 * @param {boolean|number} visible - Set to `true` or `1` to show the course, `false` or `0` to hide.
 * @param {Object} [options] - Optional configuration.
 * @param {string} [options.baseUrl=process.env.MOODLE_URL] - Moodle server base URL.
 * @param {string} [options.token=process.env.MOODLE_CLOUDSUPPORT_TOKEN] - Moodle API token.
 * @returns {Promise<{
 *   success: boolean,
 *   data?: any,
 *   error?: string,
 *   details?: any
 * }>} - API result.
 *
 * @example
 * // Hide course
 * await updateCourseVisibility(123, 0);
 *
 * // Show course
 * await updateCourseVisibility(123, 1);
 */
export async function updateCourseVisibility(
  courseID,
  visible,
  {
    baseUrl = process.env.MOODLE_URL,
    token = process.env.MOODLE_CLOUDSUPPORT_TOKEN,
  } = {}
) {
  try {
    if (typeof courseID !== 'number' || typeof visible === 'undefined') {
      throw new Error('Missing courseID or visible value');
    }

    const apiUrl = `${baseUrl}/webservice/rest/server.php`;

    const params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'local_cloudsupport_update_courses',
      moodlewsrestformat: 'json',
      'courses[0][id]': courseID.toString(),
      'courses[0][visible]': visible ? '1' : '0',
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const resultText = await response.text();

    let result;
    try {
      result = JSON.parse(resultText);
    } catch (err) {
      return {
        success: false,
        error: 'Invalid JSON response from Moodle',
        details: resultText,
      };
    }

    if (!response.ok || result.exception) {
      return {
        success: false,
        error: result.message || 'Moodle API error',
        details: result,
      };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[❌ Update course visibility failed]', error);
    return {
      success: false,
      error: 'Request failed',
      details: error.message,
    };
  }
}
