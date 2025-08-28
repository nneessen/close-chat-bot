import { prisma } from '@/lib/prisma';
import { CloseWebhookPayload } from '@/types';
import { llmService } from './llm';
import { closeService } from './close';
import { appointmentBookingService } from './appointment-booking';
import { conversationLearningService } from './conversation-learning';
import { leadNurturingService } from './lead-nurturing';
import { templateEngine } from './template-engine';
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
  
  // Check if bot is enabled
  console.log('🤖 Checking bot status...');
  const botConfig = await prisma.systemConfig.findUnique({
    where: { key: 'bot_enabled' }
  });
  
  const isBotEnabled = botConfig?.value === true;
  console.log(`🤖 Bot status: ${isBotEnabled ? 'ENABLED' : 'DISABLED'}`);
  
  if (!isBotEnabled) {
    console.log('🚫 Bot is disabled - skipping SMS processing');
    return;
  }
  
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

    // Add natural delay before responding (3-8 seconds to seem more human)
    const delaySeconds = Math.floor(Math.random() * 5) + 3; // 3-7 seconds
    console.log(`⏳ Adding ${delaySeconds} second delay before responding...`);
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

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
  // CRITICAL FIX: Get ALL conversation history for this lead, not just current conversation
  // This was causing the bot to lose context when switching between bot types
  const messages = await prisma.message.findMany({
    where: { 
      conversation: {
        leadId: lead.id
      }
    },
    orderBy: { createdAt: 'asc' },
    take: 20, // Increased from 10 to get more context
    include: {
      conversation: {
        select: {
          botType: true
        }
      }
    }
  });

  console.log(`📚 Retrieved ${messages.length} messages from ALL conversations for lead ${lead.id}`);
  
  // Log conversation history for debugging
  if (messages.length > 0) {
    console.log('🔍 Recent conversation history:');
    messages.slice(-5).forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.conversation.botType}] ${msg.role}: "${msg.content.substring(0, 100)}..."`);
    });
  } else {
    console.log('⚠️ WARNING: No conversation history found for this lead!');
  }

  // Check for duplicate responses to prevent repetition
  const lastBotMessage = messages
    .filter(msg => msg.role === MessageRole.ASSISTANT)
    .pop();

  // CRITICAL: Detect if we're mid-conversation and prevent inappropriate introductory responses
  const hasExistingConversation = messages.filter(msg => msg.role === MessageRole.USER).length > 1;
  const lastUserMessage = messages.filter(msg => msg.role === MessageRole.USER).pop()?.content || '';
  
  if (hasExistingConversation) {
    console.log('🚨 EXISTING CONVERSATION DETECTED - preventing introduction message');
    console.log(`📝 Last user message: "${lastUserMessage}"`);
    console.log(`📝 Current user message: "${userMessage}"`);
  }

  console.log('🧠 Generating response for:', {
    userMessage: userMessage.substring(0, 50),
    botType,
    messageCount: messages.length,
    lastBotContent: lastBotMessage?.content.substring(0, 50),
    conversationTypes: [...new Set(messages.map(m => m.conversation.botType))]
  });

  // Simple appointment detection
  const isAppointmentRequest = 
    botType === BotType.APPOINTMENT || 
    userMessage.toLowerCase().includes('schedule') ||
    userMessage.toLowerCase().includes('appointment') ||
    userMessage.toLowerCase().includes('book') ||
    userMessage.toLowerCase().includes('available') ||
    /^[1-9]$/.test(userMessage.trim()); // Time slot selection

  if (isAppointmentRequest) {
    console.log('📅 Handling appointment request');
    
    const appointmentContext = {
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
        botType: msg.conversation.botType,
      })),
    };

    try {
      const bookingResult = await appointmentBookingService.handleAppointmentRequest(appointmentContext);
      
      // Check for duplicate response
      if (lastBotMessage && lastBotMessage.content === bookingResult.response) {
        console.log('⚠️ Duplicate response detected, using fallback');
        return await generateFallbackResponse(userMessage, lead, messages);
      }
      
      return {
        content: bookingResult.response,
        tokens: bookingResult.response.length / 4,
        finishReason: 'stop',
        model: 'appointment-booking-system'
      };
    } catch (error) {
      console.error('❌ Appointment booking error:', error);
    }
  }

  // TEMPLATE SYSTEM DISABLED - BROKEN - Use lead nurturing for conversation flow
  console.log('🎯 Using lead nurturing service (template system disabled - broken)');
  
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
      botType: msg.conversation.botType,
    })),
  };

  try {
    const nurturingResult = await leadNurturingService.processNurturingFlow(nurturingContext);
    
    // Check for duplicate response
    if (lastBotMessage && lastBotMessage.content === nurturingResult.response) {
      console.log('⚠️ Duplicate nurturing response detected, using LLM fallback');
      return await generateFallbackResponse(userMessage, lead, messages);
    }
    
    return {
      content: nurturingResult.response,
      tokens: nurturingResult.response.length / 4,
      finishReason: 'stop',
      model: 'lead-nurturing-system'
    };
  } catch (error) {
    console.error('❌ Lead nurturing error:', error);
  }

  // Fallback to AI response
  return await generateFallbackResponse(userMessage, lead, messages);
}

async function generateTemplateResponse(
  userMessage: string,
  lead: Lead,
  messages: Array<{ role: MessageRole; content: string; createdAt: Date; conversation: { botType: string } }>
) {
  console.log('📝 Using template engine for response generation');
  
  // Determine conversation category and subcategory
  const { category, subcategory, conversationStage } = analyzeMessageForTemplate(userMessage, messages);
  
  // Build template context
  const context = {
    firstName: lead.firstName || 'there',
    lastName: lead.lastName || '',
    email: lead.email || undefined,
    phone: lead.phone,
    state: extractStateFromMetadata(lead.metadata as Record<string, unknown> | null),
    
    conversationStage,
    previousMessage: messages.length > 0 ? messages[messages.length - 1]?.content : undefined,
    messageCount: messages.length,
    leadAge: calculateLeadAge(lead.createdAt).type,
    daysOld: calculateLeadAge(lead.createdAt).daysOld,
    
    timeOfDay: getTimeOfDay(),
    dayOfWeek: getDayOfWeek(),
    responseHistory: messages
      .filter(msg => msg.role === MessageRole.ASSISTANT)
      .slice(-5)
      .map(msg => msg.content)
  };
  
  try {
    const response = await templateEngine.getBestResponse(category, subcategory, context);
    
    return {
      content: response,
      tokens: response.length / 4,
      finishReason: 'stop',
      model: 'advanced-template-engine'
    };
  } catch (error) {
    console.error('❌ Template engine failed:', error);
    throw error;
  }
}

function analyzeMessageForTemplate(userMessage: string, messages: Array<{ role: MessageRole; content: string; createdAt: Date; conversation: { botType: string } }>) {
  const lowerMessage = userMessage.toLowerCase();
  const messageCount = messages.length;
  
  // Detect objections first
  if (lowerMessage.includes('expensive') || lowerMessage.includes('cost') || lowerMessage.includes('afford')) {
    return { category: 'objection', subcategory: 'price', conversationStage: 'objection_handling' };
  }
  
  if (lowerMessage.includes('busy') || lowerMessage.includes('time') || lowerMessage.includes('schedule')) {
    return { category: 'objection', subcategory: 'time', conversationStage: 'objection_handling' };
  }
  
  if (lowerMessage.includes('not interested') || lowerMessage.includes('no thanks')) {
    return { category: 'objection', subcategory: 'need', conversationStage: 'objection_handling' };
  }
  
  if (lowerMessage.includes('scam') || lowerMessage.includes('trust') || lowerMessage.includes('legitimate')) {
    return { category: 'objection', subcategory: 'trust', conversationStage: 'objection_handling' };
  }
  
  // Detect conversation stage
  if (messageCount <= 2) {
    return { category: 'opening', subcategory: 'introduction', conversationStage: 'opening' };
  }
  
  if (lowerMessage.includes('yes') || lowerMessage.includes('sure') || lowerMessage.includes('ok')) {
    if (messageCount <= 4) {
      return { category: 'permission', subcategory: 'initial_permission', conversationStage: 'permission' };
    } else {
      return { category: 'qualification', subcategory: 'coverage_status', conversationStage: 'qualification' };
    }
  }
  
  // Default to general response
  return { category: 'general', subcategory: 'default', conversationStage: 'general' };
}

function calculateLeadAge(createdAt: Date): { type: 'fresh' | 'aged'; daysOld: number } {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    type: diffDays <= 14 ? 'fresh' : 'aged',
    daysOld: diffDays
  };
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getDayOfWeek(): 'weekday' | 'weekend' {
  const day = new Date().getDay();
  return (day === 0 || day === 6) ? 'weekend' : 'weekday';
}

async function generateNurturingFallback(
  userMessage: string,
  lead: Lead,
  messages: Array<{ role: MessageRole; content: string; createdAt: Date; conversation: { botType: string } }>
) {
  console.log('🎯 Using lead nurturing fallback');
  
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
    conversationId: 'fallback',
    previousMessages: messages.map(msg => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      botType: msg.conversation.botType,
    })),
  };

  try {
    const nurturingResult = await leadNurturingService.processNurturingFlow(nurturingContext);
    
    return {
      content: nurturingResult.response,
      tokens: nurturingResult.response.length / 4,
      finishReason: 'stop',
      model: 'lead-nurturing-fallback'
    };
  } catch (error) {
    console.error('❌ Lead nurturing fallback error:', error);
    return null;
  }
}

async function generateFallbackResponse(
  userMessage: string, 
  lead: Lead, 
  messages: Array<{ role: MessageRole; content: string; createdAt: Date; conversation: { botType: string } }>
) {
  console.log('🤖 Using LLM fallback response');
  
  const context = {
    leadInfo: {
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'there',
      email: lead.email || undefined,
      phone: lead.phone,
      leadAge: 'unknown' as const,
      daysOld: 0
    },
    previousMessages: messages.map(msg => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      botType: msg.conversation.botType,
    })),
    botType: 'objection' as const,
  };

  return await llmService.generateResponse(userMessage, context);
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

