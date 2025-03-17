import { connectGCSQL } from "./connect";

/**
 * Tạo database nếu chưa tồn tại
 * @param {string} dbName - Tên database cần tạo
 * @returns {Promise<void>}
 */
export async function createDatabase(dbName) {
  try {
    const connection = await connectGCSQL(); // Kết nối đến MySQL
    const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS \`${dbName}\``;

    await connection.query(createDatabaseQuery);
    console.log(`✅ Database "${dbName}" created successfully`);

    await connection.end(); // Đóng kết nối sau khi tạo xong
  } catch (error) {
    console.error("❌ Error creating database:", error);
  }
}
