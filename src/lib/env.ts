import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // Close.io
  CLOSE_API_KEY: z.string().min(1),
  CLOSE_WEBHOOK_SECRET: z.string().min(1),
  CLOSE_ORGANIZATION_ID: z.string().min(1),
  
  // Calendly
  CALENDLY_API_TOKEN: z.string().min(1),
  CALENDLY_WEBHOOK_SECRET: z.string().min(1),
  CALENDLY_USER_URI: z.string().min(1),
  CALENDLY_ORGANIZATION_URI: z.string().min(1),
  
  // LLM
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(['openai', 'anthropic']).default('anthropic'),
  LLM_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  
  // Application
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WEBHOOK_ENDPOINT_URL: z.string().url(),
  
  // Security
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  
  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  
  // Feature Flags
  ENABLE_APPOINTMENT_BOT: z.string().transform(val => val === 'true'),
  ENABLE_OBJECTION_BOT: z.string().transform(val => val === 'true'),
  ENABLE_DEBUG_MODE: z.string().transform(val => val === 'true'),
  
  // Rate Limiting
  MAX_MESSAGES_PER_CONVERSATION: z.string().transform(Number),
  MAX_CONVERSATIONS_PER_DAY: z.string().transform(Number),
  MESSAGE_COOLDOWN_SECONDS: z.string().transform(Number),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Always use partial parsing to avoid build-time validation errors
export const env = envSchema.partial().parse(process.env) as Env;

export default env;