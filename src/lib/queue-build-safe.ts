// Build-safe queue exports that don't initialize anything during build
export const getSmsQueue = () => {
  // During build, return null
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return null;
  }
  
  // At runtime, lazy load the actual queue
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getSmsQueue: realGetSmsQueue } = require('./queue-lazy');
  return realGetSmsQueue();
};

export const getCalendlyQueue = () => {
  // During build, return null
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return null;
  }
  
  // At runtime, lazy load the actual queue
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCalendlyQueue: realGetCalendlyQueue } = require('./queue-lazy');
  return realGetCalendlyQueue();
};

export const redis = process.env.SKIP_ENV_VALIDATION === 'true' ? null : (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { redis: realRedis } = require('./queue-lazy');
  return realRedis;
})();

// Legacy exports for compatibility
export const smsQueue = getSmsQueue();
export const calendlyQueue = getCalendlyQueue();
export const connection = redis;