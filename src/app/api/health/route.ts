import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { closeService } from '@/services/close';
import { redis } from '@/lib/queue';
import env from '@/lib/env';

export const dynamic = 'force-dynamic'; // Prevent static generation

export async function GET() {
  // Skip health check during build
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return NextResponse.json({
      status: 'building',
      message: 'Health check skipped during build'
    });
  }

  const checks = {
    database: { status: 'unknown' as 'ok' | 'error' | 'unknown', details: '' },
    redis: { status: 'unknown' as 'ok' | 'error' | 'unknown', details: '' },
    closeio: { status: 'unknown' as 'ok' | 'error' | 'unknown', details: '' },
    environment: { status: 'unknown' as 'ok' | 'error' | 'unknown', details: '' },
    bot: { status: 'unknown' as 'ok' | 'error' | 'unknown', details: '', enabled: false },
  };

  // Database check with comprehensive URL debugging
  try {
    const dbUrls = {
      DATABASE_URL: process.env.DATABASE_URL,
      RAILWAY_DATABASE_URL: process.env.RAILWAY_DATABASE_URL,
      DATABASE_PRIVATE_URL: process.env.DATABASE_PRIVATE_URL,
      POSTGRES_URL: process.env.POSTGRES_URL,
    };
    
    console.log('🔍 All database URLs available:', Object.entries(dbUrls)
      .filter(([, url]) => url)
      .map(([key, url]) => `${key}: ${url?.substring(0, 50)}...`)
      .join(', '));
    
    console.log('🔍 SKIP_ENV_VALIDATION:', process.env.SKIP_ENV_VALIDATION);
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    
    await prisma.$queryRaw`SELECT 1`;
    checks.database.status = 'ok';
    checks.database.details = `Connected successfully. URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`;
  } catch (error) {
    checks.database.status = 'error';
    checks.database.details = error instanceof Error ? error.message : 'Database connection failed';
    console.error('❌ Database connection error:', error);
    console.log('🔍 Full error details:', JSON.stringify(error, null, 2));
  }

  // Redis check
  try {
    const redisConnection = redis();
    await redisConnection.ping();
    checks.redis.status = 'ok';
    checks.redis.details = 'Connected to Redis successfully';
  } catch (error) {
    checks.redis.status = 'error';
    checks.redis.details = error instanceof Error ? error.message : 'Redis connection failed';
  }

  // Close.io API check
  try {
    // Simple test to check if API key works
    await closeService.getWebhookSubscriptions();
    checks.closeio.status = 'ok';
    checks.closeio.details = 'Close.io API key is valid and working';
  } catch (error) {
    checks.closeio.status = 'error';
    checks.closeio.details = error instanceof Error ? error.message : 'Close.io API connection failed';
  }

  // Environment variables check
  try {
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL', 
      'CLOSE_API_KEY',
      'CLOSE_WEBHOOK_SECRET',
      'WEBHOOK_ENDPOINT_URL',
      'LLM_PROVIDER'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      checks.environment.status = 'error';
      checks.environment.details = `Missing environment variables: ${missingVars.join(', ')}`;
    } else {
      checks.environment.status = 'ok';
      checks.environment.details = 'All required environment variables are set';
    }
  } catch (error) {
    checks.environment.status = 'error';
    checks.environment.details = error instanceof Error ? error.message : 'Environment check failed';
  }

  // Bot status check
  try {
    const botConfig = await prisma.systemConfig.findUnique({
      where: { key: 'bot_enabled' }
    });
    const isEnabled = botConfig?.value === true;
    checks.bot.status = 'ok';
    checks.bot.enabled = isEnabled;
    checks.bot.details = isEnabled ? 'Bot is enabled and will respond to SMS' : 'Bot is disabled and will not respond to SMS';
  } catch (error) {
    checks.bot.status = 'error';
    checks.bot.details = error instanceof Error ? error.message : 'Bot status check failed';
  }

  // Overall health status
  const allOk = Object.values(checks).every(check => check.status === 'ok');
  const status = allOk ? 200 : 503;

  const response = {
    status: allOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    deployment: {
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    },
    urls: {
      webhook: process.env.WEBHOOK_ENDPOINT_URL,
      app: process.env.NEXT_PUBLIC_APP_URL,
    }
  };

  console.log('🏥 Health check results:', JSON.stringify(response, null, 2));

  return NextResponse.json(response, { status });
}