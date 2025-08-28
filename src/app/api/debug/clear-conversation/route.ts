import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('🧹 Clearing all test conversation messages...');
    
    // Find the lead for phone number 859-433-5907 (your test phone)
    const testLead = await prisma.lead.findFirst({
      where: {
        phone: {
          contains: '8594335907' // Phone without formatting
        }
      }
    });
    
    if (!testLead) {
      return NextResponse.json({
        success: false,
        error: 'Test lead not found for phone 859-433-5907'
      }, { status: 404 });
    }
    
    console.log(`🎯 Found test lead: ${testLead.firstName} ${testLead.lastName} (${testLead.phone})`);
    
    // Get all conversations for this lead
    const conversations = await prisma.conversation.findMany({
      where: { leadId: testLead.id }
    });
    
    console.log(`📞 Found ${conversations.length} conversations for test lead`);
    
    // Delete all messages for this lead's conversations
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        conversationId: {
          in: conversations.map(c => c.id)
        }
      }
    });
    
    // Delete all conversations for this lead
    const deletedConversations = await prisma.conversation.deleteMany({
      where: { leadId: testLead.id }
    });
    
    // Also clean up webhook events related to this lead's SMS
    const deletedWebhookEvents = await prisma.webhookEvent.deleteMany({
      where: {
        source: 'close',
        eventType: 'activity.sms'
      }
    });
    
    console.log(`✅ Deleted ${deletedMessages.count} messages`);
    console.log(`✅ Deleted ${deletedConversations.count} conversations`);
    console.log(`✅ Deleted ${deletedWebhookEvents.count} webhook events`);
    
    return NextResponse.json({
      success: true,
      message: `Cleared all conversation data for test lead ${testLead.firstName}`,
      deleted: {
        messages: deletedMessages.count,
        conversations: deletedConversations.count,
        webhookEvents: deletedWebhookEvents.count
      },
      lead: {
        name: `${testLead.firstName} ${testLead.lastName}`,
        phone: testLead.phone
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to clear conversation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}