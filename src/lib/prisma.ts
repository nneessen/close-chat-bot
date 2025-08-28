import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Force Railway DATABASE_URL to override any local .env settings
function getValidDatabaseUrl(): string {
  // In production (Railway), prioritize environment over .env file
  let databaseUrl = process.env.DATABASE_URL;
  
  // Additional Railway-specific environment variable patterns
  if (!databaseUrl || databaseUrl.includes('localhost')) {
    // Check Railway-specific patterns
    databaseUrl = process.env.RAILWAY_DATABASE_URL || 
                 process.env.DATABASE_PRIVATE_URL ||
                 process.env.POSTGRES_URL ||
                 process.env.DATABASE_URL;
  }
  
  // Final validation - if still localhost in production, something's wrong
  if (process.env.NODE_ENV === 'production' && databaseUrl?.includes('localhost')) {
    console.error('🚨 CRITICAL: Production environment using localhost database!');
    console.error('🔍 All environment variables:', {
      DATABASE_URL: process.env.DATABASE_URL,
      RAILWAY_DATABASE_URL: process.env.RAILWAY_DATABASE_URL,
      DATABASE_PRIVATE_URL: process.env.DATABASE_PRIVATE_URL,
      POSTGRES_URL: process.env.POSTGRES_URL,
      NODE_ENV: process.env.NODE_ENV
    });
    throw new Error('Production environment cannot use localhost database');
  }
  
  if (!databaseUrl) {
    throw new Error('No DATABASE_URL found in environment variables');
  }
  
  return databaseUrl;
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
          const dbUrl = getValidDatabaseUrl();
          console.log('🔍 Using DATABASE_URL:', dbUrl.substring(0, 50) + '...');
          prismaInstance = new PrismaClient({
            datasources: {
              db: {
                url: dbUrl
              }
            },
            log: ['error', 'warn']
          });
        }
        return (prismaInstance as unknown as Record<string | symbol, unknown>)[prop];
      }
    });
  }
  
  // Runtime initialization with forced URL
  if (!prismaInstance) {
    const dbUrl = getValidDatabaseUrl();
    console.log('🔍 Initializing Prisma with DATABASE_URL:', dbUrl.substring(0, 50) + '...');
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      },
      log: ['error', 'warn']
    });
  }
  
  return prismaInstance;
}

export const prisma = global.__prisma || getPrismaClient();

if (process.env.NODE_ENV !== 'production' && process.env.SKIP_ENV_VALIDATION !== 'true') {
  global.__prisma = prisma;
}