import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Simple runtime-only initialization - no complex validation
function createPrismaClient(): PrismaClient {
  // Skip during build
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return {} as PrismaClient;
  }

  const databaseUrl = process.env.DATABASE_URL;
  console.log('🔍 Creating Prisma client with DATABASE_URL:', databaseUrl?.substring(0, 50));
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export const prisma = global.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production' && process.env.SKIP_ENV_VALIDATION !== 'true') {
  global.__prisma = prisma;
}