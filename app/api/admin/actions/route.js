import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { handleActions } from '@/lib/moodle/actions/controls';

export const runtime = 'nodejs';

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { action, rooms } = await req.json();

  if (!action || !Array.isArray(rooms) || rooms.length === 0) {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 });
  }

  console.log('@POST /api/exam-rooms -- ' + action + ': ', rooms);

  const result = await handleActions(action, rooms);

  return NextResponse.json(result, { status: result.status });
}
