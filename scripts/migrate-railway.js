#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Running database migration for Railway...');

try {
  // Deploy migrations to production database
  console.log('📊 Deploying Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Generate Prisma client
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Database migration completed successfully!');
  console.log('📋 Tables that should now exist:');
  console.log('  - Lead');
  console.log('  - Conversation'); 
  console.log('  - Message');
  console.log('  - WebhookEvent');
  console.log('  - Appointment');
  console.log('  - PromptTemplate');
  console.log('  - SystemConfig');
  console.log('  - ConversationPattern');
  console.log('  - ConversationInsight');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}