import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasCloseApiKey: !!process.env.CLOSE_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasRedisUrl: !!process.env.REDIS_URL,
    }
  });
}

export async function POST() {
  console.log('🧪 Test POST endpoint hit');
  
  return NextResponse.json({
    status: 'ok',
    message: 'Test POST working',
    timestamp: new Date().toISOString()
  });
}