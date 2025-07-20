import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.GCSQL_HOST || 'localhost', // MYSQL_HOST
  user: process.env.GCSQL_USER || 'root', // MYSQL_USER
  password: process.env.GCSQL_PASS || '', // MYSQL_PASS
  database: process.env.GCSQL_DB || 'moodle', // MYSQL_DB
  port: process.env.GCSQL_PORT || 3306, // MYSQL_PORT
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
