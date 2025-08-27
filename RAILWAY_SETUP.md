# Railway Setup Guide - Critical Steps

## 1. Generate Public Domain (REQUIRED)
Your current URL `hopper.proxy.rlwy.net:10548` is a TCP proxy, NOT suitable for webhooks.

**Steps:**
1. Go to Railway Dashboard
2. Click on your service (close-chat-bot)
3. Go to **Settings** tab
4. Under **Networking**, click **"Generate Domain"**
5. You'll get something like: `close-chat-bot-production.up.railway.app`

## 2. Fix Database Connection (CRITICAL)
Your DATABASE_URL is currently using `localhost` which won't work in production.

**Steps:**
1. In Railway Dashboard, go to your PostgreSQL service
2. Click on the **Variables** tab
3. Copy the `DATABASE_URL` (should look like: `postgresql://postgres:password@host.railway.internal:5432/railway`)
4. Go to your app service
5. Update `DATABASE_URL` with the copied value

## 3. Update ALL Environment Variables
Replace these in your Railway app service:

```
# URLs (replace 'your-domain' with your generated Railway domain)
NEXT_PUBLIC_APP_URL=https://your-domain.up.railway.app
WEBHOOK_ENDPOINT_URL=https://your-domain.up.railway.app/api/webhooks

# Database (use Railway's PostgreSQL URL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.railway.internal:5432/railway

# Redis (should already be correct if provisioned via Railway)
REDIS_URL=${{Redis.REDIS_URL}}
```

## 4. Verify Deployment
After updating environment variables:

1. Railway will auto-redeploy
2. Check deployment logs for any errors
3. Test the health endpoint:
   ```bash
   curl https://your-domain.up.railway.app/api/health
   ```

## 5. Set Up Close.io Webhook
Since Close.io doesn't allow manual webhook setup in UI, we need to use their API:

```bash
# Run locally with your production URL
export CLOSE_API_KEY="your_close_api_key"
export WEBHOOK_ENDPOINT_URL="https://your-domain.up.railway.app/api/webhooks"
node scripts/setup-close-webhook.js
```

## Common Issues

### "invalid length of startup packet" in PostgreSQL logs
- This means DATABASE_URL is wrong or using localhost
- Solution: Use Railway's provided DATABASE_URL

### No webhook logs appearing
- Your app isn't receiving webhooks because the URL is wrong
- Solution: Generate proper Railway domain and update Close.io

### Redis authentication errors
- Railway Redis requires authentication
- Solution: Use Railway's provided REDIS_URL variable

## Testing Checklist
- [ ] Generated Railway public domain
- [ ] DATABASE_URL uses Railway PostgreSQL (not localhost)
- [ ] REDIS_URL uses Railway Redis
- [ ] NEXT_PUBLIC_APP_URL uses https://your-domain.up.railway.app
- [ ] WEBHOOK_ENDPOINT_URL uses https://your-domain.up.railway.app/api/webhooks
- [ ] Health endpoint returns success
- [ ] Close.io webhook registered with correct URL