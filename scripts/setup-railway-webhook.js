#!/usr/bin/env node

/**
 * Complete Railway webhook setup with verification
 */

const axios = require('axios');
require('dotenv').config();

const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const RAILWAY_URL = process.env.WEBHOOK_ENDPOINT_URL || process.env.NEXT_PUBLIC_APP_URL;

if (!CLOSE_API_KEY) {
  console.error('❌ Missing CLOSE_API_KEY');
  console.error('Set it: export CLOSE_API_KEY="api_YOUR_KEY"');
  process.exit(1);
}

if (!RAILWAY_URL) {
  console.error('❌ Missing WEBHOOK_ENDPOINT_URL or NEXT_PUBLIC_APP_URL');
  console.error('Set it: export WEBHOOK_ENDPOINT_URL="https://your-app.up.railway.app/api/webhooks"');
  process.exit(1);
}

const api = axios.create({
  baseURL: 'https://api.close.com/api/v1',
  auth: {
    username: CLOSE_API_KEY,
    password: ''
  }
});

async function setupRailwayWebhook() {
  console.log('🚀 Setting up Railway webhook\n');
  
  // Ensure URL is properly formatted
  let webhookUrl = RAILWAY_URL;
  if (!webhookUrl.includes('/api/webhooks')) {
    webhookUrl = webhookUrl.replace(/\/$/, '') + '/api/webhooks/close';
  } else if (!webhookUrl.endsWith('/close')) {
    webhookUrl = webhookUrl.replace(/\/$/, '') + '/close';
  }
  
  console.log('📍 Webhook URL:', webhookUrl);
  console.log('━'.repeat(50));
  
  try {
    // Step 1: Check for existing Railway webhook
    console.log('\n1️⃣  Checking for existing Railway webhook...');
    const listResponse = await api.get('/webhook/');
    const existingWebhook = listResponse.data.data.find(w => w.url === webhookUrl);
    
    if (existingWebhook) {
      console.log('✅ Webhook already exists!');
      console.log('   ID:', existingWebhook.id);
      console.log('   Status:', existingWebhook.status);
      
      if (existingWebhook.status !== 'active') {
        console.log('\n⚠️  Webhook exists but is not active.');
        console.log('Consider deleting and recreating it.');
      }
      
      return existingWebhook;
    }
    
    // Step 2: Create new webhook
    console.log('❌ No existing webhook found.');
    console.log('\n2️⃣  Creating new webhook...');
    
    const webhookData = {
      url: webhookUrl,
      events: [
        {
          object_type: 'activity.sms',
          action: 'created'
        }
      ],
      status: 'active',
      verify_ssl: true
    };
    
    console.log('Configuration:', JSON.stringify(webhookData, null, 2));
    
    const createResponse = await api.post('/webhook/', webhookData);
    const newWebhook = createResponse.data;
    
    console.log('\n✅ Webhook created successfully!');
    console.log('━'.repeat(50));
    console.log('WEBHOOK DETAILS:');
    console.log('ID:', newWebhook.id);
    console.log('URL:', newWebhook.url);
    console.log('Status:', newWebhook.status);
    
    // The secret is in the response when first created
    // Try multiple possible field names
    const possibleSecretFields = [
      'verify_key',
      'signature_key', 
      'secret',
      'sig_key',
      'verification_key',
      'signing_key'
    ];
    
    let secretFound = false;
    for (const field of possibleSecretFields) {
      if (newWebhook[field]) {
        console.log('\n🔐 WEBHOOK SECRET FOUND!');
        console.log('━'.repeat(50));
        console.log(`Secret (${field}):`, newWebhook[field]);
        console.log('\n⚠️  SAVE THIS SECRET - IT WON\'T BE SHOWN AGAIN!');
        console.log('Add to Railway environment:');
        console.log(`CLOSE_WEBHOOK_SECRET=${newWebhook[field]}`);
        console.log('━'.repeat(50));
        secretFound = true;
        break;
      }
    }
    
    if (!secretFound) {
      console.log('\n⚠️  WARNING: Webhook secret not found in response.');
      console.log('The webhook was created but the secret wasn\'t returned.');
      console.log('Full response for debugging:');
      console.log(JSON.stringify(newWebhook, null, 2));
      console.log('\nSince signature verification is disabled in your code,');
      console.log('the webhook should still work without the secret.');
    }
    
    // Step 3: Verify webhook was created
    console.log('\n3️⃣  Verifying webhook creation...');
    const verifyResponse = await api.get('/webhook/');
    const verifiedWebhook = verifyResponse.data.data.find(w => w.url === webhookUrl);
    
    if (verifiedWebhook) {
      console.log('✅ Webhook verified in Close.io!');
      console.log('   ID:', verifiedWebhook.id);
      console.log('   Status:', verifiedWebhook.status);
    } else {
      console.log('⚠️  Webhook created but not found in list.');
      console.log('This might be a caching issue. Wait a moment and check again.');
    }
    
    // Step 4: Next steps
    console.log('\n📝 NEXT STEPS:');
    console.log('━'.repeat(50));
    console.log('1. If you found the secret, add it to Railway environment');
    console.log('2. Ensure your Railway app is deployed and running');
    console.log('3. Test by sending an SMS to your Close.io phone number');
    console.log('4. Check Railway logs for webhook activity');
    console.log('\n💡 Debug Commands:');
    console.log('   Check health: curl', webhookUrl.replace('/api/webhooks/close', '/api/health'));
    console.log('   View logs: railway logs');
    console.log('━'.repeat(50));
    
    return newWebhook;
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.data?.errors) {
      console.error('Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    }
    
    if (error.response?.status === 401) {
      console.error('\n⚠️  Authentication failed. Check your CLOSE_API_KEY.');
    }
    
    process.exit(1);
  }
}

setupRailwayWebhook();