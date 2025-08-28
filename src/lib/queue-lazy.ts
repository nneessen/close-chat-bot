import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { processSMSWebhook } from '@/services/sms-processor';
import { processCalendlyWebhook } from '@/services/calendly-processor';

// Don't initialize during build
const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true' || process.env.NODE_ENV === 'production' && !process.env.REDIS_URL;

// Lazy connection creation
let _queueConnection: Redis | null = null;
let _workerConnection: Redis | null = null;
let _smsQueue: Queue | null = null;
let _calendlyQueue: Queue | null = null;

const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log('🔗 Connecting to Redis:', redisUrl.replace(/:[^:@]*@/, ':***@'));
  
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

// Lazy getters
const getQueueConnection = () => {
  if (!_queueConnection && !isBuildTime) {
    _queueConnection = createRedisConnection();
  }
  return _queueConnection;
};

const getWorkerConnection = () => {
  if (!_workerConnection && !isBuildTime) {
    _workerConnection = createRedisConnection();
  }
  return _workerConnection;
};

// Export lazy queue instances
export const getSmsQueue = () => {
  if (!_smsQueue && !isBuildTime) {
    const connection = getQueueConnection();
    if (connection) {
      _smsQueue = new Queue('sms-processing', { connection });
    }
  }
  return _smsQueue;
};

export const getCalendlyQueue = () => {
  if (!_calendlyQueue && !isBuildTime) {
    const connection = getQueueConnection();
    if (connection) {
      _calendlyQueue = new Queue('calendly-processing', { connection });
    }
  }
  return _calendlyQueue;
};

// Initialize workers only at runtime
if (!isBuildTime && process.env.NODE_ENV !== 'test') {
  const workerConnection = getWorkerConnection();
  
  if (workerConnection) {
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
        connection: workerConnection,
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
        connection: workerConnection,
        concurrency: 3,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );
  }
}

// Export for compatibility
export const smsQueue = getSmsQueue();
export const calendlyQueue = getCalendlyQueue();
export const connection = getQueueConnection();
export const redis = connection;