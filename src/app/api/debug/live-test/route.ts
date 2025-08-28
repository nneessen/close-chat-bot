import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { smsQueue } from '@/lib/queue';

export async function POST(req: NextRequest) {
  console.log('🧪 LIVE WEBHOOK TEST - Simulating real Close.io webhook');
  
  const testPayload = {
    event: {
      object_type: 'activity.sms',
      action: 'created', 
      data: {
        id: 'test-live-' + Date.now(),
        direction: 'inbound',
        text: 'Live test message from diagnostic tool',
        lead_id: 'test-lead-diagnostic',
        remote_phone: '8723137425',
        local_phone: '5551234567'
      }
    }
  };

  try {
    console.log('📄 Test payload:', JSON.stringify(testPayload, null, 2));
    
    // Simulate the exact same process as the real webhook
    console.log('💾 Creating webhook event...');
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'close',
        eventType: testPayload.event.object_type,
        payload: testPayload,
      },
    });
    console.log('✅ Webhook event created:', webhookEvent.id);

    // Add to queue
    console.log('🔄 Adding to SMS queue...');
    const job = await smsQueue.add('process-sms', {
      webhookEventId: webhookEvent.id,
      payload: testPayload,
    });
    console.log('✅ Job added to queue:', job.id);

    return NextResponse.json({
      success: true,
      message: 'Live test webhook processed successfully',
      webhookEventId: webhookEvent.id,
      jobId: job.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Live test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}