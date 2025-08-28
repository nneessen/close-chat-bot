import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { processSMSWebhook } from '@/services/sms-processor';
import { processCalendlyWebhook } from '@/services/calendly-processor';

// Create Redis connections with proper authentication handling
// ioredis automatically parses redis:// URLs including auth
const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log('🔗 Connecting to Redis:', redisUrl.replace(/:[^:@]*@/, ':***@')); // Log URL without password
  
  try {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`⏳ Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        if (targetErrors.some(e => err.message.includes(e))) {
          return true;
        }
        return false;
      }
    });
  } catch (error) {
    console.error('❌ Failed to create Redis connection:', error);
    throw error;
  }
};

// Lazy-loaded connections to avoid build-time Redis connections
let queueConnection: Redis | null = null;
let workerConnection: Redis | null = null;
let smsQueueInstance: Queue | null = null;
let calendlyQueueInstance: Queue | null = null;

const getQueueConnection = () => {
  if (!queueConnection) {
    // Skip Redis connection during build
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      throw new Error('Queue connections not available during build');
    }
    queueConnection = createRedisConnection();
  }
  return queueConnection;
};

const getWorkerConnection = () => {
  if (!workerConnection) {
    // Skip Redis connection during build
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      throw new Error('Worker connections not available during build');
    }
    workerConnection = createRedisConnection();
  }
  return workerConnection;
};

// SMS processing queue (lazy-loaded)
export const smsQueue = new Proxy({} as Queue, {
  get(target, prop) {
    // During build, return a no-op function for methods to prevent errors
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      if (typeof prop === 'string' && ['add', 'close'].includes(prop)) {
        return () => Promise.resolve({ id: 'build-time-mock' });
      }
      return undefined;
    }
    
    if (!smsQueueInstance) {
      smsQueueInstance = new Queue('sms-processing', { connection: getQueueConnection() });
      // Initialize workers asynchronously to prevent blocking webhook response
      setTimeout(() => {
        initializeWorkers();
      }, 0);
    }
    return (smsQueueInstance as unknown as Record<string | symbol, unknown>)[prop];
  }
});

// Calendly webhook queue (lazy-loaded)
export const calendlyQueue = new Proxy({} as Queue, {
  get(target, prop) {
    // During build, return a no-op function for methods to prevent errors
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      if (typeof prop === 'string' && ['add', 'close'].includes(prop)) {
        return () => Promise.resolve({ id: 'build-time-mock' });
      }
      return undefined;
    }
    
    if (!calendlyQueueInstance) {
      calendlyQueueInstance = new Queue('calendly-processing', { connection: getQueueConnection() });
    }
    return (calendlyQueueInstance as unknown as Record<string | symbol, unknown>)[prop];
  }
});

// Track worker initialization to prevent duplicates
let workersInitialized = false;

// Initialize workers lazily only when needed at runtime
export const initializeWorkers = () => {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.SKIP_ENV_VALIDATION === 'true') return; // Skip during build
  if (workersInitialized) return; // Prevent duplicate initialization
  
  workersInitialized = true;
  
  const smsWorker = new Worker(
    'sms-processing',
    async (job) => {
      console.log('🔄 Worker picked up SMS job:', job.id);
      console.log('📦 Job data:', {
        webhookEventId: job.data.webhookEventId,
        direction: job.data.payload?.event?.data?.direction,
        text: job.data.payload?.event?.data?.text?.substring(0, 50)
      });
      
      try {
        const { webhookEventId, payload } = job.data;
        await processSMSWebhook(webhookEventId, payload);
        console.log('✅ SMS job completed successfully:', job.id);
        return { success: true };
      } catch (error) {
        console.error('💥 CRITICAL ERROR in SMS job:', job.id);
        console.error('Error details:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
      }
    },
    {
      connection: getWorkerConnection(),
      concurrency: 5,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );
  
  smsWorker.on('ready', () => {
    console.log('📱 SMS Worker is ready and listening for jobs');
  });
  
  smsWorker.on('active', (job) => {
    console.log('🔄 Worker picked up job:', job.id);
  });
  
  smsWorker.on('completed', (job) => {
    console.log('✅ Worker completed job:', job.id);
  });
  
  smsWorker.on('failed', (job, err) => {
    console.error('❌ SMS job failed:', job?.id, err.message);
  });
  
  smsWorker.on('error', (err) => {
    console.error('💥 Worker error:', err);
  });

  // Calendly Worker
  new Worker(
    'calendly-processing',
    async (job) => {
      const { webhookEventId, payload } = job.data;
      await processCalendlyWebhook(webhookEventId, payload);
    },
    {
      connection: getWorkerConnection(),
      concurrency: 3,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );
};

export { getQueueConnection as connection };
export { getQueueConnection as redis };