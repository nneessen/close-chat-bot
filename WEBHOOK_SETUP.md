# Close.io Webhook Setup Guide

Close.io doesn't provide a UI for webhook configuration - everything must be done via API.

## Quick Setup (Production)

### Step 1: Set Environment Variables
```bash
export CLOSE_API_KEY="api_YOUR_CLOSE_API_KEY"
export WEBHOOK_ENDPOINT_URL="https://your-app.up.railway.app/api/webhooks"
```

### Step 2: Run Setup Script
```bash
node scripts/manage-close-webhooks.js setup-production
```

This will:
- Create a webhook pointing to your Railway app
- Return a webhook secret you need to save
- Configure it for SMS events

### Step 3: Add Webhook Secret to Railway
Copy the `CLOSE_WEBHOOK_SECRET` from the output and add it to your Railway environment variables.

## Manual Setup Options

### List All Webhooks
See what webhooks are currently configured:
```bash
node scripts/manage-close-webhooks.js list
```

### Create a Specific Webhook
```bash
node scripts/manage-close-webhooks.js create https://your-domain.com/api/webhooks/close
```

### Delete a Webhook
```bash
node scripts/manage-close-webhooks.js delete webhook_YOUR_WEBHOOK_ID
```

### Delete All Webhooks (Clean Slate)
```bash
node scripts/manage-close-webhooks.js delete-all
```

## Testing Your Webhook

### 1. Local Testing with ngrok
```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Terminal 3: Setup webhook with ngrok URL
export CLOSE_API_KEY="api_YOUR_KEY"
node scripts/manage-close-webhooks.js create https://YOUR-NGROK.ngrok-free.app/api/webhooks/close
```

### 2. Production Testing
After setting up the webhook:
1. Send an SMS to your Close.io phone number
2. Check Railway logs for webhook activity
3. Verify the bot responds

## Webhook Event Format

Close.io sends webhooks for SMS events in this format:
```json
{
  "event": {
    "id": "event_id",
    "object_type": "activity.sms",
    "action": "created",
    "data": {
      "id": "sms_activity_id",
      "lead_id": "lead_123",
      "direction": "inbound",
      "text": "Message content",
      "local_phone": "+1234567890",
      "remote_phone": "+0987654321",
      "status": "received"
    }
  }
}
```

## Troubleshooting

### Webhook Not Triggering
1. Check webhook status is "active":
   ```bash
   node scripts/manage-close-webhooks.js list
   ```
2. Verify URL is correct and publicly accessible
3. Check Railway logs for incoming requests

### Signature Verification Failing
1. Ensure `CLOSE_WEBHOOK_SECRET` matches the webhook's `verify_key`
2. Temporarily disable verification for testing (not recommended for production):
   - Comment out signature verification in `/src/app/api/webhooks/close/route.ts`

### No Response SMS
1. Check Railway logs for:
   - Webhook received: "🔔 WEBHOOK HIT"
   - SMS queued: "📥 Adding INBOUND SMS to queue"
   - Worker processing: "🔄 Worker picked up SMS job"
   - SMS sent: "✅ SMS sent successfully"

2. Verify environment variables:
   - `CLOSE_API_KEY` is correct
   - `DATABASE_URL` and `REDIS_URL` are Railway's services
   - LLM API keys are set

### Common Close.io API Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| 401 Unauthorized | Invalid API key | Check CLOSE_API_KEY |
| 400 Bad Request | Invalid webhook format | Check event types match Close.io format |
| 404 Not Found | Webhook ID doesn't exist | Use `list` command to find correct ID |
| 422 Unprocessable Entity | Validation error | Check URL format and event types |

## Important Notes

1. **Webhook Secret**: Always save the `verify_key` returned when creating a webhook
2. **Event Types**: Close.io uses `activity.sms` (lowercase) for text messages
3. **SSL Required**: Production webhooks must use HTTPS
4. **Multiple Webhooks**: You can have multiple webhooks for different environments
5. **Rate Limits**: Close.io may throttle webhook deliveries under high load

## Webhook Payload Verification

Close.io signs webhooks using HMAC-SHA256:
1. Concatenate timestamp and body: `timestamp.body`
2. Calculate HMAC-SHA256 using webhook secret
3. Compare with `close-sig-hash` header

The app handles this automatically when `CLOSE_WEBHOOK_SECRET` is set correctly.