import { NextResponse } from "next/server";
import { connectGCSQL } from "@/lib/cloud/sql/connect";

export async function GET() {
  try {
    const connection = await connectGCSQL();
    if (!connection) {
      throw new Error("Không thể tạo kết nối đến database.");
    }

    // Kiểm tra truy vấn thử (tùy vào database, có thể đổi lệnh này)
    const [rows] = await connection.execute("SELECT NOW() AS currentTime;");
    await connection.end();

    return NextResponse.json({
      message: "Kết nối thành công!",
      serverTime: rows[0].currentTime,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Lỗi không xác định khi kết nối database" },
      { status: 500 }
    );
  }
}
