import { NextResponse } from 'next/server';
import { smsQueue } from '@/lib/queue';
import { prisma } from '@/lib/prisma';
import { processSMSWebhook } from '@/services/sms-processor';

export async function POST() {
  try {
    console.log('🧹 Clearing SMS queue of all pending jobs...');
    
    // Clear all jobs
    await smsQueue.clean(0, 100, 'completed');
    await smsQueue.clean(0, 100, 'failed'); 
    await smsQueue.clean(0, 100, 'active');
    await smsQueue.clean(0, 100, 'waiting');
    await smsQueue.clean(0, 100, 'delayed');
    
    console.log('✅ SMS queue cleared successfully');
    
    // Also poll for new inbound SMS messages
    console.log('🔍 [POLL SMS] Polling Close.io for new inbound SMS messages...');
    
    try {
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
        message: `Queue cleared - old test jobs removed. Processed ${processedCount} new inbound SMS messages`,
        processed: processedCount
      });
      
    } catch (pollError) {
      console.error('❌ SMS polling error:', pollError);
      return NextResponse.json({ 
        success: true, 
        message: 'Queue cleared - old test jobs removed, but SMS polling failed',
        pollError: pollError instanceof Error ? pollError.message : 'Unknown polling error'
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to clear queue:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}