import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const debugInfo = {
    environment: process.env.NODE_ENV,
    skipValidation: process.env.SKIP_ENV_VALIDATION,
    availableUrls: {
      DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : null,
      RAILWAY_DATABASE_URL: process.env.RAILWAY_DATABASE_URL ? `${process.env.RAILWAY_DATABASE_URL.substring(0, 50)}...` : null,
      DATABASE_PRIVATE_URL: process.env.DATABASE_PRIVATE_URL ? `${process.env.DATABASE_PRIVATE_URL.substring(0, 50)}...` : null,
      POSTGRES_URL: process.env.POSTGRES_URL ? `${process.env.POSTGRES_URL.substring(0, 50)}...` : null,
    },
    connectionTests: [] as Array<{ url: string; status: string; error?: string }>
  };

  // Test each available URL individually
  const urls = [
    { name: 'DATABASE_URL', url: process.env.DATABASE_URL },
    { name: 'RAILWAY_DATABASE_URL', url: process.env.RAILWAY_DATABASE_URL },
    { name: 'DATABASE_PRIVATE_URL', url: process.env.DATABASE_PRIVATE_URL },
    { name: 'POSTGRES_URL', url: process.env.POSTGRES_URL },
  ].filter(({ url }) => url);

  for (const { name, url } of urls) {
    try {
      const testClient = new PrismaClient({
        datasources: {
          db: {
            url: url!
          }
        },
        log: ['error', 'warn']
      });

      await testClient.$queryRaw`SELECT 1`;
      await testClient.$disconnect();
      
      debugInfo.connectionTests.push({
        url: `${name}: ${url!.substring(0, 50)}...`,
        status: 'success'
      });
    } catch (error) {
      debugInfo.connectionTests.push({
        url: `${name}: ${url!.substring(0, 50)}...`,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return NextResponse.json(debugInfo, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}