#!/usr/bin/env node

const crypto = require('crypto');
const axios = require('axios');

// Simulate a Close.io SMS webhook for testing
async function simulateInboundSMS(ngrokUrl) {
  const webhookUrl = `${ngrokUrl}/api/webhooks/close`;
  
  // Sample SMS webhook payload from Close.io
  const payload = {
    event: {
      id: "evt_test_" + Date.now(),
      type: "activity.sms.created",
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString(),
      organization_id: "orga_test123",
      user_id: "user_test123",
      request_id: "req_test123",
      api_key_id: "api_test123"
    },
    data: {
      id: "acti_test_" + Date.now(),
      organization_id: "orga_test123",
      lead_id: "lead_test123",
      direction: "inbound",
      status: "inbox",
      text: "Hello, I'm interested in scheduling an appointment",
      local_phone: "+1234567890",
      remote_phone: "+0987654321",
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString()
    }
  };
  
  console.log('📨 Simulating inbound SMS webhook...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  // Create signature (you'll need to set CLOSE_WEBHOOK_SECRET in your .env)
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);
  const secret = process.env.CLOSE_WEBHOOK_SECRET || 'test_secret';
  
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(signedContent).digest('hex');
  
  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'close-sig-hash': signature,
        'close-sig-timestamp': timestamp
      }
    });
    
    console.log('✅ Webhook sent successfully!');
    console.log('Response:', response.data);
    console.log('\n👀 Check your server logs for processing details...');
    
  } catch (error) {
    console.error('❌ Error sending webhook:', error.response?.data || error.message);
  }
}

const ngrokUrl = process.argv[2];
if (!ngrokUrl) {
  console.log('Usage: node scripts/test-sms-simulation.js https://your-ngrok-url.ngrok.io');
  process.exit(1);
}

simulateInboundSMS(ngrokUrl);