// Initialize environment and handle startup errors gracefully
import dotenv from 'dotenv';

// Load environment variables early
dotenv.config();

// Check critical environment variables
export function checkCriticalEnv() {
  const required = [
    'DATABASE_URL',
    'REDIS_URL', 
    'CLOSE_API_KEY',
    'CLOSE_WEBHOOK_SECRET',
    'CLOSE_ORGANIZATION_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing critical environment variables:', missing);
    console.error('Please set these in your Railway dashboard');
    
    // In production, exit; in dev, continue with warnings
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  } else {
    console.log('✅ All critical environment variables are set');
  }
}

// Initialize on module load
if (process.env.NODE_ENV === 'production') {
  checkCriticalEnv();
}