# API Setup Guide

Follow these steps to get all your API keys and configure your SMS chatbot.

## 1. Database Setup (Choose One)

### Option A: Local Development with Docker
```bash
# Run our automated setup
npm run setup
```

### Option B: Cloud Database (Recommended)
- **Railway**: https://railway.app → New Project → Add PostgreSQL
- **Vercel**: https://vercel.com/dashboard → Storage → Create Database  
- **Supabase**: https://supabase.com → New Project

Copy the connection string to your `.env` file.

## 2. Anthropic Claude API Key

1. Visit: https://console.anthropic.com/
2. Sign up/login
3. Go to **API Keys** → **Create Key**
4. Copy key (starts with `sk-ant-...`)
5. Add to `.env`:
   ```
   ANTHROPIC_API_KEY="sk-ant-your-key-here"
   ```

## 3. Close.io Configuration

### Get Organization ID:
1. Login to https://app.close.com
2. Go to **Settings** → **API** 
3. Copy your Organization ID
4. Or check URL: `app.close.com/organizations/YOUR_ORG_ID/`

### Create Webhook:
1. Go to **Settings** → **Webhooks** → **Add webhook**
2. URL: `https://your-domain.com/api/webhooks/close`
3. Events: Select `activity.sms.created` and `activity.sms.updated`
4. Create a webhook secret (random string, save it!)

Add to `.env`:
```
CLOSE_ORGANIZATION_ID="your_org_id_here"
CLOSE_WEBHOOK_SECRET="your_random_secret_here"
```

## 4. Calendly Configuration

### Get API Token:
1. Visit: https://calendly.com/integrations/api_webhooks
2. Click **"Get your API key"**
3. Go to **Integrations** → **API & Webhooks** → **Generate new token**
4. Copy token (starts with `eyJ...`)

### Get User URI:
```bash
curl -H "Authorization: Bearer YOUR_CALENDLY_TOKEN" \
     https://api.calendly.com/users/me
```
Copy the `uri` field.

### Get Organization URI:
```bash
curl -H "Authorization: Bearer YOUR_CALENDLY_TOKEN" \
     https://api.calendly.com/organizations
```
Copy the `uri` field from the response.

### Create Webhook:
1. In Calendly → **Integrations** → **API & Webhooks**
2. Create webhook with URL: `https://your-domain.com/api/webhooks/calendly`
3. Events: `invitee.created`, `invitee.canceled`
4. Create webhook secret (random string)

Add to `.env`:
```
CALENDLY_API_TOKEN="your_token_here"
CALENDLY_USER_URI="https://api.calendly.com/users/YOUR_UUID"
CALENDLY_ORGANIZATION_URI="https://api.calendly.com/organizations/YOUR_UUID"
CALENDLY_WEBHOOK_SECRET="your_random_webhook_secret"
```

## 5. Generate Security Keys

```bash
# Generate random 32-character strings
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY
```

## 6. Test Your Setup

```bash
# Test database connections
npm run test-connections

# Start development server
npm run dev
```

## 7. Deploy and Configure Webhooks

1. Deploy to Vercel/Railway
2. Update webhook URLs to your production domain
3. Test webhook endpoints with your live URLs

---

**Need Help?** Check the troubleshooting section in README.md or create an issue.