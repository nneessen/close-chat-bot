import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// CRITICAL: Force log DATABASE_URL at runtime to debug Railway issue
console.log('🔍 RUNTIME DATABASE_URL:', process.env.DATABASE_URL);
console.log('🔍 SKIP_ENV_VALIDATION:', process.env.SKIP_ENV_VALIDATION);

// CRITICAL: Force Prisma to use runtime DATABASE_URL, not build-time cached value
export const prisma = global.__prisma || new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL  // Force runtime DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}