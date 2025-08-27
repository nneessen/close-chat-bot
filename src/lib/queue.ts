import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { processSMSWebhook } from '@/services/sms-processor';
import { processCalendlyWebhook } from '@/services/calendly-processor';

// Parse Redis URL for authentication
const parseRedisUrl = (url: string) => {
  try {
    const redisUrl = new URL(url);
    return {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379'),
      password: redisUrl.password || undefined,
      username: redisUrl.username || 'default',
    };
  } catch {
    // Fallback for local development
    return {
      host: 'localhost',
      port: 6379,
    };
  }
};

const redisConfig = parseRedisUrl(process.env.REDIS_URL!);

// Create separate connections for queue and worker (BullMQ requirement)
const queueConnection = new Redis({
  ...redisConfig,
  maxRetriesPerRequest: null,
});

const workerConnection = new Redis({
  ...redisConfig,
  maxRetriesPerRequest: null,
});

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