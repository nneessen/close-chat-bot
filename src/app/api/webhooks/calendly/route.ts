import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCalendlyQueue } from '@/lib/queue-build-safe';
import { CalendlyWebhookPayload } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('calendly-webhook-signature');
    const timestamp = req.headers.get('calendly-webhook-timestamp');
    
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }

    const body = await req.text();
    
    // Verify webhook signature
    if (!verifyCalendlyWebhookSignature(body, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: CalendlyWebhookPayload = JSON.parse(body);
    
    // Store webhook event for processing
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'calendly',
        eventType: payload.event,
        payload: JSON.parse(JSON.stringify(payload)),
      },
    });

    // Process Calendly events
    const calendlyQueue = getCalendlyQueue();
    if (calendlyQueue) {
      await calendlyQueue.add('process-calendly', {
        webhookEventId: webhookEvent.id,
        payload,
      });
    }

    return NextResponse.json({ success: true, eventId: webhookEvent.id });
  } catch (error) {
    console.error('Calendly webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function verifyCalendlyWebhookSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('CALENDLY_WEBHOOK_SECRET not configured');
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

  // Calendly uses base64 encoding for signatures
  const expectedSignatureBase64 = Buffer.from(expectedSignature, 'hex').toString('base64');
  
  return signature === expectedSignatureBase64;
}