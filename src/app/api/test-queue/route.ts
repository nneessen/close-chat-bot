import { NextResponse } from 'next/server';
import { smsQueue } from '@/lib/queue';

export async function GET() {
  try {
    console.log('🧪 Adding test job to queue...');
    
    const testPayload = {
      subscription_id: "test",
      event: {
        id: "test",
        object_type: "activity.sms",
        action: "created",
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
        organization_id: "test",
        user_id: null,
        request_id: null,
        api_key_id: null,
        oauth_client_id: null,
        oauth_scope: null,
        object_id: "test",
        lead_id: "test",
        changed_fields: [],
        meta: {},
        data: {
          id: "test",
          direction: "inbound",
          text: "Test message",
          lead_id: "lead_test",
          local_phone: "+18723127425",
          remote_phone: "+18594335907"
        },
        previous_data: {}
      }
    };

    const job = await smsQueue.add('process-sms', {
      webhookEventId: 'test-event-id',
      payload: testPayload,
    });
    
    console.log('✅ Test job added:', job.id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test job added to queue',
      jobId: job.id 
    });
  } catch (error) {
    console.error('❌ Test queue error:', error);
    return NextResponse.json(
      { error: 'Failed to add test job' },
      { status: 500 }
    );
  }
}