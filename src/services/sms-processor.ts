import { prisma } from '@/lib/prisma';
import { CloseWebhookPayload } from '@/types';
import { llmService } from './llm';
import { closeService } from './close';
import { appointmentBookingService } from './appointment-booking';
import { conversationLearningService } from './conversation-learning';
import { leadNurturingService } from './lead-nurturing';
import { BotType, MessageRole, ConversationStatus, Lead } from '@prisma/client';

export async function processSMSWebhook(
  webhookEventId: string,
  payload: CloseWebhookPayload
) {
  try {
    console.log(`🔄 Processing SMS webhook event: ${webhookEventId}`);
    console.log('📄 Payload:', JSON.stringify({
      object_type: payload.event.object_type,
      action: payload.event.action,
      direction: payload.event.data.direction,
      text: payload.event.data.text?.substring(0, 50),
      lead_id: payload.event.data.lead_id,
      remote_phone: payload.event.data.remote_phone
    }));
    
    // Only process inbound SMS messages
    if (payload.event.object_type === 'activity.sms' && 
        payload.event.action === 'created' &&
        payload.event.data.direction === 'inbound') {
      
      console.log('✅ Processing inbound SMS...');
      await handleInboundSMS(payload.event.data);
      console.log('✅ Finished processing inbound SMS');
    } else {
      console.log('🚫 Skipping non-inbound SMS:', {
        object_type: payload.event.object_type,
        action: payload.event.action,
        direction: payload.event.data.direction
      });
    }

    // Mark webhook as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

  } catch (error) {
    console.error(`Failed to process SMS webhook ${webhookEventId}:`, error);
    
    // Mark webhook as failed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date(),
      },
    });
    
    throw error;
  }
}

async function handleInboundSMS(smsData: { [key: string]: unknown; id: string }) {
  console.log('📞 Handling inbound SMS from:', smsData.remote_phone);
  console.log('💬 Message:', smsData.text);
  
  // Get or create lead
  console.log('👤 Getting/creating lead...');
  const lead = await getOrCreateLead(smsData.lead_id as string, smsData.remote_phone as string);
  console.log('✅ Lead found/created:', lead.id);
  
  // Determine bot type based on message content and lead context
  console.log('🤖 Determining bot type...');
  const botType = await determineBotType(smsData.text as string);
  console.log('🎯 Bot type:', botType);
  
  // Get or create conversation
  console.log('💭 Getting/creating conversation...');
  const conversation = await getOrCreateConversation(lead.id, botType);
  console.log('✅ Conversation:', conversation.id);
  
  // Save the user message (check if it already exists first)
  console.log('💾 Saving user message...');
  const existingMessage = await prisma.message.findUnique({
    where: { closeActivityId: smsData.id }
  });
  
  if (existingMessage) {
    console.log('⚠️ Message already exists, skipping duplicate:', smsData.id);
    return; // Don't process the same SMS twice
  }
  
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: smsData.text as string,
      closeActivityId: smsData.id,
      metadata: {
        direction: smsData.direction as string,
        localPhone: smsData.local_phone as string,
        remotePhone: smsData.remote_phone as string,
      },
    },
  });

  // Generate bot response
  console.log('🧠 Generating bot response...');
  const response = await generateBotResponse(conversation.id, smsData.text as string, botType, lead);
  
  if (response) {
    console.log('✅ Bot response generated:', response.content.substring(0, 50) + '...');
    
    // Save bot response to database
    console.log('💾 Saving bot response to database...');
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: response.content,
        tokens: response.tokens,
        metadata: {
          model: response.model,
          finishReason: response.finishReason,
        },
      },
    });

    // Send response via Close.io
    console.log('📱 Sending SMS via Close.io...');
    const smsParams = {
      leadId: smsData.lead_id as string,
      text: response.content,
      localPhone: smsData.local_phone as string,
      remotePhone: smsData.remote_phone as string,
    };
    console.log('📋 SMS Parameters:', smsParams);
    
    await closeService.sendSMS(smsParams);
    console.log('✅ SMS sent successfully!');

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else {
    console.log('❌ No response generated by bot - skipping SMS send');
  }
}

