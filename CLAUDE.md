# Close.io SMS Chatbot - Claude Code Context

This is an automated SMS chatbot system that integrates with Close.io CRM and Calendly for appointment booking and lead conversion. The system is designed to handle incoming SMS messages, determine the appropriate bot response, and maintain contextual conversations with leads.

## Project Overview

### Core Functionality
- **SMS Processing**: Receives webhooks from Close.io for inbound SMS messages
- **Dual Bot System**: 
  - Appointment booking bot for scheduling via Calendly
  - Objection handling bot for lead conversion
- **Context Management**: Maintains conversation history and lead information
- **Queue Processing**: Uses Redis + BullMQ for reliable webhook processing

### Architecture
- **Backend**: Next.js 14 with App Router, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: Redis with BullMQ for webhook processing
- **LLM**: OpenAI GPT-4 or Anthropic Claude integration
- **APIs**: Close.io CRM API, Calendly API v2

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── close/route.ts         # Close.io webhook handler
│   │   │   └── calendly/route.ts      # Calendly webhook handler
│   │   ├── health/route.ts            # System health monitoring
│   │   ├── debug/webhooks/route.ts    # Webhook configuration analysis
│   │   └── test/route.ts              # Basic connectivity testing
│   └── dashboard/                     # Admin dashboard (future)
├── lib/
│   ├── prisma.ts                      # Database client
│   ├── queue.ts                       # BullMQ setup
│   └── env.ts                         # Environment validation
├── services/
│   ├── close.ts                       # Close.io API client
│   ├── llm.ts                         # LLM service wrapper
│   ├── sms-processor.ts               # SMS webhook processor
│   └── calendly-processor.ts          # Calendly webhook processor
├── types/
│   └── index.ts                       # TypeScript type definitions
└── .claude/
    ├── agents/                        # Custom subagents
    ├── commands/                      # Slash commands
    ├── hooks/                         # Auto-commit hooks
    └── config.json                    # Claude Code configuration
