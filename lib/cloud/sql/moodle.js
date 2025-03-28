import { connectGCSQL, createConfig } from './connect';

/**
 * Tạo database nếu chưa tồn tại
 * @param {string} dbName - Tên database cần tạo
 * @returns {Promise<void>}
 */
export async function createDatabase(dbName) {
  const dbUser = process.env.GCSQL_USER;

  try {
    const connection = await connectGCSQL(); // Kết nối đến MySQL
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
 * @param {string} dbName
 * @param {string?} source
 */
export async function initDatabase(
  quizId,
  dbName,
  source = process.env.GCSQL_DB
) {
  const sourceHost = process.env.GCSQL_HOST || 'localhost';
  const sourceUser = process.env.GCSQL_USER || 'root';
  const sourcePass = process.env.GCSQL_PASS || '';
  const sourceDB = source;

  const targetHost =
    process.env.PUB_GCSQL_HOST || process.env.GCSQL_HOST || 'localhost';
  const targetUser =
    process.env.PUB_GCSQL_USER || process.env.GCSQL_USER || 'root';
  const targetPass = process.env.PUB_GCSQL_PASS || process.env.GCSQL_PASS || '';
  const targetDB = dbName;

  try {
    // Connect Source DB
    const sourceConnection = await connectGCSQL(
      createConfig(sourceHost, sourceUser, sourcePass, sourceDB)
    );

    // Tạo database nếu chưa tồn tại
    await createDatabase(targetDB);

    // Connect Target DB
    const targetConnection = await connectGCSQL(
      createConfig(targetHost, targetUser, targetPass, targetDB)
    );

    // Sao chép cấu trúc bảng
    await copyTables(sourceDB, targetDB, sourceConnection, targetConnection);

    // Sao chép dữ liệu
    // await copyQuiz(
    //   quizId,
    //   sourceDB,
    //   targetDB,
    //   sourceConnection,
    //   targetConnection
    // );
    await copyData(sourceDB, targetDB, sourceConnection, targetConnection);

    // Đóng kết nối
    await sourceConnection.end();
    await targetConnection.end();

    console.log(
      `�� Sao chép dữ liệu từ ${sourceDB} sang ${targetDB} thành công!`
    );
  } catch (error) {
    console.error('�� Error initializing database:', error);
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
 *
 * @param {number} quizId
 * @param {string} sourceDB
 * @param {string} targetDB
 * @param {Connection} sourceConn
 * @param {Connection} targetConn
 *
 * @returns {Promise<boolean>}
 * @description Copy quiz from source db to target db
 */
async function copyQuiz(quizId, sourceDB, targetDB, connection) {
  try {
    console.log(
      `🔄 Bắt đầu sao chép quiz ID: ${quizId} từ ${sourceDB} sang ${targetDB}...`
    );

    // 1️⃣ Sao chép thông tin Quiz
    console.log('📌 Sao chép quiz...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_quiz 
       SELECT * FROM \`${sourceDB}\`.mdl_quiz WHERE id = ?;`,
      [quizId]
    );

    // 2️⃣ Lấy ID khóa học chứa quiz
    const [quizInfo] = await connection.query(
      `SELECT course FROM \`${sourceDB}\`.mdl_quiz WHERE id = ?;`,
      [quizId]
    );
    if (quizInfo.length === 0) {
      console.error('❌ Không tìm thấy quiz.');
      return false;
    }
    const courseId = quizInfo[0].course;

    // 3️⃣ Sao chép khóa học
    console.log('📌 Sao chép khóa học...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_course 
       SELECT * FROM \`${sourceDB}\`.mdl_course WHERE id = ?;`,
      [courseId]
    );

    // 4️⃣ Sao chép Course Modules
    console.log('📌 Sao chép course_modules...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_course_modules 
       SELECT * FROM \`${sourceDB}\`.mdl_course_modules 
       WHERE instance = ? AND module = (SELECT id FROM \`${sourceDB}\`.mdl_modules);`,
      [quizId]
    );

    // 5️⃣ Sao chép Context (quản lý quyền)
    console.log('📌 Sao chép context...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_context 
       SELECT * FROM \`${sourceDB}\`.mdl_context WHERE instanceid = ? AND contextlevel = 50;`,
      [courseId]
    );

    // 6️⃣ Sao chép Câu hỏi (Questions)
    console.log('📌 Sao chép câu hỏi của quiz...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_question 
       SELECT * FROM \`${sourceDB}\`.mdl_question 
       WHERE id IN (SELECT questionid FROM \`${sourceDB}\`.mdl_quiz_slots WHERE quizid = ?);`,
      [quizId]
    );

    // 7️⃣ Sao chép Quiz Slots (liên kết câu hỏi với quiz)
    console.log('📌 Sao chép quiz_slots...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_quiz_slots 
       SELECT * FROM \`${sourceDB}\`.mdl_quiz_slots WHERE quizid = ?;`,
      [quizId]
    );

    // 8️⃣ Sao chép Câu trả lời (Question Answers)
    console.log('📌 Sao chép câu trả lời...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_question_answers 
       SELECT * FROM \`${sourceDB}\`.mdl_question_answers 
       WHERE question IN (SELECT id FROM \`${sourceDB}\`.mdl_question 
                          WHERE id IN (SELECT questionid FROM \`${sourceDB}\`.mdl_quiz_slots WHERE quizid = ?));`,
      [quizId]
    );

    // 9️⃣ Sao chép Quiz Attempts (kết quả làm bài)
    console.log('📌 Sao chép kết quả làm bài...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_quiz_attempts 
       SELECT * FROM \`${sourceDB}\`.mdl_quiz_attempts WHERE quiz = ?;`,
      [quizId]
    );

    // 🔟 Sao chép Events (lịch sự kiện của quiz)
    console.log('📌 Sao chép sự kiện lịch...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_event 
       SELECT * FROM \`${sourceDB}\`.mdl_event 
       WHERE instance = ? AND modulename = 'quiz';`,
      [quizId]
    );

    // 1️⃣1️⃣ Sao chép Users (tất cả người dùng trong khóa học)
    console.log('📌 Sao chép tất cả user trong khóa học...');
    await connection.query(
      `INSERT INTO \`${targetDB}\`.mdl_user 
       SELECT * FROM \`${sourceDB}\`.mdl_user 
       WHERE id IN (SELECT userid FROM \`${sourceDB}\`.mdl_role_assignments 
                    WHERE contextid IN (SELECT id FROM \`${sourceDB}\`.mdl_context WHERE instanceid = ? AND contextlevel = 50));`,
      [courseId]
    );

    console.log('✅ Hoàn tất sao chép quiz và tất cả dữ liệu liên quan!');
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi sao chép quiz:', error);
    return false;
  }
}
