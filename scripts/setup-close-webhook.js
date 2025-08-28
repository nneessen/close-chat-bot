#!/usr/bin/env node

const axios = require('axios');

async function setupWebhook() {
  const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
  const WEBHOOK_URL = process.env.WEBHOOK_ENDPOINT_URL;
  
  if (!CLOSE_API_KEY || !WEBHOOK_URL) {
    console.error('❌ Missing CLOSE_API_KEY or WEBHOOK_ENDPOINT_URL');
    process.exit(1);
  }

  console.log('🔧 Setting up Close.io webhook...');
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}/close`);

  try {
    // First, list existing webhooks
    const listResponse = await axios.get('https://api.close.com/api/v1/webhook/', {
      auth: {
        username: CLOSE_API_KEY,
        password: ''
      }
    });

    console.log(`📋 Found ${listResponse.data.data.length} existing webhooks`);
    
    // Show first webhook structure as example
    if (listResponse.data.data.length > 0) {
      console.log('Example webhook structure:', JSON.stringify(listResponse.data.data[0], null, 2));
    }

    // Check if our webhook already exists
    const existingWebhook = listResponse.data.data.find(
      w => w.url === `${WEBHOOK_URL}/close`
    );

    if (existingWebhook) {
      console.log('✅ Webhook already exists:', existingWebhook.id);
      return;
    }

    // Create new webhook - Close.io uses lowercase "activity.sms" for SMS events
    const createResponse = await axios.post('https://api.close.com/api/v1/webhook/', {
      url: `${WEBHOOK_URL}/close`,
      events: [
        {
          object_type: 'activity.sms',  // lowercase 'sms'
          action: 'created'
        },
        {
          object_type: 'activity.sms',  // lowercase 'sms'
          action: 'updated'
        },
        {
          object_type: 'lead',
          action: 'created'
        },
        {
          object_type: 'lead',
          action: 'updated'
        }
      ],
      status: 'active',
      verify_ssl: true
    }, {
      auth: {
        username: CLOSE_API_KEY,
        password: ''
      }
    });

    console.log('✅ Webhook created successfully!');
    console.log('📝 Webhook ID:', createResponse.data.id);
    console.log('🔑 Webhook Secret:', createResponse.data.verify_key);
    console.log('\n⚠️  IMPORTANT: Add this to your Railway environment:');
    console.log(`CLOSE_WEBHOOK_SECRET=${createResponse.data.verify_key}`);

  } catch (error) {
    console.error('❌ Error setting up webhook:', error.response?.data || error.message);
    process.exit(1);
  }
}

setupWebhook();