async function getOrCreateLead(closeLeadId: string, phone: string) {
  let lead = await prisma.lead.findUnique({
    where: { closeId: closeLeadId },
  });

  if (!lead) {
    // Fetch lead details from Close.io
    const closeLeadData = await closeService.getLead(closeLeadId);
    
    lead = await prisma.lead.create({
      data: {
        closeId: closeLeadId,
        phone: phone,
        firstName: closeLeadData?.contacts?.[0]?.name?.split(' ')[0],
        lastName: closeLeadData?.contacts?.[0]?.name?.split(' ').slice(1).join(' '),
        email: closeLeadData?.contacts?.[0]?.emails?.[0]?.email,
        metadata: closeLeadData ? JSON.parse(JSON.stringify(closeLeadData)) : null,
      },
    });
  } else if (!lead.email) {
    // If lead exists but doesn't have email, update it from Close.io
    const closeLeadData = await closeService.getLead(closeLeadId);
    const emailFromClose = closeLeadData?.contacts?.[0]?.emails?.[0]?.email;
    
    if (emailFromClose) {
      lead = await prisma.lead.update({
        where: { closeId: closeLeadId },
        data: {
          email: emailFromClose,
          firstName: closeLeadData?.contacts?.[0]?.name?.split(' ')[0] || lead.firstName,
          lastName: closeLeadData?.contacts?.[0]?.name?.split(' ').slice(1).join(' ') || lead.lastName,
          metadata: closeLeadData ? JSON.parse(JSON.stringify(closeLeadData)) : lead.metadata,
        },
      });
      console.log('✅ Updated existing lead with email from Close.io:', emailFromClose);
    }
  }

  return lead;
}

async function getOrCreateConversation(leadId: string, botType: BotType) {
  // Look for active conversation of this type
  let conversation = await prisma.conversation.findFirst({
    where: {
      leadId,
      botType,
      status: ConversationStatus.active,
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        leadId,
        botType,
        status: ConversationStatus.active,
      },
    });
  }

  return conversation;
}

async function determineBotType(messageContent: string): Promise<BotType> {
  const lowerContent = messageContent.toLowerCase();
  
  // Keywords that indicate appointment scheduling
  const appointmentKeywords = [
    'appointment', 'schedule', 'meeting', 'book', 'available',
    'calendar', 'time slots', 'when can', 'what time', 'consultation'
  ];
  
  // Check if message is a number (1-9) for time slot selection
  const isNumberSelection = /^[1-9]$/.test(messageContent.trim());
  
  // Don't trigger appointment mode for nurturing questions
  const isNurturingQuestion = lowerContent.includes('couple questions') || 
                              lowerContent.includes('ask you') ||
                              lowerContent.includes('before we hop on');
  
  // Check if message contains appointment-related keywords (but not nurturing questions)
  const hasAppointmentKeywords = !isNurturingQuestion && appointmentKeywords.some(keyword => 
    lowerContent.includes(keyword)
  );
  
  if (hasAppointmentKeywords || isNumberSelection) {
    return BotType.APPOINTMENT;
  }
  
  // Default to objection handler for other conversations
  return BotType.OBJECTION_HANDLER;
}

