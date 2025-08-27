import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Debug: Log the DATABASE_URL being used (without password)
console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:([^:@]*)@/, ':***@'));

export const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}