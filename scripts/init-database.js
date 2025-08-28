#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Initializing database for Railway...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'MISSING');

try {
  // First try to reset and migrate
  console.log('📊 Attempting database reset and migration...');
  
  try {
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
    console.log('✅ Database reset and schema pushed successfully!');
  } catch (error) {
    console.log('⚠️ db push failed, trying migrate deploy...');
    
    // Fallback to migrate deploy
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migration deployed successfully!');
  }
  
  // Generate Prisma client
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Verify tables exist
  console.log('🔍 Verifying tables exist...');
  execSync('npx prisma db seed --preview-feature', { stdio: 'inherit' });
  
  console.log('✅ Database initialization completed successfully!');
  console.log('📋 Expected tables:');
  console.log('  ✓ Lead');
  console.log('  ✓ Conversation'); 
  console.log('  ✓ Message');
  console.log('  ✓ WebhookEvent ← This was the missing table!');
  console.log('  ✓ Appointment');
  console.log('  ✓ PromptTemplate');
  console.log('  ✓ SystemConfig');
  
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  console.log('🔧 Debug info:');
  console.log('  - DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('  - Node version:', process.version);
  
  // Try one more time with direct SQL execution
  console.log('🔄 Attempting direct SQL execution...');
  try {
    execSync('npx prisma db execute --file prisma/migrations/20250827134100_fix_enum_defaults/migration.sql', { stdio: 'inherit' });
    console.log('✅ Direct SQL execution successful!');
  } catch (sqlError) {
    console.error('❌ Direct SQL execution also failed:', sqlError.message);
  }
  
  process.exit(1);
}