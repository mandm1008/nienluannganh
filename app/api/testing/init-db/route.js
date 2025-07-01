import { initDatabase } from '@/lib/cloud/sql/moodle';
import { NextResponse } from 'next/server';

export async function GET() {
  const res = await initDatabase(2, 'moodle1742539983418');

  return NextResponse.json({ message: 'Success' }, { status: 200 });
}
