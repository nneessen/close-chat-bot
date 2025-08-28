#!/usr/bin/env node

/**
 * Find the Railway webhook in your Close.io account
 */

const axios = require('axios');
require('dotenv').config();

const CLOSE_API_KEY = process.env.CLOSE_API_KEY;

if (!CLOSE_API_KEY) {
  console.error('❌ Missing CLOSE_API_KEY environment variable');
  process.exit(1);
}

async function findRailwayWebhook() {
  try {
    const response = await axios.get('https://api.close.com/api/v1/webhook/', {
      auth: {
        username: CLOSE_API_KEY,
        password: ''
      }
    });
    
    const webhooks = response.data.data;
    console.log(`\n📋 Found ${webhooks.length} total webhooks\n`);
    
    // Look for Railway webhook
    const railwayWebhook = webhooks.find(w => 
      w.url && (
        w.url.includes('railway.app') || 
        w.url.includes('close-chat-bot')
      )
    );
    
    if (railwayWebhook) {
      console.log('✅ Found Railway webhook!');
      console.log('━'.repeat(50));
      console.log('ID:', railwayWebhook.id);
      console.log('URL:', railwayWebhook.url);
      console.log('Status:', railwayWebhook.status);
      console.log('Events:');
      railwayWebhook.events?.forEach(e => {
        console.log(`  - ${e.object_type}.${e.action}`);
      });
      console.log('━'.repeat(50));
      
      // Check if it's active
      if (railwayWebhook.status !== 'active') {
        console.log('\n⚠️  WARNING: Webhook is not active!');
        console.log('The webhook exists but is disabled.');
      }
      
      // Check if it has SMS events
      const hasSmsEvents = railwayWebhook.events?.some(e => 
        e.object_type === 'activity.sms' || 
        e.object_type === 'activity.SMS'
      );
      
      if (!hasSmsEvents) {
        console.log('\n⚠️  WARNING: Webhook doesn\'t have SMS events!');
        console.log('The webhook exists but won\'t receive SMS messages.');
      }
      
      return railwayWebhook;
    } else {
      console.log('❌ No Railway webhook found!');
      console.log('\nAll webhooks are pointing to:');
      webhooks.forEach((w, i) => {
        console.log(`${i + 1}. ${w.url}`);
      });
      
      console.log('\n💡 You need to create a new webhook for Railway:');
      console.log('Run: node scripts/manage-close-webhooks.js setup-production');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

findRailwayWebhook();