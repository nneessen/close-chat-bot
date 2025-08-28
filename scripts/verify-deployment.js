#!/usr/bin/env node

/**
 * Deployment verification script
 * Run this locally to check if your Railway deployment is working
 */

const axios = require('axios');

// Get the deployment URL from command line or environment
const deploymentUrl = process.argv[2] || process.env.DEPLOYMENT_URL;

if (!deploymentUrl) {
  console.error('❌ Please provide your Railway deployment URL');
  console.error('Usage: node verify-deployment.js https://your-app.up.railway.app');
  process.exit(1);
}

console.log('🔍 Verifying deployment at:', deploymentUrl);
console.log('=====================================\n');

async function checkEndpoint(path, method = 'GET', expectedStatus = 200) {
  try {
    const url = `${deploymentUrl}${path}`;
    console.log(`📡 Testing ${method} ${path}...`);
    
    const response = await axios({
      method,
      url,
      validateStatus: () => true // Don't throw on any status
    });
    
    const success = response.status === expectedStatus;
    const icon = success ? '✅' : '❌';
    
    console.log(`${icon} Status: ${response.status} (expected: ${expectedStatus})`);
    
    if (path === '/api/health' && response.data) {
      console.log('📊 Health check details:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    return success;
  } catch (error) {
    console.error(`❌ Failed to reach ${path}:`, error.message);
    return false;
  }
}

async function verifyDeployment() {
  const results = [];
  
  // Check basic connectivity
  console.log('1️⃣  Basic Connectivity Tests');
  console.log('------------------------------');
  results.push(await checkEndpoint('/api/test'));
  console.log();
  
  // Check health endpoint
  console.log('2️⃣  Health Check');
  console.log('----------------');
  results.push(await checkEndpoint('/api/health'));
  console.log();
  
  // Check webhook endpoint (should return 405 for GET)
  console.log('3️⃣  Webhook Endpoints');
  console.log('----------------------');
  results.push(await checkEndpoint('/api/webhooks/close', 'GET', 405));
  results.push(await checkEndpoint('/api/webhooks/calendly', 'GET', 405));
  console.log();
  
  // Check debug endpoints
  console.log('4️⃣  Debug Endpoints');
  console.log('-------------------');
  results.push(await checkEndpoint('/api/debug/webhooks'));
  console.log();
  
  // Summary
  console.log('=====================================');
  console.log('📊 DEPLOYMENT VERIFICATION SUMMARY');
  console.log('=====================================');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const allPassed = passed === total;
  
  console.log(`Tests passed: ${passed}/${total}`);
  
  if (allPassed) {
    console.log('✅ All checks passed! Your deployment appears to be working.');
    console.log('\n📝 Next steps:');
    console.log('1. Check the health endpoint response above for any warnings');
    console.log('2. Configure Close.io webhooks to point to:', `${deploymentUrl}/api/webhooks/close`);
    console.log('3. Send a test SMS to verify end-to-end flow');
  } else {
    console.log('⚠️  Some checks failed. Please review the errors above.');
    console.log('\n📝 Common issues:');
    console.log('- Missing environment variables (check Railway dashboard)');
    console.log('- Database connection issues (verify DATABASE_URL)');
    console.log('- Redis connection issues (verify REDIS_URL)');
    console.log('- Build/deployment errors (check Railway logs)');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run verification
verifyDeployment().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});