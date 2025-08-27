#!/usr/bin/env node

// Quick test to verify Railway connections
console.log('🔍 Testing Railway Environment...\n');

// Check critical environment variables
const criticalVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  WEBHOOK_ENDPOINT_URL: process.env.WEBHOOK_ENDPOINT_URL,
};

console.log('Environment Variables:');
Object.entries(criticalVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`❌ ${key}: NOT SET`);
  } else if (value.includes('localhost')) {
    console.log(`⚠️  ${key}: ${value} (USING LOCALHOST - WRONG FOR PRODUCTION!)`);
  } else {
    // Hide sensitive parts
    const displayValue = key.includes('URL') && value.includes('@') 
      ? value.replace(/:([^:@]*)@/, ':***@')
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  }
});

// Test database connection
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  prisma.$connect()
    .then(() => {
      console.log('\n✅ Database connection successful');
      return prisma.$disconnect();
    })
    .catch((error) => {
      console.log('\n❌ Database connection failed:', error.message);
    });
} else {
  console.log('\n⚠️  Skipping database test - DATABASE_URL not properly set');
}

// Test Redis connection  
if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('localhost')) {
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL);
  
  redis.ping()
    .then(() => {
      console.log('✅ Redis connection successful');
      redis.disconnect();
    })
    .catch((error) => {
      console.log('❌ Redis connection failed:', error.message);
    });
} else {
  console.log('⚠️  Skipping Redis test - REDIS_URL not properly set');
}