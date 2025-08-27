import { NextResponse } from 'next/server';
import { closeService } from '@/services/close';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const leadId = url.searchParams.get('leadId') || 'lead_uVa1k4FlHORc34z1FK9HTmodL91Y6OTl46gzQHbeENS';
    
    console.log('🔍 Debugging Close.io lead:', leadId);
    
    const leadData = await closeService.getLead(leadId);
    
    return NextResponse.json({
      success: true,
      leadData: leadData,
      contacts: leadData?.contacts || [],
      emails: leadData?.contacts?.[0]?.emails || [],
      extractedEmail: leadData?.contacts?.[0]?.emails?.[0]?.email || null
    }, { status: 200 });
  } catch (error) {
    console.error('❌ Debug lead error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: String(error)
      },
      { status: 500 }
    );
  }
}