```

## Key Components

### 1. Webhook Handling
- **Close.io SMS Webhooks** (`src/app/api/webhooks/close/route.ts`): 
  - Validates webhook signatures
  - Handles duplicate webhook deliveries automatically
  - Queues SMS messages for processing
  - Handles inbound SMS events
  - Enhanced logging for debugging

- **Calendly Webhooks** (`src/app/api/webhooks/calendly/route.ts`):
  - Processes appointment bookings and cancellations
  - Updates appointment records in database

### 2. System Monitoring & Debugging
- **Health Check Endpoint** (`src/app/api/health/route.ts`):
  - Comprehensive system health monitoring
  - Database connectivity verification
  - Redis connection testing
  - Close.io API authentication check
  - Environment variables validation
  - Deployment information reporting

- **Webhook Debug Endpoint** (`src/app/api/debug/webhooks/route.ts`):
  - Close.io webhook configuration analysis
  - URL validation and recommendations
  - Webhook activation status monitoring

- **Basic Test Endpoint** (`src/app/api/test/route.ts`):
  - Simple connectivity testing
  - Environment variable presence check
  - Basic GET/POST functionality verification

### 3. SMS Processing (`src/services/sms-processor.ts`)
- Determines bot type based on message content
- Maintains conversation context
- Generates LLM responses
- Sends replies via Close.io API

### 4. LLM Integration (`src/services/llm.ts`)
- Supports both OpenAI and Anthropic APIs
- Prompt template system for customizable bot behavior
- Context-aware conversation management
- Token usage optimization

### 5. Database Schema (`prisma/schema.prisma`)
- **Lead**: Customer information from Close.io
- **Conversation**: SMS conversation sessions
- **Message**: Individual SMS messages with context
- **Appointment**: Scheduled appointments from Calendly
- **PromptTemplate**: Customizable bot prompts
- **WebhookEvent**: Audit trail for webhook processing

## Environment Configuration

Required environment variables (see `.env.example`):
- **Database**: `DATABASE_URL`, `REDIS_URL`
- **Close.io**: `CLOSE_API_KEY`, `CLOSE_WEBHOOK_SECRET`
- **Calendly**: `CALENDLY_API_TOKEN`, `CALENDLY_WEBHOOK_SECRET`
- **LLM**: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

## Bot Logic

### Appointment Bot
Triggers on keywords: appointment, schedule, meeting, call, book, available, calendar, time, consultation

**Enhanced Flow**:
1. Detect appointment intent from natural language
2. Parse time preferences (morning: 8AM-12PM, afternoon: 12PM-5PM, evening: 5PM-8PM)
3. Show filtered availability (max 3 options, same day + next day only)
4. **Direct booking** - no links required, appointment is booked automatically
5. Confirm with email address from Close.io (no asking for email)
6. Send confirmation message with appointment details

**Time Slot Logic**:
- **Before 6PM**: Show same day + next day slots
- **After 6PM**: Show same day + next day slots  
- **Maximum 3 options** shown to user
- **Smart filtering**: "morning", "afternoon", "evening", "after 5pm", etc.
- **Same-day limitations**: Only future slots (minimum 30min ahead)

**Booking Confirmation**:
- Uses existing email from Close.io lead data
- Confirms email instead of asking: "I'll send confirmation to nick.neessen@gmail.com - does that work?"
- Direct appointment booking without requiring user to click links
- Stores appointment in database with Calendly integration

### Objection Handler Bot
Handles all other conversations with focus on:
- Identifying objections and concerns
- Building rapport and trust
- Converting leads to appointments
- Addressing specific insurance-related questions

## Claude Code Integration

### Specialized Subagents
- **sms-bot-specialist**: SMS processing, bot logic, conversation management, and LLM integration
- **close-api-specialist**: Close.io CRM API integration, webhook handling, and lead management  
- **database-manager**: Prisma schema management, migrations, query optimization, and data modeling
- **test-automator**: Comprehensive testing, error detection, quality assurance, and debugging
- **security-auditor**: Security vulnerability detection, webhook security, and compliance monitoring

### Intelligent Slash Commands
- `/update-docs`: Automatically updates README.md, CLAUDE.md, and TESTING_GUIDE.md based on code changes
- `/test-all`: Runs complete test suite with coverage analysis and error reporting
- `/deploy`: Builds and deploys to production with comprehensive pre-deployment checks

### Smart Auto-Commit Hooks
- **Error Prevention**: Runs TypeScript, ESLint, and Prisma validation before committing
- **Intelligent Commits**: Only commits when all quality checks pass
- **Descriptive Messages**: Generates context-aware commit messages with tool usage details
- **Claude Attribution**: Includes proper co-authorship in all automated commits

## Development Workflow

### Common Tasks
1. **Adding New Bot Logic**: Modify `src/services/sms-processor.ts`
2. **Updating Prompts**: Modify database records in `PromptTemplate` table
3. **API Changes**: Update `src/services/close.ts` or add new endpoints
4. **Schema Changes**: Update `prisma/schema.prisma` and run migrations

### Testing
- Unit tests for services and utilities
- Integration tests for API endpoints
- Webhook testing with signature validation
- LLM response testing

### Deployment
- Vercel for Next.js frontend and API routes
- Railway or similar for full-stack deployment with PostgreSQL
- Environment variables managed through deployment platform

## Key Considerations

### Security
- Webhook signature verification for all incoming requests
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure environment variable handling

### Performance
- Queue-based webhook processing to prevent timeouts
- Connection pooling for database operations
- LLM response caching for similar queries
- Optimized database queries with proper indexing

### Scalability
- Microservices architecture ready for horizontal scaling
- Queue system handles high webhook volumes
- Database designed for efficient querying
- Modular bot system for easy expansion

## Recent Improvements (Latest Updates)

### Enhanced Webhook Processing
- **Duplicate Handling**: Automatic detection and handling of duplicate webhook deliveries
- **P2002 Error Resolution**: Graceful handling of unique constraint violations in WebhookEvent table
- **Enhanced Logging**: Comprehensive debugging information for webhook processing pipeline
- **Error Recovery**: Fallback mechanisms for database operations

### System Monitoring & Health Checks
- **Comprehensive Health Endpoint**: Real-time monitoring of all system components
- **Webhook Configuration Analysis**: Debug endpoint for validating Close.io webhook setup
- **Environment Validation**: Automatic checking of required environment variables
- **Connectivity Testing**: Simple endpoints for basic system validation

### Improved Error Handling
- **Database Constraint Errors**: Automatic handling of P2002 unique constraint violations
- **Webhook Signature Verification**: Enhanced security with better error reporting
- **Queue Processing**: Improved error tracking and recovery mechanisms
- **Connection Resilience**: Better handling of database and Redis connection issues

## Troubleshooting

### System Health Monitoring
Use the comprehensive health check endpoint to monitor system status:
```bash
curl https://your-domain.com/api/health
```

### Webhook Configuration Debugging
Analyze webhook setup and get recommendations:
```bash
curl https://your-domain.com/api/debug/webhooks
```

### Common Issues
- **Webhook failures**: Check signature verification and endpoint accessibility using health endpoints
- **Database errors**: Verify connection string and migrations; system now handles duplicate processing automatically
- **LLM errors**: Check API keys and rate limits through health monitoring
- **Queue issues**: Ensure Redis is running and accessible; validate with health check
- **P2002 Constraint Errors**: Now handled automatically with duplicate detection

### Debugging
- Enable `ENABLE_DEBUG_MODE=true` for detailed logging
- Use `GET /api/health` for comprehensive system status
- Use `GET /api/debug/webhooks` for webhook configuration analysis
- Check webhook event logs in database
- Monitor queue processing status
- Review API response logs with enhanced webhook logging

This system is designed to be maintainable, scalable, and easy to extend with new bot functionality or integrations.

## Railway Deployment Troubleshooting

### Build Issues Resolution (August 2024)

This section documents the comprehensive troubleshooting process for Railway deployment build failures and runtime health check issues.

#### Initial Problem
The application was working perfectly in development but failing during Railway deployment with multiple error patterns:

1. **Early Build Failures (Exit Code 240)** - First 2 seconds of build
2. **Redis Connection Errors** - 4+ minutes into build during static page generation
3. **Runtime Health Check Failures** - 503 errors during Railway health checks

#### Root Cause Analysis

**Build-Time Redis Connections**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
💥 Worker error: Error: connect ECONNREFUSED 127.0.0.1:6379
⏳ Redis retry attempt 1, waiting 50ms...
```

