# Close.io SMS Chatbot System

An intelligent SMS chatbot system that integrates with Close.io CRM and Calendly to automate lead conversations, handle objections, and book appointments automatically.

## 🚀 Features

### Core Functionality

- **Automated SMS Responses**: Responds to incoming SMS messages from Close.io leads
- **Dual Bot System**:
  - **Appointment Bot**: Focused on scheduling appointments via Calendly
  - **Objection Handler Bot**: Handles objections and converts leads
- **Real-time Processing**: Webhook-based system for instant response to SMS messages
- **Context-Aware Conversations**: Maintains conversation history and lead context

### Integrations

- **Close.io CRM**: Complete SMS activity management, lead tracking, and webhook handling
- **Calendly**: Appointment scheduling, availability checking, and event management
- **OpenAI/Claude**: Advanced LLM integration for natural conversation
- **PostgreSQL**: Robust data storage with Prisma ORM
- **Redis + BullMQ**: Reliable queue system for webhook processing

### Advanced Features

- **Prompt Template System**: Customizable bot personalities and responses
- **Performance Monitoring**: Built-in analytics and conversation tracking
- **Security**: Webhook signature verification, rate limiting, and input validation
- **Scalable Architecture**: Microservices design ready for high-volume usage

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Close.io CRM  │────│   Webhooks   │────│  SMS Processor  │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                     │
                              ┌─────────────────────────┐
                              │                         │
                    ┌─────────▼──────────┐    ┌─────────▼──────────┐
                    │  Appointment Bot   │    │ Objection Handler  │
                    └────────────────────┘    └────────────────────┘
                              │                         │
                    ┌─────────▼──────────┐    ┌─────────▼──────────┐
                    │    Calendly API    │    │     LLM Service    │
                    └────────────────────┘    └────────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- Close.io account with API access
- Calendly account with API access
- OpenAI API key or Anthropic API key

## 🛠 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd close-chat-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Start Redis** (if running locally)

   ```bash
   redis-server
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following:

#### Database

```env
DATABASE_URL="postgresql://user:password@localhost:5432/close_chatbot"
```

#### Close.io API

```env
CLOSE_API_KEY="your_close_api_key"
CLOSE_WEBHOOK_SECRET="your_webhook_secret"
CLOSE_ORGANIZATION_ID="your_organization_id"
```

#### Calendly API

```env
CALENDLY_API_TOKEN="your_calendly_api_token"
CALENDLY_WEBHOOK_SECRET="your_calendly_webhook_secret"
CALENDLY_USER_URI="your_calendly_user_uri"
```

#### LLM Configuration

```env
OPENAI_API_KEY="your_openai_api_key"
# OR
ANTHROPIC_API_KEY="your_anthropic_api_key"
LLM_PROVIDER="openai"  # or "anthropic"
```

### Webhook Setup

1. **Close.io Webhooks**

   ```bash
   # Use the API or Close.io dashboard to create webhooks pointing to:
   https://your-domain.com/api/webhooks/close
   ```

2. **Calendly Webhooks**
   ```bash
   # Configure in Calendly dashboard to point to:
   https://your-domain.com/api/webhooks/calendly
   ```

## 🤖 Bot Configuration

### Appointment Bot

The appointment bot focuses on:

- Detecting appointment-related keywords
- Checking Calendly availability
- Guiding leads through booking process
- Sending confirmation messages

### Objection Handler Bot

The objection handler bot specializes in:

- Identifying objections and concerns
- Providing persuasive responses
- Building rapport and trust
- Converting leads to appointments

### Prompt Templates

Customize bot behavior by updating prompt templates in the database:

```sql
-- Example: Update appointment bot prompt
UPDATE "PromptTemplate"
SET content = 'Your new prompt here...'
WHERE name = 'appointment-scheduler' AND "botType" = 'APPOINTMENT';
```

## 📚 API Endpoints

### Webhooks

- `POST /api/webhooks/close` - Close.io SMS webhook handler
- `POST /api/webhooks/calendly` - Calendly event webhook handler

### System Health & Monitoring

- `GET /api/health` - Comprehensive health check endpoint
  - Database connectivity status
  - Redis connection status  
  - Close.io API validation
  - Environment variables verification
  - Deployment information

### Debug & Testing

- `GET /api/debug/webhooks` - Close.io webhook configuration analysis
  - Lists all configured webhooks
  - Validates webhook URLs and settings
  - Provides configuration recommendations
- `GET /api/test` - Simple connectivity test endpoint
- `POST /api/test` - Basic POST functionality test

### Management

- `GET /api/conversations` - List conversations
- `GET /api/leads` - List leads
- `POST /api/test/prompt` - Test prompt templates

## 🧪 Testing

Run the complete test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Railway Deployment

1. Connect repository to Railway
2. Add environment variables
3. Deploy with automatic builds

### Manual Deployment

```bash
# Build the application
npm run build

