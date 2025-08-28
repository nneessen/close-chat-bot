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

// Create separate connections for queue and worker (BullMQ requirement)
const queueConnection = createRedisConnection();
const workerConnection = createRedisConnection();

// SMS processing queue
export const smsQueue = new Queue('sms-processing', { connection: queueConnection });

// Calendly webhook queue
export const calendlyQueue = new Queue('calendly-processing', { connection: queueConnection });

// SMS Worker
if (process.env.NODE_ENV !== 'test') {
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

export { queueConnection as connection };
export { queueConnection as redis };