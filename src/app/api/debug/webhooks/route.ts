import { NextResponse } from 'next/server';
import { closeService } from '@/services/close';

export async function GET() {
  try {
    console.log('🔍 Checking Close.io webhook configuration...');
    
    const webhooks = await closeService.getWebhookSubscriptions();
    
    const expectedUrl = 'https://close-chat-bot-production-7482.up.railway.app/api/webhooks/close';
    
    const analysis = {
      totalWebhooks: webhooks.length,
      webhooks: webhooks.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.is_active,
        isCorrectUrl: webhook.url === expectedUrl,
        dateCreated: webhook.date_created
      })),
      expectedUrl,
      hasCorrectWebhook: webhooks.some(w => w.url === expectedUrl && w.is_active),
      recommendations: []
    };

    // Add recommendations
    if (!analysis.hasCorrectWebhook) {
      analysis.recommendations.push('❌ No active webhook found pointing to the correct URL');
      analysis.recommendations.push(`✅ Create webhook with URL: ${expectedUrl}`);
      analysis.recommendations.push('✅ Ensure events include: activity.sms.created');
    }

    const incorrectWebhooks = webhooks.filter(w => 
      w.url.includes('close-chat-bot') && w.url !== expectedUrl
    );

    if (incorrectWebhooks.length > 0) {
      analysis.recommendations.push('⚠️ Found webhooks with incorrect URLs - update or delete them');
      incorrectWebhooks.forEach(w => {
        analysis.recommendations.push(`   - Update ${w.id}: ${w.url} → ${expectedUrl}`);
      });
    }

    console.log('📊 Webhook analysis:', JSON.stringify(analysis, null, 2));

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('❌ Error checking webhooks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check webhook configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}