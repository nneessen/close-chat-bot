# Railway Deployment Fix Guide

## Critical Issues Fixed

### 1. **@prisma/client Dependency Issue** ✅
- **Problem**: @prisma/client was in devDependencies, causing production build failures
- **Fix**: Moved to dependencies in package.json

### 2. **Environment Validation Issue** ✅
- **Problem**: env.ts was using partial() validation which made all vars optional
- **Fix**: Proper validation with build-time skip flag

### 3. **Startup Issues** ✅
- **Problem**: Next.js server wasn't starting properly
- **Fix**: Created custom server.js with proper error handling

### 4. **Redis Connection Issues** ✅
- **Problem**: No error handling for Redis connection failures
- **Fix**: Added retry logic and error handling

## Deployment Steps

### Step 1: Push Code Changes to GitHub
```bash
git add .
git commit -m "Fix deployment issues: dependencies, env validation, startup"
git push origin main
```

### Step 2: Configure Railway Environment Variables

In your Railway dashboard, ensure ALL these variables are set:

```bash
# Database (use Railway's PostgreSQL)
DATABASE_URL=postgresql://postgres:PASSWORD@HOST.railway.internal:5432/railway

# Redis (use Railway's Redis) 
REDIS_URL=redis://default:PASSWORD@HOST.railway.internal:6379

# Close.io (from your Close.io account)
CLOSE_API_KEY=api_YOUR_KEY
CLOSE_WEBHOOK_SECRET=your_webhook_secret
CLOSE_ORGANIZATION_ID=org_YOUR_ORG_ID

# Calendly
CALENDLY_API_TOKEN=your_token
CALENDLY_WEBHOOK_SECRET=your_secret
CALENDLY_USER_URI=https://api.calendly.com/users/YOUR_USER
CALENDLY_ORGANIZATION_URI=https://api.calendly.com/organizations/YOUR_ORG

# LLM (use one of these)
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
# OR
OPENAI_API_KEY=sk-YOUR_KEY
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022

# URLs (CRITICAL - replace with your Railway domain)
NEXT_PUBLIC_APP_URL=https://YOUR-APP.up.railway.app
WEBHOOK_ENDPOINT_URL=https://YOUR-APP.up.railway.app/api/webhooks

# Security (generate random strings)
JWT_SECRET=generate-32-char-random-string-here
ENCRYPTION_KEY=generate-another-32-char-string-here

# Feature Flags
ENABLE_APPOINTMENT_BOT=true
ENABLE_OBJECTION_BOT=true
ENABLE_DEBUG_MODE=true

# Rate Limiting
MAX_MESSAGES_PER_CONVERSATION=50
MAX_CONVERSATIONS_PER_DAY=100
MESSAGE_COOLDOWN_SECONDS=2
```

### Step 3: Generate Railway Public Domain

1. Go to Railway Dashboard
2. Click on your service
3. Go to **Settings** tab
4. Under **Networking**, click **"Generate Domain"**
5. You'll get: `your-app-production.up.railway.app`
6. Update NEXT_PUBLIC_APP_URL and WEBHOOK_ENDPOINT_URL with this domain

### Step 4: Trigger Deployment

Railway will auto-deploy when you push. If not:
1. Go to your service
2. Click "Redeploy" 
3. Monitor logs for errors

### Step 5: Verify Deployment

Once deployed, run:
```bash
node scripts/verify-deployment.js https://YOUR-APP.up.railway.app
```

### Step 6: Setup Close.io Webhooks

Run this locally with your production URL:
```bash
export CLOSE_API_KEY="your_close_api_key"
export WEBHOOK_ENDPOINT_URL="https://YOUR-APP.up.railway.app/api/webhooks"
node scripts/setup-close-webhook.js
```

## Troubleshooting

### If deployment fails in first 2 seconds:
1. Check Railway logs for missing environment variables
2. Ensure DATABASE_URL is Railway's PostgreSQL, not localhost
3. Check that REDIS_URL is set correctly

### If webhooks aren't working:
1. Verify webhook signature is disabled (temporarily) in route.ts
2. Check /api/health endpoint for issues
3. Review /api/debug/webhooks for configuration
4. Check Railway logs when sending test SMS

### If SMS responses aren't being sent:
1. Check queue worker logs in Railway
2. Verify CLOSE_API_KEY is correct
3. Check if lead_id and phone numbers are being captured
4. Look for "SMS sent successfully" in logs

## Testing SMS Flow

1. Send test SMS to your Close.io phone number
2. Check Railway logs for:
   - "🔔 WEBHOOK HIT"
   - "📥 Adding INBOUND SMS to queue"
   - "🔄 Worker picked up SMS job"
   - "📤 Sending SMS to Close.io API"
   - "✅ SMS sent successfully"

## Common Error Messages & Solutions

| Error | Solution |
|-------|----------|
| "Missing critical environment variables" | Set all required vars in Railway dashboard |
| "invalid length of startup packet" | DATABASE_URL is wrong, use Railway's PostgreSQL |
| "Redis connection refused" | REDIS_URL not set or incorrect |
| "Cannot find module '@prisma/client'" | Redeploy after package.json fix |
| "Failed to send SMS" | Check CLOSE_API_KEY and lead data |

## Quick Checks

Run these commands to verify everything:

```bash
# Check deployment health
curl https://YOUR-APP.up.railway.app/api/health

# Check webhook configuration  
curl https://YOUR-APP.up.railway.app/api/debug/webhooks

# Test basic connectivity
curl https://YOUR-APP.up.railway.app/api/test
```

## Still Having Issues?

1. Enable debug mode: `ENABLE_DEBUG_MODE=true`
2. Check Railway deployment logs
3. Verify all environment variables are set
4. Ensure PostgreSQL and Redis services are running in Railway
5. Double-check that webhook URLs use HTTPS, not HTTP