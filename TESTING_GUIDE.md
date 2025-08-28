# SMS Chatbot Testing Guide

This guide will help you test your Close.io SMS chatbot integration from development to production.

## Prerequisites

1. **Environment Variables**: Ensure you have the required env vars in `.env`:
   ```bash
   CLOSE_API_KEY=your_close_api_key
   CLOSE_WEBHOOK_SECRET=your_webhook_secret  # Generate a random string
   DATABASE_URL=your_database_url
   REDIS_URL=your_redis_url
   OPENAI_API_KEY=your_openai_key  # or ANTHROPIC_API_KEY
   LLM_PROVIDER=openai  # or anthropic
   ```

2. **Install ngrok** (for local testing):
   
   **Option A - Download directly:**
   ```bash
   # Download ngrok
   wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
   tar -xzf ngrok-v3-stable-linux-amd64.tgz
   sudo mv ngrok /usr/local/bin/
   
   # Verify installation
   ngrok --version
   ```
   
   **Option B - Using package manager (Ubuntu/Debian):**
   ```bash
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   ```
   
   **Option C - Using snap:**
   ```bash
   sudo snap install ngrok
   ```

## Testing Steps

### Step 1: Start Your Development Environment

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   *(Note: Server is currently running on port 3001)*

2. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 3001
   ```
   
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 2: Set Up Close.io Webhook (Option A - Automated)

Run the webhook setup script:
```bash
node scripts/test-webhook-setup.js https://your-ngrok-url.ngrok.io
```

### Step 2: Set Up Close.io Webhook (Option B - Manual)

1. **Login to Close.io** → Settings → Integrations → Webhooks
2. **Create a new webhook** with:
   - URL: `https://your-ngrok-url.ngrok.io/api/webhooks/close`
   - Events: `activity.sms.created`
   - Secret: Same as your `CLOSE_WEBHOOK_SECRET` env var

### Step 3: Test Webhook Reception

**Option A - Simulate SMS (Recommended for initial testing):**
```bash
node scripts/test-sms-simulation.js https://your-ngrok-url.ngrok.io
```

**Option B - Real SMS Test:**
1. Send an SMS to one of your Close.io phone numbers
2. Watch your server logs for webhook processing

### Step 4: Verify Bot Response

After sending a test SMS, check:

1. **Server Logs**: Look for webhook processing messages
2. **Database**: Check if records were created in:
   - `WebhookEvent` table
   - `Lead` table  
   - `Conversation` table
   - `Message` table
3. **Close.io**: Check if a reply SMS was sent

## Monitoring and Debugging

### Check Server Logs
Watch your development server console for:
```
Processing SMS webhook event: evt_xxx
Bot response generated: "Hello! I'd be happy to help..."
SMS sent successfully via Close.io
```

### Database Inspection
```bash
# Connect to your database and check:
SELECT * FROM "WebhookEvent" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "Message" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "Conversation" ORDER BY "lastMessageAt" DESC LIMIT 5;
```

### Common Issues and Solutions

#### 1. Webhook Signature Verification Failed
- Ensure `CLOSE_WEBHOOK_SECRET` matches the secret in Close.io webhook settings
- Check timestamp tolerance (must be within 5 minutes)

#### 2. Bot Not Responding
- Verify LLM API keys are correct (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
- Check `PromptTemplate` records exist in database with correct `botType`
- Ensure Redis is running for queue processing

#### 3. SMS Not Sent
- Verify `CLOSE_API_KEY` has SMS permissions
- Check Close.io API rate limits
- Ensure lead has a valid phone number

#### 4. Environment Variable Errors
- All required env vars must be present for build to succeed
- Use `.env.example` as reference for required variables

## Bot Behavior Testing

### Test Appointment Bot
Send messages containing keywords:
- "appointment"
- "schedule" 
- "meeting"
- "call"
- "book"
- "available"

### Test Objection Handler Bot  
Send any other messages to trigger the objection handler.

### Test Conversation Context
Send multiple messages to verify:
- Conversation history is maintained
- Context is passed between messages
- Bot responses are contextually relevant

## Production Deployment

Once local testing works:

1. **Deploy to production** (Vercel, Railway, etc.)
2. **Update webhook URL** in Close.io to your production domain
3. **Set production environment variables**
4. **Monitor production logs** for any issues

## System Health & Debugging

### Health Check Endpoint

Test all system components with the comprehensive health endpoint:

```bash
# Local development
curl http://localhost:3001/api/health

# Production deployment
curl https://your-domain.com/api/health
```

This checks:
- Database connectivity (PostgreSQL)
- Redis connection status
- Close.io API authentication
- Environment variables validation
- Deployment information

### Webhook Configuration Analysis

Verify Close.io webhook setup:

```bash
# Check webhook configuration
curl https://your-domain.com/api/debug/webhooks
```

This provides:
- List of all configured webhooks
- URL validation against expected endpoints
- Active/inactive status
- Configuration recommendations

### Simple Connectivity Tests

```bash
# Basic endpoint test
curl https://your-domain.com/api/test

# Test POST functionality  
curl -X POST https://your-domain.com/api/test
```

## Troubleshooting Commands

```bash
# Check webhook events via Close.io API
curl -X GET "https://api.close.com/api/v1/webhook/" \
  -u "your_api_key:"

# System health check (new)
curl https://your-domain.com/api/health | jq

# Webhook configuration analysis (new)
curl https://your-domain.com/api/debug/webhooks | jq

# Test basic connectivity (new)
curl https://your-domain.com/api/test

# Check database connectivity
npm run db:studio

# View recent logs
tail -f /var/log/your-app.log
```

### Common Error Patterns

#### P2002 Database Constraint Errors
- **Issue**: Duplicate webhook processing causing unique constraint violations
- **Solution**: System now handles duplicates automatically
- **Log Pattern**: `"Duplicate webhook detected, using existing event"`

#### Health Check Failures
- **Database Error**: Check DATABASE_URL format and PostgreSQL connection
- **Redis Error**: Verify REDIS_URL and Redis server status  
- **Close.io Error**: Validate CLOSE_API_KEY permissions
- **Environment Error**: Check required environment variables are set

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify all environment variables are set correctly
3. Test each component individually (webhook → processing → LLM → SMS sending)
4. Use the simulation script to isolate webhook processing from Close.io integration