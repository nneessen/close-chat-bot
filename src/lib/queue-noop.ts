// No-op queue implementation for build time
// This file has ZERO external dependencies and cannot cause Redis connections

interface NoOpQueue {
  add: (name: string, data: any) => Promise<{ id: string }>;
}

interface NoOpRedis {
  ping: () => Promise<string>;
}

const noOpQueue: NoOpQueue = {
  add: async () => ({ id: 'noop-' + Date.now() })
};

const noOpRedis: NoOpRedis = {
  ping: async () => 'PONG'
};

// During build, return no-op implementations
// During runtime, dynamically import real implementations
export const getSmsQueue = async () => {
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return noOpQueue;
  }
  
  // At runtime, dynamically import the real queue
  try {
    const { getSmsQueue: realGetSmsQueue } = await import('./queue-lazy');
    return realGetSmsQueue();
  } catch (error) {
    console.error('Failed to load SMS queue:', error);
    return null;
  }
};

export const getCalendlyQueue = async () => {
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return noOpQueue;
  }
  
  // At runtime, dynamically import the real queue
  try {
    const { getCalendlyQueue: realGetCalendlyQueue } = await import('./queue-lazy');
    return realGetCalendlyQueue();
  } catch (error) {
    console.error('Failed to load Calendly queue:', error);
    return null;
  }
};

let _redis: any = null;
export const getRedis = async () => {
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return noOpRedis;
  }
  
  if (!_redis) {
    try {
      const { redis: realRedis } = await import('./queue-lazy');
      _redis = realRedis;
    } catch (error) {
      console.error('Failed to load Redis:', error);
      return null;
    }
  }
  return _redis;
};

export const redis = process.env.SKIP_ENV_VALIDATION === 'true' ? noOpRedis : null;

// Legacy exports
export const smsQueue = getSmsQueue();
export const calendlyQueue = getCalendlyQueue();
export const connection = redis;