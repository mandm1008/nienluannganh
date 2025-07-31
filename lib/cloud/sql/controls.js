import { connectPubDB } from '@/lib/cloud/sql/connect';

/**
 * Tạo database nếu chưa tồn tại
 * @param {string} dbName - Tên database cần tạo
 */
export async function createDatabase(dbName) {
  const dbUser = process.env.GCSQL_USER;

  console.time(`⏳ Tạo database "${dbName}"`);
  const connection = await connectPubDB();

  try {
    const createQuery = `CREATE DATABASE IF NOT EXISTS \`${dbName}\``;
    await connection.query(createQuery);

    const grantQuery = `
      GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';
    `;
    await connection.query(grantQuery);
    await connection.query(`FLUSH PRIVILEGES`);

    console.log(`✅ Database "${dbName}" đã được tạo và cấp quyền`);
  } catch (error) {
    console.error(`❌ Lỗi khi tạo database "${dbName}":`, error);
    throw error;
  } finally {
    await connection.end();
    console.timeEnd(`⏳ Tạo database "${dbName}"`);
  }
}

/**
 * Copy toàn bộ cấu trúc và dữ liệu từ database mẫu sang database đích
 * @param {string} targetDB - Database đích cần khởi tạo
 * @param {string} [sourceDB='moodleimage'] - Database nguồn (mặc định: 'moodleimage')
 */
export async function copyDatabaseDirectly(targetDB, sourceDB = 'moodleimage') {
  const connection = await connectPubDB();

  console.time(`⏳ Copy toàn bộ database từ "${sourceDB}" sang "${targetDB}"`);
  try {
    const [tables] = await connection.query(`SHOW TABLES FROM \`${sourceDB}\``);

    const tableKey = `Tables_in_${sourceDB}`;
    let count = 0;

    for (const row of tables) {
      const table = row[tableKey];
      const start = Date.now();

      await connection.query(
        `CREATE TABLE \`${targetDB}\`.\`${table}\` LIKE \`${sourceDB}\`.\`${table}\``
      );
      await connection.query(
        `INSERT INTO \`${targetDB}\`.\`${table}\` SELECT * FROM \`${sourceDB}\`.\`${table}\``
      );

      const duration = Date.now() - start;

      // // In mờ, ghi đè dòng trước
      // process.stdout.clearLine(0);
      // process.stdout.cursorTo(0);
      // process.stdout.write(
      //   `\r\x1b[90m\t Copied ${table} in ${duration}ms\x1b[0m`
      // );
      count++;
    }

    // In newline sau khi xong hết
    // process.stdout.clearLine(0);
    // process.stdout.cursorTo(0);
    // process.stdout.write('\r\x1b[90m\t done.\n');

    console.log(
      `✅ Đã sao chép ${count} bảng từ "${sourceDB}" sang "${targetDB}"`
    );
  } catch (error) {
    console.error(
      `❌ Lỗi khi copy database từ "${sourceDB}" sang "${targetDB}":`,
      error
    );
    throw error;
  } finally {
    await connection.end();
    console.timeEnd(
      `⏳ Copy toàn bộ database từ "${sourceDB}" sang "${targetDB}"`
    );
  }
}

/**
 * Bật REST Webservice protocol cho Moodle trong database
 * @param {string} targetDB - Tên database Moodle cần cấu hình
 */
export async function enableRestProtocol(targetDB) {
  const connection = await connectPubDB();

  try {
    console.log(`🌍 Đang bật REST Webservice cho "${targetDB}"...`);

    const queries = [
      `INSERT INTO \`${targetDB}\`.mdl_config (name, value)
       VALUES ('enablewebservices', '1')
       ON DUPLICATE KEY UPDATE value = '1'`,

      `INSERT INTO \`${targetDB}\`.mdl_config (name, value)
       VALUES ('webserviceprotocols', 'rest')
       ON DUPLICATE KEY UPDATE value = 'rest'`,
    ];

    for (const query of queries) {
      await connection.query(query);
    }

    console.log(`✅ Đã bật REST Webservice protocol cho "${targetDB}"`);
  } catch (error) {
    console.error(`❌ Lỗi khi bật REST Webservice cho "${targetDB}":`, error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Bật toàn bộ các task của tool_objectfs (nếu bị disable)
 * @param {string} targetDB - Tên database Moodle cần xử lý
 */
export async function enableToolObjectfsTasks(targetDB) {
  const connection = await connectPubDB();

  try {
    console.log(
      `🧩 Bật toàn bộ task của plugin "tool_objectfs" cho "${targetDB}"...`
    );

    const updateQuery = `
      UPDATE \`${targetDB}\`.mdl_task_scheduled
      SET disabled = 0
      WHERE classname LIKE '\\\\tool_objectfs\\\\task\\\\%';
    `;

    const [result] = await connection.query(updateQuery);
    console.log(
      `✅ Đã bật tất cả task tool_objectfs (nếu có) cho "${targetDB}"`
    );
  } catch (error) {
    console.error(
      `❌ Lỗi khi bật task tool_objectfs cho "${targetDB}":`,
      error
    );
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Khởi tạo database đích từ database mẫu
 * @param {string} targetDB - Tên database đích
 * @param {string} settings - Setting
 * @param {string} [settings.sourceDB=process.env.MOODLE_DB_IMAGE] - Tên database mẫu
 * @param {boolean} [settings.force=false] - Tên database mẫu
 */
export async function initDatabase(
  targetDB,
  { sourceDB = process.env.MOODLE_DB_IMAGE, force = false } = {}
) {
  console.time(`🚀 Total time initDatabase("${targetDB}"):`);
  try {
    if (force) {
      await dropDatabase(targetDB);
    }
    await createDatabase(targetDB);
    await copyDatabaseDirectly(targetDB, sourceDB);
    await enableRestProtocol(targetDB);
    await enableToolObjectfsTasks(targetDB);
    console.log(
      `✅ Database "${targetDB}" đã được khởi tạo thành công từ "${sourceDB}"`
    );
  } catch (error) {
    console.error(`❌ Init Database failed:`, error);
    throw error;
  }
  console.timeEnd(`🚀 Total time initDatabase("${targetDB}"):`);
}

/**
 * Xóa database nếu tồn tại
 * @param {string} dbName - Tên database cần xóa
 */
export async function dropDatabase(dbName) {
  const connection = await connectPubDB();

  console.time(`🗑️  Xóa database "${dbName}"`);
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`✅ Đã xóa database "${dbName}"`);
  } catch (error) {
    console.error(`❌ Lỗi khi xóa database "${dbName}":`, error);
    throw error;
  } finally {
    await connection.end();
    console.timeEnd(`🗑️  Xóa database "${dbName}"`);
  }
}
