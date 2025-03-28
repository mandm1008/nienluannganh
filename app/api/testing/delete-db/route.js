import { connectGCSQL } from '@/lib/cloud/sql/connect';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const connection = await connectGCSQL();

    // Lấy danh sách database có tên bắt đầu bằng "moodle" + số
    const [databases] = await connection.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name REGEXP '^moodle[0-9]+$';"
    );

    if (databases.length === 0) {
      console.log('✅ Không có database nào cần xóa.');
      await connection.end();
      return NextResponse.json({ message: 'False' }, { status: 200 });
    }

    // Xóa từng database một
    for (const db of databases) {
      const dbName = db.SCHEMA_NAME;
      console.log(`🗑️ Đang xóa database: ${dbName}`);
      await connection.query(`DROP DATABASE \`${dbName}\`;`);
    }

    console.log('✅ Đã xóa toàn bộ database có tên theo mẫu moodle<number>.');
    await connection.end();
  } catch (error) {
    console.error('❌ Lỗi khi xóa database:', error);
  }

  return NextResponse.json({ message: 'Success' }, { status: 200 });
}
