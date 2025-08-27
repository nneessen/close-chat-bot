#!/usr/bin/env node

// Test database connections
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

async function testConnections() {
  console.log('🔍 Testing database connections...\n');
  
  // Test PostgreSQL
  try {
    console.log('Testing PostgreSQL connection...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ PostgreSQL connection successful');
    await prisma.$disconnect();
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
  }
  
  // Test Redis
  try {
    console.log('Testing Redis connection...');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    console.log('✅ Redis connection successful');
    redis.disconnect();
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
  }
  
  console.log('\n🎉 Connection tests complete!');
}

testConnections().catch(console.error);