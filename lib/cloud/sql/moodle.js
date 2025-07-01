import { exportDatabase, importDatabase } from './dump';
import { connectPubDB, dbConfig as pubDBConfig } from './connect';
import { dbConfig as priDBConfig } from '@/lib/moodle/connect';

/**
 * Tạo database nếu chưa tồn tại
 * @param {string} dbName - Tên database cần tạo
 * @returns {Promise<void>}
 */
export async function createDatabase(dbName) {
  const dbUser = process.env.GCSQL_USER;

  try {
    const connection = await connectPubDB(); // Kết nối đến MySQL
    const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS \`${dbName}\``;

    await connection.query(createDatabaseQuery);
    console.log(`✅ Database "${dbName}" created successfully`);

    const grantPrivilegesQuery = `
      GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';
    `;
    await connection.query(grantPrivilegesQuery);
    await connection.query(`FLUSH PRIVILEGES;`);

    await connection.end(); // Đóng kết nối sau khi tạo xong
  } catch (error) {
    console.error('❌ Error creating database:', error);
  }
}

/**
 *
 * @param {number} quizId
 * @param {string} targetDB
 * @param {string?} sourceDB
 */
export async function initDatabase(
  quizId,
  targetDB,
  sourceDB = process.env.GCSQL_DB
) {
  try {
    await createDatabase(targetDB);
    await copyDBByDump(sourceDB, targetDB);

    console.log(
      `�� Sao chép dữ liệu từ ${sourceDB} sang ${targetDB} thành công!`
    );
  } catch (error) {
    throw error;
  }
}

let waitingCopy = {};
async function copyDBByDump(
  sourceDB,
  targetDB,
  sourceConfig = priDBConfig,
  targetConfig = pubDBConfig
) {
  try {
    if (waitingCopy[targetDB] === true) {
      console.log(`Đang sao chép dữ liệu từ ${sourceDB} sang ${targetDB}...`);
      throw new Error('Đang sao chép dữ liệu từ sourceDB sang targetDB...');
      return;
    }
    waitingCopy[targetDB] = true;

    const sqlFilePath = await exportDatabase({
      ...sourceConfig,
      database: sourceDB,
    });

    await importDatabase(
      {
        ...targetConfig,
        database: targetDB,
      },
      sqlFilePath
    );

    waitingCopy[targetDB] = false;
  } catch (error) {
    throw error;
  }
}

/**
 *
 * @param {string} sourceDB
 * @param {string} targetDB
 * @param {Connection} sourceConn
 * @param {Connection} targetConn
 * Copy structure from sourceDB to targetDB
 */
async function copyTables(sourceDB, targetDB, sourceConn, targetConn) {
  console.log(
    `🔄 Đang sao chép cấu trúc bảng từ ${sourceDB} sang ${targetDB}...`
  );

  // Lấy danh sách các bảng từ sourceDB
  const [tables] = await sourceConn.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?;`,
    [sourceDB]
  );

  for (const table of tables) {
    const tableName = table.TABLE_NAME;
    console.log(`📌 Đang tạo bảng: ${tableName}`);

    // Tạo bảng trong targetDB
    await targetConn.query(
      `CREATE TABLE \`${targetDB}\`.\`${tableName}\` LIKE \`${sourceDB}\`.\`${tableName}\`;`
    );
  }

  console.log('✅ Hoàn tất sao chép cấu trúc bảng!');
}

/**
 *
 * @param {string} sourceDB
 * @param {string} targetDB
 * @param {Connection} connection
 *
 * Copy data from source db to target db
 */
async function copyData(
  sourceDB,
  targetDB,
  sourceConnection,
  targetConnection
) {
  console.log(`🔄 Đang sao chép dữ liệu từ ${sourceDB} sang ${targetDB}...`);

  try {
    // Lấy danh sách các bảng trong sourceDB
    const [tables] = await sourceConnection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?;`,
      [sourceDB]
    );

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`📌 Đang sao chép dữ liệu: ${tableName}`);

      // Lấy dữ liệu từ sourceDB
      const [rows] = await sourceConnection.query(
        `SELECT * FROM \`${sourceDB}\`.\`${tableName}\`;`
      );

      if (rows.length > 0) {
        const columns = Object.keys(rows[0])
          .map((col) => `\`${col}\``)
          .join(', ');
        const values = rows
          .map(
            (row) =>
              `(${Object.values(row)
                .map((val) => targetConnection.escape(val))
                .join(', ')})`
          )
          .join(', ');

        // Chèn dữ liệu vào targetDB
        await targetConnection.query(
          `INSERT INTO \`${targetDB}\`.\`${tableName}\` (${columns}) VALUES ${values};`
        );
      }
    }

    console.log('✅ Hoàn tất sao chép dữ liệu!');
  } catch (error) {
    console.error('❌ Lỗi khi sao chép dữ liệu:', error);
  }
}

/**
 * Đồng bộ kết quả kiểm tra từ cơ sở dữ liệu Moodle (sourceDB) đến cơ sở dữ liệu chính (targetDB).
 *
 * @param {string} sourceDB - Tên cơ sở dữ liệu nguồn (Moodle).
 * @param {string} targetDB - Tên cơ sở dữ liệu đích (CSDL chính).
 * @param {Connection} sourceConn - Kết nối đến cơ sở dữ liệu nguồn (Moodle).
 * @param {Connection} targetConn - Kết nối đến cơ sở dữ liệu đích (CSDL chính).
 */
async function syncGrades(sourceDB, targetDB, sourceConn, targetConn) {
  try {
    // Lấy dữ liệu kết quả kiểm tra từ CSDL Moodle (sourceDB)
    const query = `
          SELECT g.userid, gi.iteminstance, g.finalgrade
          FROM ${sourceDB}.mdl_grades g
          JOIN ${sourceDB}.mdl_grade_items gi ON g.iteminstance = gi.iteminstance
          WHERE gi.itemmodule = 'quiz';  // Chỉ lấy kết quả bài kiểm tra
      `;

    // Thực hiện truy vấn từ sourceDB
    const [grades] = await new Promise((resolve, reject) => {
      sourceConn.query(query, (err, results) => {
        if (err) reject(`Lỗi khi truy vấn dữ liệu từ sourceDB: ${err}`);
        else resolve(results);
      });
    });

    if (!grades || grades.length === 0) {
      console.log('Không có kết quả bài kiểm tra nào để đồng bộ.');
      return;
    }

    // Lưu kết quả vào CSDL chính (targetDB)
    const insertQuery =
      'INSERT INTO main_grades (user_id, quiz_id, grade) VALUES (?, ?, ?)';

    // Thực hiện lưu kết quả vào targetDB
    for (let grade of grades) {
      const { userid, iteminstance, finalgrade } = grade;
      await new Promise((resolve, reject) => {
        targetConn.execute(
          insertQuery,
          [userid, iteminstance, finalgrade],
          (err, results) => {
            if (err) reject(`Lỗi khi lưu dữ liệu vào targetDB: ${err}`);
            else resolve();
          }
        );
      });
    }

    console.log('Đồng bộ dữ liệu thành công.');

    // Đóng kết nối
    sourceConn.end();
    targetConn.end();
  } catch (error) {
    console.error('Lỗi đồng bộ dữ liệu:', error);
  }
}