async function generateBotResponse(
  conversationId: string,
  userMessage: string,
  botType: BotType,
  lead: Lead
) {
  // Get conversation history
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  // First, try lead nurturing flow for all conversations
  console.log('🎯 Using lead nurturing service');
  
  const nurturingContext = {
    leadInfo: {
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'there',
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || undefined,
      phone: lead.phone,
      leadId: lead.id,
      state: extractStateFromMetadata(lead.metadata as Record<string, unknown> | null),
    },
    userMessage,
    conversationId,
    previousMessages: messages.map(msg => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
    })),
  };

  try {
    const nurturingResult = await leadNurturingService.processNurturingFlow(nurturingContext);
    
    // If we're at appointment booking stage, use appointment service
    if (nurturingResult.stage === 'appointment_booking' || botType === BotType.APPOINTMENT) {
      console.log('🤖 Switching to appointment booking service');
      
      const appointmentContext = {
        leadInfo: nurturingContext.leadInfo,
        userMessage,
        conversationId,
        previousMessages: nurturingContext.previousMessages,
      };

      try {
        const bookingResult = await appointmentBookingService.handleAppointmentRequest(appointmentContext);
        
        return {
          content: bookingResult.response,
          tokens: bookingResult.response.length / 4,
          finishReason: 'stop',
          model: 'appointment-booking-system'
        };
      } catch (error) {
        console.error('❌ Appointment booking error:', error);
        // Fall back to nurturing response
      }
    }

    // Return the nurturing service response
    return {
      content: nurturingResult.response,
      tokens: nurturingResult.response.length / 4,
      finishReason: 'stop',
      model: 'lead-nurturing-system'
    };
  } catch (error) {
    console.error('❌ Lead nurturing error:', error);
    // Fall back to existing logic
  }

  // For non-appointment bot or if appointment booking fails, use AI with learned patterns
  const conversationMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  // Determine lead age from Close.io data
  const closeLeadData = await closeService.getLead(lead.closeId || '');
  const leadAge = closeLeadData ? calculateLeadAge(closeLeadData.date_created) : { type: 'aged' as const, daysOld: 30 };
  
  console.log('📊 Lead age:', leadAge);

  // Try to get a successful pattern from your previous conversations
  const learnedResponse = await conversationLearningService.getBestResponseForContext(
    leadAge,
    userMessage,
    determineConversationStageFromHistory(conversationMessages)
  );

  if (learnedResponse) {
    console.log('🎯 Using learned response pattern');
    return {
      content: learnedResponse,
      tokens: learnedResponse.length / 4,
      finishReason: 'stop',
      model: 'learned-pattern'
    };
  }

  // Fall back to AI with enhanced context including lead age  
  const context = {
    leadInfo: {
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      email: lead.email || undefined,
      phone: lead.phone,
      leadAge: leadAge.type,
      daysOld: leadAge.daysOld
    },
    previousMessages: conversationMessages.map(msg => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
    })),
    botType: mapBotTypeToContext(botType),
  };

  return await llmService.generateResponse(userMessage, context);
}

function calculateLeadAge(dateCreated: string): { type: 'fresh' | 'aged'; daysOld: number } {
  const createdDate = new Date(dateCreated);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    type: diffDays <= 14 ? 'fresh' : 'aged',
    daysOld: diffDays
  };
}

function determineConversationStageFromHistory(messages: Array<{ content: string }>): string {
  if (messages.length === 0) return 'opening';
  if (messages.length <= 2) return 'opening';
  
  const recentMessages = messages.slice(-3);
  const combinedText = recentMessages.map(m => m.content).join(' ').toLowerCase();
  
  if (combinedText.includes('schedule') || combinedText.includes('appointment') || combinedText.includes('available')) {
    return 'appointment_setting';
  }
  
  if (combinedText.includes('qualify') || combinedText.includes('coverage') || combinedText.includes('spouse')) {
    return 'qualification';
  }
  
  if (messages.length > 6) return 'closing';
  
  return 'objection';
}

function extractStateFromMetadata(metadata: Record<string, unknown> | null): string | undefined {
  if (!metadata) return undefined;
  
  // Try to extract state from various possible fields in Close.io metadata
  if (metadata.addresses && Array.isArray(metadata.addresses) && metadata.addresses[0] && 
      typeof metadata.addresses[0] === 'object' && metadata.addresses[0] !== null &&
      'state' in metadata.addresses[0] && typeof metadata.addresses[0].state === 'string') {
    return metadata.addresses[0].state;
  }
  
  if (metadata.custom && typeof metadata.custom === 'object') {
    for (const [key, value] of Object.entries(metadata.custom)) {
      if (key.toLowerCase().includes('state') && typeof value === 'string') {
        return value;
      }
    }
  }
  
  return undefined;
}

function mapBotTypeToContext(botType: BotType): 'appointment' | 'objection' | 'general' {
  switch (botType) {
    case BotType.APPOINTMENT:
      return 'appointment';
    case BotType.OBJECTION_HANDLER:
      return 'objection';
    case BotType.GENERAL:
      return 'general';
    default:
      return 'general';
  }
}