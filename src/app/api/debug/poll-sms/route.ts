import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processSMSWebhook } from '@/services/sms-processor';

export async function POST() {
  try {
    console.log('🔍 [POLL SMS] Polling Close.io for new inbound SMS messages...');
    
    // Get the last processed SMS ID from database
    const lastProcessed = await prisma.message.findFirst({
      where: {
        closeActivityId: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: { closeActivityId: true }
    });

    console.log('📍 Last processed SMS ID:', lastProcessed?.closeActivityId || 'none');

    // Fetch recent SMS activities from Close.io API
    const response = await fetch('https://api.close.com/api/v1/activity/sms/?limit=20', {
      headers: {
        'Authorization': `Basic ${Buffer.from('api_54ipVPUoQ6LBx5NjRP5h9X.35GXqG36nRjwxho96z2PJO:').toString('base64')}`
      }
    });

    const data = await response.json();
    console.log(`📨 Found ${data.data.length} recent SMS activities`);

    let processedCount = 0;

    // Process each inbound SMS that we haven't seen yet
    for (const sms of data.data) {
      if (sms.direction === 'inbound' && sms.id !== lastProcessed?.closeActivityId) {
        console.log(`🔄 Processing inbound SMS: ${sms.id} - "${sms.text}"`);
        
        // Create a fake webhook payload matching Close.io format
        const fakeWebhookPayload = {
          event: {
            object_type: 'activity.sms',
            action: 'created',
            data: sms
          }
        };

        try {
          await processSMSWebhook(`poll-${sms.id}`, fakeWebhookPayload);
          processedCount++;
          console.log(`✅ Processed SMS ${sms.id} successfully`);
        } catch (error) {
          console.error(`❌ Failed to process SMS ${sms.id}:`, error);
        }

        // Only process one at a time to avoid overwhelming the system
        break;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} new inbound SMS messages`,
      processed: processedCount
    });

  } catch (error) {
    console.error('❌ SMS polling error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}