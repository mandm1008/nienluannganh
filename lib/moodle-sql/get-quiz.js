import { connectMYSQL } from './connect'; // Import hàm kết nối MySQL

/**
 * Lấy thông tin của một quiz từ Moodle database
 * @param {number} quizId - ID của quiz cần lấy
 * @returns {Promise<Object|null>} - Dữ liệu quiz hoặc null nếu không tìm thấy
 */
export async function getQuizById(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required');
  }

  try {
    const connection = await connectMYSQL();

    // Truy vấn dữ liệu quiz
    const [rows] = await connection.execute(
      `SELECT q.id, q.name, q.timeopen, q.timeclose, q.timelimit
       FROM mdl_quiz q WHERE q.id = ?`,
      [quizId]
    );

    await connection.end();

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('❌ Lỗi khi lấy dữ liệu quiz:', error);
    throw error;
  }
}

export async function getQuizIdsByCourseId(courseId) {
  if (!courseId) {
    throw new Error('Course ID is required');
  }

  try {
    const connection = await connectMYSQL();

    const [rows] = await connection.execute(
      `SELECT id FROM mdl_quiz WHERE course = ?`,
      [courseId]
    );

    await connection.end();

    return rows.map((row) => row.id); // Trả về mảng quizId
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách quiz ID:', error);
    throw error;
  }
}
