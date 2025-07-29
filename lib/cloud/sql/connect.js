import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.GCSQL_HOST || 'localhost',
  user: process.env.GCSQL_USER || 'root',
  password: process.env.GCSQL_PASS || '',
  database: process.env.GCSQL_DB || 'moodle',
  port: process.env.GCSQL_PORT || 3306,
};

/**
 * Kết nối đến Google Cloud SQL
 * @returns {Promise<mysql.Connection>} Trả về một Promise chứa kết nối MySQL
 */
export async function connectPubDB(config = dbConfig) {
  try {
    const connection = await mysql.createConnection(config);
    return connection;
  } catch (error) {
    console.error('❌ Lỗi kết nối Google Cloud SQL:', error);
  }
}
