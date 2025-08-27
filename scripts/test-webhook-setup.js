#!/usr/bin/env node

const { closeService } = require('../dist/services/close.js');

async function setupWebhookForTesting() {
  console.log('🔧 Setting up Close.io webhook for SMS testing...\n');
  
  try {
    // First, let's see existing webhooks
    console.log('📋 Checking existing webhooks...');
    const existingWebhooks = await closeService.getWebhookSubscriptions();
    console.log(`Found ${existingWebhooks.length} existing webhooks:`, existingWebhooks);
    
    // You'll need to set your ngrok URL here
    const ngrokUrl = process.argv[2];
    if (!ngrokUrl) {
      console.log('\n❌ Please provide your ngrok URL as an argument:');
      console.log('node scripts/test-webhook-setup.js https://your-ngrok-url.ngrok.io');
      process.exit(1);
    }
    
    const webhookUrl = `${ngrokUrl}/api/webhooks/close`;
    
    console.log(`\n🚀 Creating webhook subscription for: ${webhookUrl}`);
    
    // Create webhook for SMS activities
    const webhook = await closeService.createWebhookSubscription(
      webhookUrl,
      ['activity.sms.created'] // Listen for new SMS activities
    );
    
    console.log('✅ Webhook created successfully!');
    console.log('Webhook details:', webhook);
    
    console.log('\n📱 Now you can test by:');
    console.log('1. Send an SMS to one of your Close.io phone numbers');
    console.log('2. Watch your server logs for webhook events');
    console.log('3. Check if the bot responds via SMS');
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    process.exit(1);
  }
}

setupWebhookForTesting();