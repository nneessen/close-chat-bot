import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Only log in runtime, not during build
if (typeof window === 'undefined' && !process.env.SKIP_ENV_VALIDATION) {
  console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:([^:@]*)@/, ':***@'));
}

// Lazy initialization - don't connect during build
export const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}