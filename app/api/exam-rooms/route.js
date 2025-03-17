import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import ExamRoom from '@/lib/db/models/ExamRoom.model';

export async function GET() {
  await connect();
  const rooms = await ExamRoom.find();
  return NextResponse.json(rooms);
}