# Run database migrations
npx prisma migrate deploy

# Start production server
npm start
```

## 📊 Monitoring

### Performance Metrics

- API response times
- LLM token usage
- Conversation completion rates
- Database query performance

### Logging

- All API requests and responses
- Webhook processing events
- LLM interactions
- Error tracking with Sentry

## 🔧 Claude Code Integration

This project includes comprehensive Claude Code configurations with specialized subagents, automated documentation, and intelligent commit hooks:

### 🤖 Specialized Subagents

- **sms-bot-specialist**: SMS processing, bot logic, and LLM integration improvements
- **close-api-specialist**: Close.io CRM API integration, webhook handling, and lead management
- **database-manager**: Prisma schema management, migrations, and query optimization
- **test-automator**: Comprehensive testing, error detection, and quality assurance
- **security-auditor**: Security vulnerabilities, webhook security, and compliance monitoring

### ⚡ Slash Commands

- `/update-docs` - Automatically updates README.md, CLAUDE.md, and TESTING_GUIDE.md based on code changes
- `/test-all` - Runs complete test suite with coverage analysis
- `/deploy` - Builds and deploys to production with pre-deployment checks

### 🔄 Auto-Commit Hooks

- **Intelligent Commits**: Automatically commits code changes only when all checks pass
- **Error Prevention**: Runs TypeScript checks, linting, and Prisma validation before committing
- **Smart Messaging**: Generates descriptive commit messages with tool usage context
- **Claude Attribution**: Includes proper co-authorship attribution in commit messages

### 🚀 Benefits

- **Faster Development**: Domain-specific subagents handle specialized tasks more efficiently
- **Always Updated Docs**: Documentation automatically stays current with code changes
- **Quality Assurance**: Automated checks prevent committing broken code
- **Seamless Workflow**: Intelligent automation reduces manual overhead

## 🛡 Security

### Implemented Security Measures

- Webhook signature verification for Close.io and Calendly
- Rate limiting on API endpoints
- Input validation and sanitization
- Environment variable management
- SQL injection prevention
- XSS protection

### Security Checklist

- [ ] Webhook signatures verified
- [ ] API keys stored securely
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] HTTPS enforced
- [ ] Database queries parameterized

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

1. **Webhooks not working**
   - Verify webhook URLs are accessible using `GET /api/health`
   - Check webhook signature verification
   - Ensure environment variables are set correctly
   - Use `GET /api/debug/webhooks` to validate Close.io webhook configuration
   - Check for duplicate webhook processing causing P2002 database errors

2. **Database connection errors**
   - Verify DATABASE_URL format
   - Ensure PostgreSQL is running
   - Check database permissions
   - Use `GET /api/health` to test database connectivity

3. **LLM API errors**
   - Verify API keys are correct
   - Check rate limits and quotas
   - Ensure model names are valid
   - Monitor token usage in system logs

4. **Redis connection issues**
   - Verify Redis server is running
   - Check REDIS_URL configuration
   - Ensure Redis is accessible from the application
   - Use `GET /api/health` to test Redis connectivity

5. **Webhook Duplicate Processing**
   - System now handles duplicate webhook deliveries automatically
   - P2002 unique constraint errors are gracefully handled
   - Check logs for "Duplicate webhook detected" messages

### Health Monitoring

Monitor system health with the comprehensive health check endpoint:

```bash
curl https://your-domain.com/api/health
```

This endpoint provides:
- Database connectivity status
- Redis connection verification
- Close.io API validation
- Environment variables check
- Deployment information

### Debug Mode

Enable debug mode for detailed logging:

```env
ENABLE_DEBUG_MODE=true
```

### Webhook Configuration Debugging

Use the debug endpoint to analyze webhook configuration:

```bash
curl https://your-domain.com/api/debug/webhooks
```

This provides:
- List of all configured webhooks
- URL validation against expected endpoints
- Activation status check
- Configuration recommendations

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review the API documentation

---

Built with ❤️ using Next.js, TypeScript, Prisma, and Claude Code.

