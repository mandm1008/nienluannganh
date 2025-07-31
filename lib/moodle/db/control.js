import { connectPriDB } from '@/lib/moodle/db/connect';

/**
 * Lấy thông tin của một quiz từ Moodle database
 * @param {number} quizId - ID của quiz cần lấy
 * @returns {Promise<Object|null>} - Dữ liệu quiz hoặc null nếu không tìm thấy
 */
export async function getQuizById(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required');
  }

  let connection;
  try {
    connection = await connectPriDB();

    // Truy vấn dữ liệu quiz cùng tên khóa học
    const [rows] = await connection.execute(
      `SELECT q.id, q.name, q.timeopen, q.timeclose, q.timelimit, 
              c.id AS courseid, c.fullname AS coursename, c.shortname AS courseshortname
       FROM mdl_quiz q
       JOIN mdl_course c ON q.course = c.id
       WHERE q.id = ?`,
      [quizId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(
      `❌ Lỗi khi lấy dữ liệu quiz (ID: ${quizId}):`,
      error.message
    );
    throw new Error('Không thể lấy dữ liệu bài kiểm tra');
  } finally {
    if (connection) await connection.end(); // Đảm bảo đóng kết nối
  }
}

export async function getFullQuizById(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required');
  }

  let connection;
  try {
    connection = await connectPriDB();

    // Truy vấn dữ liệu quiz cùng tên khóa học
    const [rows] = await connection.execute(
      `SELECT q.*
       FROM mdl_quiz q
       JOIN mdl_course c ON q.course = c.id
       WHERE q.id = ?`,
      [quizId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(
      `❌ Lỗi khi lấy dữ liệu quiz (ID: ${quizId}):`,
      error.message
    );
    throw new Error('Không thể lấy dữ liệu bài kiểm tra');
  } finally {
    if (connection) await connection.end(); // Đảm bảo đóng kết nối
  }
}

export async function getQuizIdsByCourseId(courseId) {
  if (!courseId) {
    throw new Error('Course ID is required');
  }

  let connection;
  try {
    connection = await connectPriDB();

    const [rows] = await connection.execute(
      `SELECT id FROM mdl_quiz WHERE course = ?`,
      [courseId]
    );

    await connection.end();

    return rows.map((row) => row.id); // Trả về mảng quizId
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách quiz ID:', error);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * Retrieve a list of accessible quiz IDs for a specific Moodle user by username
 * @param {string} username - Moodle username of the user
 * @returns {Promise<number[]>} - Array of quiz IDs
 */
export async function getQuizIdsByUsername(username) {
  if (!username) throw new Error('Username is required');

  let connection;
  try {
    connection = await connectPriDB();

    // Query quizzes accessible by the user via enrolled courses
    const [rows] = await connection.execute(
      `SELECT q.id
       FROM mdl_user u
       JOIN mdl_user_enrolments ue ON ue.userid = u.id
       JOIN mdl_enrol e ON e.id = ue.enrolid
       JOIN mdl_course c ON c.id = e.courseid
       JOIN mdl_quiz q ON q.course = c.id
       WHERE u.username = ?`,
      [username]
    );

    // Return quiz IDs as an array
    return rows.map((row) => row.id);
  } catch (err) {
    console.error(
      `❌ Error fetching quiz IDs for username (${username}):`,
      err.message
    );
    throw new Error('Failed to retrieve quiz ID list');
  } finally {
    if (connection) await connection.end();
  }
}
