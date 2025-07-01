/**
 *
 * @param {*} quizid
 * @param {*} timeopen
 * @param {*} timeclose
 * @returns Promise<({ success: boolean, error?: string, message?: string }})>
 */
export async function updateTimeQuiz(quizid, timeopen, timeclose) {
  if (!quizid || !timeopen || !timeclose) {
    return { error: 'Missing required fields', success: false };
  }

  console.log('quizid', quizid, timeopen, timeclose);

  const MOODLE_URL = process.env.MOODLE_URL || 'http://localhost:8080';
  const MOODLE_TOKEN = process.env.MOODLE_TOKEN || 'token';

  try {
    const response = await fetch(`${MOODLE_URL}/webservice/rest/server.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        wstoken: MOODLE_TOKEN,
        wsfunction: 'core_course_edit_module',
        moodlewsrestformat: 'json',
        cmid: quizid, // ID của quiz dưới dạng course module ID
        'options[0][name]': 'timeopen',
        'options[0][value]': timeopen,
        'options[1][name]': 'timeclose',
        'options[1][value]': timeclose,
      }),
    });

    const data = await response.json();
    console.log(data);

    if (data.errorcode) {
      throw new Error(data.message);
    }

    return { message: 'Quiz updated successfully', data, success: true };
  } catch (error) {
    return { error: error.message, success: false };
  }
}
