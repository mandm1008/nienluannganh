import mysql from "mysql2/promise";

// Cấu hình kết nối tới Google Cloud SQL qua Public IP
const dbConfig = {
  host: process.env.GCSQL_HOST,
  user: process.env.GCSQL_USER,
  password: process.env.GCSQL_PASS,
  database: process.env.GCSQL_TYPE,
  port: process.env.GCSQL_PORT || 3306,
};

/**
 * Kết nối đến Google Cloud SQL
 * @returns {Promise<mysql.Connection>} Trả về một Promise chứa kết nối MySQL
 */
export async function connectGCSQL() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ Kết nối Google Cloud SQL thành công!");
    return connection;
  } catch (error) {
    console.error("❌ Lỗi kết nối Google Cloud SQL:", error);
  }
}
