#!/usr/bin/env node

// Production server startup file with proper error handling
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

console.log('🚀 Starting Next.js server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', port);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Prepare and start the server
app.prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    })
    .on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`✅ Server ready on http://${hostname}:${port}`);
      console.log('📌 Environment variables status:');
      console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ MISSING');
      console.log('  REDIS_URL:', process.env.REDIS_URL ? '✓ SET' : '✗ MISSING');
      console.log('  CLOSE_API_KEY:', process.env.CLOSE_API_KEY ? '✓ SET' : '✗ MISSING');
      console.log('  WEBHOOK_ENDPOINT_URL:', process.env.WEBHOOK_ENDPOINT_URL ? '✓ SET' : '✗ MISSING');
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});