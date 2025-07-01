import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/moodle/restore';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');

  console.log('FileName: ' + filename);

  const uploadRes = await uploadFile(filename);

  return NextResponse.json({ uploadRes }, { status: 200 });
}