The core issue was that Redis connections and BullMQ workers were being initialized at module load time during Next.js static page generation. Railway's build environment doesn't have Redis available, causing connection failures.

**Runtime Environment Variables**
```json
{
  "redis": {"status": "error", "details": "Queue connections not available during build"},
  "closeio": {"status": "error", "details": "Request failed with status code 401"}
}
```

The `SKIP_ENV_VALIDATION=true` environment variable was persisting from build-time into runtime, causing the environment validation to return empty objects instead of actual environment variables.

#### Solution Implementation

**1. Lazy-Loaded Queue System**
Created a build-safe queue implementation using JavaScript Proxies:

```typescript
// Before: Immediate connection at module load
const queueConnection = createRedisConnection();
export const smsQueue = new Queue('sms-processing', { connection: queueConnection });

// After: Lazy-loaded with build-time safety
export const smsQueue = new Proxy({} as Queue, {
  get(target, prop) {
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      // Return mock functions during build
      if (typeof prop === 'string' && ['add', 'close'].includes(prop)) {
        return () => Promise.resolve({ id: 'build-time-mock' });
      }
      return undefined;
    }
    
    if (!smsQueueInstance) {
      smsQueueInstance = new Queue('sms-processing', { connection: getQueueConnection() });
      initializeWorkers(); // Auto-initialize workers on first use
    }
    return (smsQueueInstance as unknown as Record<string | symbol, unknown>)[prop];
  }
});
```

**2. Build-Safe Connection Management**
```typescript
const getQueueConnection = () => {
  if (!queueConnection) {
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      throw new Error('Queue connections not available during build');
    }
    queueConnection = createRedisConnection();
  }
  return queueConnection;
};
```

**3. Worker Initialization Control**
```typescript
let workersInitialized = false;

export const initializeWorkers = () => {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.SKIP_ENV_VALIDATION === 'true') return; // Skip during build
  if (workersInitialized) return; // Prevent duplicate initialization
  
  workersInitialized = true;
  // Initialize BullMQ workers...
};
```

**4. Docker Environment Fix**
```dockerfile
# Before: Persistent environment variable
ENV SKIP_ENV_VALIDATION=true
RUN npx prisma generate
RUN npm run build:next

# After: Only during build commands
RUN npx prisma generate  
RUN SKIP_ENV_VALIDATION=true npm run build:next
```

**5. API Service Fallbacks**
```typescript
// Before: Only used validated env
username: env.CLOSE_API_KEY!,

// After: Fallback for build-safe scenarios  
const closeApiKey = env.CLOSE_API_KEY || process.env.CLOSE_API_KEY;
username: closeApiKey!,
```

