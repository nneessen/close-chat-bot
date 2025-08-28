import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL?.substring(0, 50) + '...',
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
}