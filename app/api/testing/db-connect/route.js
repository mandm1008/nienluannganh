import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';

export async function GET() {
  const isConnected = await connect();

  if (isConnected) {
    return NextResponse.json({ message: 'MongoDB Connected Successfully!' });
  } else {
    return NextResponse.json(
      { error: 'Failed to connect to MongoDB' },
      { status: 500 }
    );
  }
}
