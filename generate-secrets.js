#!/usr/bin/env node

/**
 * Generate 32-character secrets for Railway deployment
 * Usage: node generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret() {
  return crypto.randomBytes(16).toString('hex'); // 16 bytes = 32 hex characters
}

console.log('🔐 Generated 32-character secrets for Railway deployment:\n');

console.log('# Required 32-character secrets:');
console.log(`JWT_SECRET="${generateSecret()}"`);
console.log(`ENCRYPTION_KEY="${generateSecret()}"`);

console.log('\n# Recommended 32-character webhook secrets:');
console.log(`CLOSE_WEBHOOK_SECRET="${generateSecret()}"`);
console.log(`CALENDLY_WEBHOOK_SECRET="${generateSecret()}"`);

console.log('\n📝 Copy these to your Railway environment variables.');
console.log('⚠️  Note: CLOSE_WEBHOOK_SECRET should match the secret used when creating Close.io webhooks.');
console.log('⚠️  Note: CALENDLY_WEBHOOK_SECRET should match the secret used when creating Calendly webhooks.');