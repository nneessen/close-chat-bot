import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
// Queue imported dynamically at runtime
import { CloseWebhookPayload } from '@/types';

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log('🔔 WEBHOOK HIT - /api/webhooks/close at', timestamp);
  console.log('🌐 Request URL:', req.url);
  console.log('🔍 All Headers:', Object.fromEntries(req.headers.entries()));
  console.log('🔍 Key Headers:', {
    'close-sig-hash': req.headers.get('close-sig-hash'),
    'close-sig-timestamp': req.headers.get('close-sig-timestamp'),
    'content-type': req.headers.get('content-type'),
    'user-agent': req.headers.get('user-agent'),
    'x-forwarded-for': req.headers.get('x-forwarded-for'),
  });
  console.log('📊 Environment Info:', {
    NODE_ENV: process.env.NODE_ENV,
    WEBHOOK_ENDPOINT_URL: process.env.WEBHOOK_ENDPOINT_URL,
    CLOSE_API_KEY: process.env.CLOSE_API_KEY ? 'SET' : 'MISSING',
    CLOSE_WEBHOOK_SECRET: process.env.CLOSE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
    REDIS_URL: process.env.REDIS_URL ? 'SET' : 'MISSING',
  });
  
  try {
    const signature = req.headers.get('close-sig-hash');
    const timestamp = req.headers.get('close-sig-timestamp');
    
    // TEMPORARILY DISABLED FOR TESTING
    // if (!signature || !timestamp) {
    //   return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    // }

    const body = await req.text();
    console.log('📄 Raw body length:', body.length);
    console.log('📄 Raw body preview:', body.substring(0, 200) + '...');
    
    // Verify webhook signature
    // TEMPORARILY DISABLED FOR TESTING
    // if (!verifyWebhookSignature(body, signature, timestamp)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    let payload: CloseWebhookPayload;
    try {
      payload = JSON.parse(body);
      console.log('✅ Successfully parsed JSON payload');
    } catch (parseError) {
      console.error('❌ Failed to parse JSON payload:', parseError);
      console.error('Body was:', body);
      throw new Error('Invalid JSON payload');
    }
    console.log('📦 Webhook payload:', {
      object_type: payload.event?.object_type,
      action: payload.event?.action,
      direction: payload.event?.data?.direction,
      text: payload.event?.data?.text?.substring(0, 100)
    });
    
    // Store webhook event for processing with duplicate handling
    console.log('💾 Attempting to store webhook event in database...');
    let webhookEvent;
    try {
      // First check if we already processed this exact webhook
      const existingEvent = await prisma.webhookEvent.findFirst({
        where: {
          source: 'close',
          eventType: payload.event.object_type,
          payload: {
            path: ['event', 'data', 'id'],
            equals: payload.event.data.id
          }
        }
      });

      if (existingEvent) {
        console.log('⚠️ Duplicate webhook detected, using existing event:', existingEvent.id);
        webhookEvent = existingEvent;
      } else {
        webhookEvent = await prisma.webhookEvent.create({
          data: {
            source: 'close',
            eventType: payload.event.object_type,
            payload: JSON.parse(JSON.stringify(payload)),
          },
        });
        console.log('✅ Webhook event stored successfully:', webhookEvent.id);
      }
    } catch (dbError) {
      console.error('❌ Database error storing webhook event:', dbError);
      
      // Simple fallback - just continue without storing the event if it's a duplicate
      if (dbError && typeof dbError === 'object' && 'code' in dbError && dbError.code === 'P2002') {
        console.log('🔄 Duplicate constraint error, continuing with mock webhook event...');
        webhookEvent = { id: 'duplicate-' + Date.now(), processed: false, processedAt: null, error: null } as typeof webhookEvent;
      } else {
        throw dbError;
      }
    }

    // Only process INBOUND SMS messages
    if (payload.event.object_type === 'activity.sms' && 
        payload.event.action === 'created' &&
        payload.event.data.direction === 'inbound') {
      
      console.log('📥 Adding INBOUND SMS to queue:', {
        eventId: webhookEvent?.id || 'unknown',
        direction: payload.event.data.direction,
        text: payload.event.data.text?.substring(0, 50)
      });
      
      console.log('🔄 Adding SMS job to queue...');
      try {
        // Dynamic import to avoid loading queue during build
        const { getSmsQueue } = await import('@/lib/queue-noop');
        const smsQueue = await getSmsQueue();
        if (!smsQueue) {
          throw new Error('SMS Queue not initialized - check Redis connection');
        }
        const job = await smsQueue.add('process-sms', {
          webhookEventId: webhookEvent?.id || 'temp-' + Date.now(),
          payload,
        });
        
        console.log('✅ SMS job added to queue:', job.id);
        console.log('📊 Job details:', {
          id: job.id,
          name: job.name,
          data: {
            webhookEventId: job.data.webhookEventId,
            eventType: job.data.payload?.event?.object_type,
            direction: job.data.payload?.event?.data?.direction
          }
        });
      } catch (queueError) {
        console.error('❌ Queue error adding SMS job:', queueError);
        throw queueError;
      }
    } else if (payload.event.object_type === 'activity.sms') {
      console.log('🚫 Ignoring outbound SMS:', {
        direction: payload.event.data.direction,
        text: payload.event.data.text?.substring(0, 30)
      });
    }

    return NextResponse.json({ success: true, eventId: webhookEvent?.id || 'processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  const secret = process.env.CLOSE_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('CLOSE_WEBHOOK_SECRET not configured');
    return false;
  }

  // Check timestamp to prevent replay attacks (5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);
  
  if (Math.abs(currentTime - webhookTime) > 300) {
    return false;
  }

  // Calculate expected signature
  const signedContent = `${timestamp}.${body}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  return signature === expectedSignature;
}