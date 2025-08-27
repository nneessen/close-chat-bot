import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
import { smsQueue } from '@/lib/queue';
import { CloseWebhookPayload } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('close-sig-hash');
    const timestamp = req.headers.get('close-sig-timestamp');
    
    // TEMPORARILY DISABLED FOR TESTING
    // if (!signature || !timestamp) {
    //   return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    // }

    const body = await req.text();
    
    // Verify webhook signature
    // TEMPORARILY DISABLED FOR TESTING
    // if (!verifyWebhookSignature(body, signature, timestamp)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const payload: CloseWebhookPayload = JSON.parse(body);
    
    // Store webhook event for processing
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'close',
        eventType: payload.event.object_type,
        payload: JSON.parse(JSON.stringify(payload)),
      },
    });

    // Only process INBOUND SMS messages
    if (payload.event.object_type === 'activity.sms' && 
        payload.event.action === 'created' &&
        payload.event.data.direction === 'inbound') {
      
      console.log('📥 Adding INBOUND SMS to queue:', {
        eventId: webhookEvent.id,
        direction: payload.event.data.direction,
        text: payload.event.data.text?.substring(0, 50)
      });
      
      const job = await smsQueue.add('process-sms', {
        webhookEventId: webhookEvent.id,
        payload,
      });
      
      console.log('✅ SMS job added to queue:', job.id);
    } else if (payload.event.object_type === 'activity.sms') {
      console.log('🚫 Ignoring outbound SMS:', {
        direction: payload.event.data.direction,
        text: payload.event.data.text?.substring(0, 30)
      });
    }

    return NextResponse.json({ success: true, eventId: webhookEvent.id });
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