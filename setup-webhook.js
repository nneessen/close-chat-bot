#!/usr/bin/env node

import { closeService } from './src/services/close.js';

async function setupWebhook() {
  console.log('🔧 Setting up Close.io webhook for SMS testing...\n');
  
  try {
    const ngrokUrl = process.argv[2];
    if (!ngrokUrl) {
      console.log('❌ Please provide your ngrok URL:');
      console.log('node setup-webhook.js https://f39e300cde29.ngrok-free.app');
      process.exit(1);
    }
    
    // Check existing webhooks
    console.log('📋 Checking existing webhooks...');
    const existingWebhooks = await closeService.getWebhookSubscriptions();
    console.log(`Found ${existingWebhooks.length} existing webhooks`);
    
    const webhookUrl = `${ngrokUrl}/api/webhooks/close`;
    console.log(`🚀 Creating webhook: ${webhookUrl}`);
    
    // Create webhook for SMS activities
    const webhook = await closeService.createWebhookSubscription(
      webhookUrl,
      ['activity.sms.created']
    );
    
    console.log('✅ Webhook created successfully!');
    console.log('Webhook ID:', webhook.id);
    
    console.log('\n📱 Next Steps:');
    console.log('1. Send an SMS to your Close.io phone number');
    console.log('2. Watch the terminal where "npm run dev" is running for logs');
    console.log('3. Check if the bot responds via SMS');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupWebhook();