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
  - Queues SMS messages for processing
  - Handles inbound SMS events

- **Calendly Webhooks** (`src/app/api/webhooks/calendly/route.ts`):
  - Processes appointment bookings and cancellations
  - Updates appointment records in database

### 2. SMS Processing (`src/services/sms-processor.ts`)
- Determines bot type based on message content
- Maintains conversation context
- Generates LLM responses
- Sends replies via Close.io API

### 3. LLM Integration (`src/services/llm.ts`)
- Supports both OpenAI and Anthropic APIs
- Prompt template system for customizable bot behavior
- Context-aware conversation management
- Token usage optimization

### 4. Database Schema (`prisma/schema.prisma`)
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

## Troubleshooting

### Common Issues
- **Webhook failures**: Check signature verification and endpoint accessibility
- **Database errors**: Verify connection string and migrations
- **LLM errors**: Check API keys and rate limits
- **Queue issues**: Ensure Redis is running and accessible

### Debugging
- Enable `ENABLE_DEBUG_MODE=true` for detailed logging
- Check webhook event logs in database
- Monitor queue processing status
- Review API response logs

This system is designed to be maintainable, scalable, and easy to extend with new bot functionality or integrations.

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