import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// DON'T create Prisma client during build time
let prismaInstance: PrismaClient | undefined;

function getPrismaClient() {
  // During build, skip Prisma initialization
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.log('⏭️ Skipping Prisma initialization during build');
    // Return a proxy that will lazy-initialize on first use
    return new Proxy({} as PrismaClient, {
      get(target, prop) {
        if (!prismaInstance) {
          console.log('🔍 Lazy-initializing Prisma at runtime');
          console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
          prismaInstance = new PrismaClient({
            log: ['error', 'warn']
          });
        }
        return (prismaInstance as unknown as Record<string | symbol, unknown>)[prop];
      }
    });
  }
  
  // Runtime initialization
  if (!prismaInstance) {
    console.log('🔍 Initializing Prisma with DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    prismaInstance = new PrismaClient({
      log: ['error', 'warn']
    });
  }
  
  return prismaInstance;
}

export const prisma = global.__prisma || getPrismaClient();

if (process.env.NODE_ENV !== 'production' && process.env.SKIP_ENV_VALIDATION !== 'true') {
  global.__prisma = prisma;
}