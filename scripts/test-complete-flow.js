#!/usr/bin/env node

const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

async function testCompleteSMSFlow() {
  console.log('🧪 Testing Complete SMS Chatbot Flow\n');
  
  const baseUrl = 'http://localhost:3001';
  const webhookSecret = process.env.CLOSE_WEBHOOK_SECRET || 'test_secret_123';
  
  // Test 1: Appointment Bot Trigger
  console.log('📱 Test 1: Appointment Bot (keyword: "appointment")');
  await testSMSWebhook(baseUrl, webhookSecret, {
    text: "Hello, I'd like to schedule an appointment",
    leadId: "lead_test_appointment",
    phone: "+1234567890"
  });
  
  console.log('\n⏳ Waiting 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Objection Handler Bot
  console.log('📱 Test 2: Objection Handler Bot (general inquiry)');
  await testSMSWebhook(baseUrl, webhookSecret, {
    text: "I'm not sure if I need life insurance right now",
    leadId: "lead_test_objection",
    phone: "+0987654321"
  });
  
  console.log('\n⏳ Waiting 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: Follow-up Message (Conversation Context)
  console.log('📱 Test 3: Follow-up Message (testing conversation context)');
  await testSMSWebhook(baseUrl, webhookSecret, {
    text: "Tell me more about the benefits",
    leadId: "lead_test_objection", // Same lead to test conversation context
    phone: "+0987654321"
  });
  
  console.log('\n✅ Test sequence completed!');
  console.log('\n📋 What to check:');
  console.log('1. Server logs for webhook processing');
  console.log('2. Database records in Lead, Conversation, Message tables');
  console.log('3. Check if bot determined correct botType (APPOINTMENT vs OBJECTION_HANDLER)');
  console.log('4. Look for LLM response generation');
  console.log('5. Verify SMS sending attempts via Close.io API');
}

async function testSMSWebhook(baseUrl, webhookSecret, { text, leadId, phone }) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  const payload = {
    event: {
      id: `evt_test_${Date.now()}`,
      type: "activity.sms.created",
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString(),
      organization_id: process.env.CLOSE_ORGANIZATION_ID || "orga_test123",
      user_id: "user_test123",
      request_id: "req_test123",
      api_key_id: "api_test123"
    },
    data: {
      id: `acti_test_${Date.now()}`,
      organization_id: process.env.CLOSE_ORGANIZATION_ID || "orga_test123",
      lead_id: leadId,
      direction: "inbound",
      status: "inbox",
      text: text,
      local_phone: "+18723127425", // Your Close.io number
      remote_phone: phone,
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString()
    }
  };
  
  const body = JSON.stringify(payload);
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto.createHmac('sha256', webhookSecret).update(signedContent).digest('hex');
  
  console.log(`   📧 Sending: "${text}"`);
  console.log(`   📞 From: ${phone} → ${payload.data.local_phone}`);
  
  try {
    const response = await axios.post(`${baseUrl}/api/webhooks/close`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'close-sig-hash': signature,
        'close-sig-timestamp': timestamp
      },
      timeout: 10000
    });
    
    console.log(`   ✅ Webhook accepted: ${response.status}`);
    console.log(`   📝 Event ID: ${response.data.eventId}`);
    
    // Give time for queue processing
    console.log('   ⏳ Processing...');
    
  } catch (error) {
    console.error(`   ❌ Webhook failed:`, error.response?.data || error.message);
  }
}

// Check if server is running
async function checkServerHealth() {
  try {
    const response = await axios.get('http://localhost:3001/api/webhooks/close', { timeout: 5000 });
    return false; // Should return 405 for GET
  } catch (error) {
    if (error.response?.status === 405) {
      return true; // Server is running
    }
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if server is running...');
  const isRunning = await checkServerHealth();
  
  if (!isRunning) {
    console.log('❌ Server not running on localhost:3001');
    console.log('Please run: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  // Check required env vars
  const requiredVars = ['CLOSE_API_KEY', 'ANTHROPIC_API_KEY', 'DATABASE_URL', 'REDIS_URL'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.log('⚠️  Missing environment variables:', missing.join(', '));
    console.log('Some features may not work properly\n');
  }
  
  await testCompleteSMSFlow();
}

main().catch(console.error);