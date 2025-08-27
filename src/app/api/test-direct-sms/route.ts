import { NextResponse } from 'next/server';
import { processSMSWebhook } from '@/services/sms-processor';

export async function GET(request: Request) {
  console.log('🧪 DIRECT SMS TEST - Bypassing queue completely');
  
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const text = url.searchParams.get('text') || "What's mortgage protection?";
    const phone = url.searchParams.get('phone') || "+18594335907";
    const leadId = url.searchParams.get('leadId') || "lead_uVa1k4FlHORc34z1FK9HTmodL91Y6OTl46gzQHbeENS";
    
    console.log('📋 Test parameters:', { text, phone, leadId });
    
    // Create test payload matching your real SMS
    const testPayload = {
      subscription_id: "whsub_1zcocYyghJqfQHMMeHQx4z",
      event: {
        id: "test_direct",
        object_type: "activity.sms",
        action: "created",
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
        organization_id: "orga_EoYT3qlJ3nVuOT0M01ftlet88gYevSIRjCWjA5em6DJ",
        user_id: null,
        request_id: null,
        api_key_id: null,
        oauth_client_id: null,
        oauth_scope: null,
        object_id: "test_direct",
        lead_id: leadId,
        changed_fields: [],
        meta: {},
        data: {
          id: `test_direct_${Date.now()}`,
          direction: "inbound",
          text: text,
          lead_id: leadId,
          local_phone: "+18723127425",
          remote_phone: phone
        },
        previous_data: {}
      }
    };

    // First create a webhook event record
    console.log('📝 Creating test webhook event...');
    const { prisma } = await import('@/lib/prisma');
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'close',
        eventType: 'activity.sms',
        payload: JSON.parse(JSON.stringify(testPayload)),
      },
    });
    
    console.log('🚀 CALLING processSMSWebhook DIRECTLY...');
    await processSMSWebhook(webhookEvent.id, testPayload);
    console.log('✅ DIRECT SMS TEST COMPLETED');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Direct SMS test completed - check terminal logs' 
    });
  } catch (error) {
    console.error('💥 DIRECT SMS TEST FAILED:', error);
    console.error('💥 Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      response: error && typeof error === 'object' && 'response' in error ? (error as Record<string, unknown>).response : undefined
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: (error && typeof error === 'object' && 'response' in error ? (error as Record<string, unknown>).response : undefined) || 'No response data',
        fullError: String(error)
      },
      { status: 500 }
    );
  }
}