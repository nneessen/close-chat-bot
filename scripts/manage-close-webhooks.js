#!/usr/bin/env node

/**
 * Close.io Webhook Management Script
 * 
 * Usage:
 *   node manage-close-webhooks.js list                    - List all webhooks
 *   node manage-close-webhooks.js create <url>            - Create new webhook
 *   node manage-close-webhooks.js delete <webhook-id>     - Delete webhook
 *   node manage-close-webhooks.js delete-all              - Delete all webhooks
 *   node manage-close-webhooks.js setup-production        - Setup for Railway
 */

const axios = require('axios');
require('dotenv').config();

const CLOSE_API_KEY = process.env.CLOSE_API_KEY;

if (!CLOSE_API_KEY) {
  console.error('❌ Missing CLOSE_API_KEY environment variable');
  console.error('Set it in .env file or export it:');
  console.error('export CLOSE_API_KEY="api_YOUR_KEY"');
  process.exit(1);
}

const api = axios.create({
  baseURL: 'https://api.close.com/api/v1',
  auth: {
    username: CLOSE_API_KEY,
    password: ''
  }
});

async function listWebhooks() {
  console.log('📋 Listing all webhooks...\n');
  
  try {
    const response = await api.get('/webhook/');
    const webhooks = response.data.data;
    
    if (webhooks.length === 0) {
      console.log('No webhooks found.');
      return [];
    }
    
    webhooks.forEach((webhook, index) => {
      console.log(`Webhook ${index + 1}:`);
      console.log(`  ID: ${webhook.id}`);
      console.log(`  URL: ${webhook.url}`);
      console.log(`  Status: ${webhook.status}`);
      console.log(`  Events:`);
      webhook.events.forEach(event => {
        console.log(`    - ${event.object_type}.${event.action}`);
      });
      
      // Try different possible field names for the secret
      const secret = webhook.verify_key || webhook.signature_key || webhook.secret || webhook.sig_key;
      if (secret) {
        console.log(`  Secret/Verify Key: ${secret}`);
        console.log(`  💡 Use this in Railway: CLOSE_WEBHOOK_SECRET=${secret}`);
      } else {
        console.log('  Secret: Not found in response');
        console.log('  Full webhook data:', JSON.stringify(webhook, null, 2));
      }
      
      console.log(`  Created: ${webhook.date_created}`);
      console.log('---');
    });
    
    return webhooks;
  } catch (error) {
    console.error('❌ Error listing webhooks:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function createWebhook(url) {
  console.log(`🚀 Creating webhook for URL: ${url}\n`);
  
  try {
    // Check if webhook already exists
    const existing = await api.get('/webhook/');
    const existingWebhook = existing.data.data.find(w => w.url === url);
    
    if (existingWebhook) {
      console.log('⚠️  Webhook already exists for this URL:');
      console.log(`  ID: ${existingWebhook.id}`);
      console.log(`  Status: ${existingWebhook.status}`);
      console.log(`  Secret: ${existingWebhook.verify_key}`);
      return existingWebhook;
    }
    
    // Create new webhook with correct event format
    const webhookData = {
      url: url,
      events: [
        {
          object_type: 'activity.sms',  // lowercase 'sms'
          action: 'created'
        }
      ],
      status: 'active',
      verify_ssl: true
    };
    
    console.log('Creating webhook with configuration:', JSON.stringify(webhookData, null, 2));
    
    const response = await api.post('/webhook/', webhookData);
    const webhook = response.data;
    
    console.log('✅ Webhook created successfully!');
    console.log('Full response:', JSON.stringify(webhook, null, 2));
    console.log(`  ID: ${webhook.id}`);
    console.log(`  URL: ${webhook.url}`);
    console.log(`  Secret: ${webhook.verify_key || webhook.signature_key || webhook.secret || 'Check full response above'}`);
    
    if (webhook.verify_key || webhook.signature_key || webhook.secret) {
      const secret = webhook.verify_key || webhook.signature_key || webhook.secret;
      console.log('\n⚠️  IMPORTANT: Save this webhook secret in your environment:');
      console.log(`CLOSE_WEBHOOK_SECRET=${secret}`);
    } else {
      console.log('\n⚠️  WARNING: Could not find webhook secret in response.');
      console.log('Check the full response above for the secret field.');
    }
    
    return webhook;
  } catch (error) {
    console.error('❌ Error creating webhook:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    }
    process.exit(1);
  }
}

async function deleteWebhook(webhookId) {
  console.log(`🗑️  Deleting webhook: ${webhookId}\n`);
  
  try {
    await api.delete(`/webhook/${webhookId}/`);
    console.log('✅ Webhook deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting webhook:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function deleteAllWebhooks() {
  console.log('🗑️  Deleting ALL webhooks...\n');
  
  const webhooks = await listWebhooks();
  
  if (webhooks.length === 0) {
    console.log('No webhooks to delete.');
    return;
  }
  
  console.log(`\n⚠️  This will delete ${webhooks.length} webhook(s).`);
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  for (const webhook of webhooks) {
    await deleteWebhook(webhook.id);
  }
  
  console.log('\n✅ All webhooks deleted!');
}

async function setupProduction() {
  const productionUrl = process.env.WEBHOOK_ENDPOINT_URL || process.env.NEXT_PUBLIC_APP_URL;
  
  if (!productionUrl) {
    console.error('❌ Missing WEBHOOK_ENDPOINT_URL or NEXT_PUBLIC_APP_URL');
    console.error('Set your Railway production URL in .env:');
    console.error('WEBHOOK_ENDPOINT_URL=https://your-app.up.railway.app/api/webhooks');
    process.exit(1);
  }
  
  // Ensure URL ends with /api/webhooks/close
  let webhookUrl = productionUrl;
  if (!webhookUrl.includes('/api/webhooks')) {
    webhookUrl = webhookUrl.replace(/\/$/, '') + '/api/webhooks/close';
  } else if (!webhookUrl.endsWith('/close')) {
    webhookUrl = webhookUrl.replace(/\/$/, '') + '/close';
  }
  
  console.log('🚀 Setting up production webhook...');
  console.log(`URL: ${webhookUrl}\n`);
  
  const webhook = await createWebhook(webhookUrl);
  
  const secret = webhook.verify_key || webhook.signature_key || webhook.secret;
  if (secret) {
    console.log('\n📝 Next Steps:');
    console.log('1. Add the webhook secret to Railway environment:');
    console.log(`   CLOSE_WEBHOOK_SECRET=${secret}`);
    console.log('2. Redeploy your Railway app');
    console.log('3. Test by sending an SMS to your Close.io phone number');
  } else {
    console.log('\n⚠️  WARNING: Could not find webhook secret. Check the webhook details above.');
  }
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  switch (command) {
    case 'list':
      await listWebhooks();
      break;
      
    case 'create':
      if (!arg) {
        console.error('❌ Please provide a webhook URL');
        console.error('Usage: node manage-close-webhooks.js create https://your-domain.com/api/webhooks/close');
        process.exit(1);
      }
      await createWebhook(arg);
      break;
      
    case 'delete':
      if (!arg) {
        console.error('❌ Please provide a webhook ID');
        console.error('Usage: node manage-close-webhooks.js delete webhook_123...');
        process.exit(1);
      }
      await deleteWebhook(arg);
      break;
      
    case 'delete-all':
      await deleteAllWebhooks();
      break;
      
    case 'setup-production':
    case 'setup':
      await setupProduction();
      break;
      
    default:
      console.log('Close.io Webhook Management\n');
      console.log('Commands:');
      console.log('  list                 - List all webhooks');
      console.log('  create <url>         - Create new webhook');
      console.log('  delete <webhook-id>  - Delete specific webhook');
      console.log('  delete-all           - Delete all webhooks');
      console.log('  setup-production     - Setup for Railway deployment');
      console.log('\nExamples:');
      console.log('  node manage-close-webhooks.js list');
      console.log('  node manage-close-webhooks.js create https://app.railway.app/api/webhooks/close');
      console.log('  node manage-close-webhooks.js delete webhook_abc123');
      console.log('  node manage-close-webhooks.js setup-production');
      break;
  }
}

main().catch(console.error);