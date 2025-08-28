import { NextRequest, NextResponse } from 'next/server';
import { processSMSWebhook } from '@/services/sms-processor';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Starting SMS processing test...');
    
    // Test with a realistic SMS payload
    const testPayload = {
      event: {
        object_type: 'activity.sms',
        action: 'created',
        data: {
          id: 'test_sms_' + Date.now(),
          direction: 'inbound',
          text: 'Hi, I got your message about life insurance. Can you tell me more?',
          lead_id: 'lead_test_debug',
          contact_id: 'cont_test_debug',
          remote_phone: '+15551234567',
          local_phone: '+15559876543',
          date_created: new Date().toISOString()
        }
      }
    };

    console.log('📤 Testing SMS processing with payload:', testPayload);
    
    // Process the SMS
    await processSMSWebhook('test-webhook-event', testPayload);
    
    console.log('✅ SMS processing test completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'SMS processing test completed',
      payload: testPayload
    });
    
  } catch (error) {
    console.error('❌ SMS processing test failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}