import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.MOODLEDB_HOST || 'localhost',
  user: process.env.MOODLEDB_USER || 'root',
  password: process.env.MOODLEDB_PASS || '',
  database: process.env.MOODLEDB_DB || 'moodle',
  port: process.env.MOODLEDB_PORT || 3306,
};

/**
 * Kết nối đến Google Cloud SQL
 * @returns {Promise<mysql.Connection>} Trả về một Promise chứa kết nối MySQL
 */
export async function connectPriDB() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    // console.log('✅ Kết nối Google Cloud SQL thành công!');
    return connection;
  } catch (error) {
    console.error('❌ Lỗi kết nối Google Cloud SQL:', error);
  }
}
