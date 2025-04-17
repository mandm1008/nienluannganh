import util from 'util';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = util.promisify(exec);

/**
 * Hàm tạo tên file theo format db_YYYYMMDD_HHmmss.sql
 * @returns {string} Đường dẫn file xuất
 */
function generateTimestampFileName() {
  const dataDir = join(__dirname, 'data');

  // Tạo thư mục data nếu chưa có
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Tạo timestamp dạng YYYYMMDD_HHmmss
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:]/g, '')
    .split('.')[0];
  return join(dataDir, `db_${timestamp}.sql`);
}

/**
 *
 * @param {host, user, password, database, port} dbConfig
 * @returns {Promise<string>} Đường dẫn file xuất
 */
export async function exportDatabase(dbConfig) {
  try {
    const { host, user, password, database, port } = dbConfig;
    const outputPath = generateTimestampFileName();
    const dumpCommand = `mysqldump \
      --no-tablespaces \
      --skip-add-locks \
      --skip-comments \
      --skip-set-charset \
      --single-transaction \
      --set-gtid-purged=OFF \
      -u ${user} -p"${password}" -h ${host} -P ${port} ${database} > ${outputPath}`;

    console.log(`🔹 Đang xuất dữ liệu từ DB: ${database} → ${outputPath}`);
    await execAsync(dumpCommand);

    console.log(`✅ Xuất dữ liệu thành công! File: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Lỗi khi export: ${error.message}`);
    throw error;
  }
}

/**
 *
 * @param {host, user, password, database, port} dbConfig
 * @param {string} sqlFilePath Đường dẫn file xuất
 */
export async function importDatabase(dbConfig, sqlFilePath) {
  try {
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`File không tồn tại: ${sqlFilePath}`);
    }

    const { host, user, password, database, port } = dbConfig;
    const importCommand = `mysql -u ${user} -p${password} -h ${host} -P ${port} ${database} < ${sqlFilePath}`;

    console.log(`🔹 Nhập dữ liệu vào DB: ${database} ← ${sqlFilePath}`);
    await execAsync(importCommand);

    console.log(`✅ Nhập dữ liệu thành công vào DB: ${database}`);
  } catch (error) {
    console.error(`❌ Lỗi khi import: ${error.message}`);
    throw error;
  } finally {
    // 🧹 Xoá file sau khi xong
    try {
      if (fs.existsSync(sqlFilePath)) {
        fs.unlinkSync(sqlFilePath);
        console.log(`🧹 Đã xoá file: ${sqlFilePath}`);
      }
    } catch (unlinkErr) {
      console.warn(
        `⚠️ Không thể xoá file ${sqlFilePath}: ${unlinkErr.message}`
      );
    }
  }
}