#### Key Technical Insights

**Build vs Runtime Phases**
- **Build Phase**: Next.js static page generation requires importing modules but shouldn't connect to external services
- **Runtime Phase**: Actual application execution when Redis and APIs should be available
- **Solution**: Use lazy initialization with environment-based guards

**Environment Variable Lifecycle**
- Railway builds set `SKIP_ENV_VALIDATION=true` to bypass validation during builds
- This was incorrectly persisting to runtime via `ENV` directive in Dockerfile
- Fixed by only using it in `RUN` commands, not as persistent environment

**Proxy Pattern Benefits**
- Allows modules to be imported during build without executing connection logic
- Provides build-time mock responses for queue operations
- Defers actual initialization until first runtime usage
- Maintains the same API interface for consuming code

#### Build Process Flow

**Before Fix:**
```
1. Next.js build starts
2. Imports src/lib/queue.ts
3. Module loads → createRedisConnection() executes
4. Redis connection fails (no Redis in build environment)
5. Build terminates with exit code 240
```

**After Fix:**
```
1. Next.js build starts  
2. Imports src/lib/queue.ts
3. Module loads → Proxy created, no connections attempted
4. Static page generation succeeds
5. Build completes successfully
6. Runtime: First webhook → Proxy triggers lazy initialization
7. Redis connections established, workers start
```

#### Deployment Checklist

✅ **Build Requirements**
- `SKIP_ENV_VALIDATION=true` only during `npm run build`
- No Redis/external service connections during static generation
- All imports must be build-safe (no immediate connections)

✅ **Runtime Requirements**  
- Environment variables properly validated and available
- Redis connections initialize on first use
- Workers auto-start when queue operations begin
- Health checks pass for all services

✅ **Dockerfile Best Practices**
- Use `RUN VARIABLE=value command` not `ENV VARIABLE=value`
- Separate build-time and runtime environment concerns
- Custom Dockerfile to avoid Railway cache issues (`npm ci --no-cache`)

#### Files Modified

**Core Queue System**
- `src/lib/queue.ts` - Lazy-loaded Proxy implementation
- `src/services/close.ts` - Environment variable fallbacks
- `src/app/api/health/route.ts` - Runtime connection testing

**Build Configuration**  
- `Dockerfile` - Removed persistent `ENV SKIP_ENV_VALIDATION`
- `package.json` - Maintained working `@prisma/client` in devDependencies

**Debug Endpoints**
- `src/app/api/debug/live-test/route.ts` - Updated queue imports
- `src/app/api/debug/test-webhook/route.ts` - Updated queue imports  
- `src/app/api/test-queue/route.ts` - Updated queue imports

This comprehensive fix ensures Railway deployments work reliably while maintaining development functionality and build performance.

## Claude Code Development Rules

These rules must be followed for all development tasks to ensure highest quality, accuracy, and maintainability:

### Core Workflow Rules
1. **Think → Read → Plan**: First analyze the problem, read relevant codebase files, then write a plan to tasks/todo.md
2. **Plan with checkable items**: Create todo lists with items that can be marked complete
3. **Get approval before starting**: Check in and verify the plan before beginning work
4. **Progress updates**: Provide high-level explanations of changes at each step
5. **Maximum simplicity**: Make every change as simple as possible, impacting minimal code
6. **Minimal code impact**: Only touch code that's absolutely necessary for the task
7. **Complete with review**: Add a review section to todo.md summarizing all changes
8. **Never be lazy**: Find root causes, fix properly, no temporary solutions
9. **Embrace simplicity**: Prioritize simple solutions that minimize bug introduction

### Technical Excellence Rules
10. **Test everything**: Run tests, linting, and type checking after each change
11. **Read before writing**: Examine existing code patterns and follow them exactly
12. **Verify dependencies**: Check package.json/imports before assuming libraries exist
13. **Use TodoWrite tool**: Track all progress with built-in task management
14. **Batch operations**: Run multiple commands in parallel when possible
15. **Security first**: Never expose secrets, validate inputs, follow security best practices
16. **One task focus**: Mark tasks in_progress individually, complete before moving on
17. **Match conventions**: Follow existing code style, naming, and architecture patterns
18. **Minimal communication**: Keep responses concise unless detail is specifically requested

These rules ensure consistent, high-quality development while maintaining system reliability and preventing technical debt.