import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/tools/files';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  const baseUrl = searchParams.get('baseurl') || undefined;
  const token = searchParams.get('token') || undefined;

  console.log('FileName: ' + filename);
  console.log('BASEURL: ' + baseUrl);
  console.log('Token: ' + token);

  const uploadRes = await uploadFile(filename, { baseUrl, token });

  return NextResponse.json({ uploadRes }, { status: 200 });
}
