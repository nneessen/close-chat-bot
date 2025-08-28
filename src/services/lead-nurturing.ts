import { prisma } from '@/lib/prisma';
import { BotType, MessageRole, Lead } from '@prisma/client';

export interface NurturingContext {
  leadInfo: {
    name: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    leadId: string;
    state?: string;
  };
  userMessage: string;
  conversationId: string;
  previousMessages: Array<{
    role: string;
    content: string;
    timestamp: string;
    botType?: string;
  }>;
}

export interface NurturingStage {
  stage: 'opening' | 'permission' | 'first_vs_replacement' | 'spouse_coverage' | 'license_confirm' | 'appointment_booking' | 'objection_handling';
  nextStage?: string;
  response: string;
  requiresFollowUp?: boolean;
}

export class LeadNurturingService {
  
  async processNurturingFlow(context: NurturingContext): Promise<NurturingStage> {
    const userResponse = context.userMessage.toLowerCase().trim();
    
    console.log('📝 User response:', userResponse);
    
    // Check for objections FIRST before any stage logic
    if (userResponse.includes('just send me a quote') || 
        userResponse.includes('just email me') ||
        userResponse.includes('send me information') ||
        userResponse.includes('not interested') ||
        userResponse.includes('no thanks') ||
        userResponse.includes('too busy') ||
        userResponse.includes('no time')) {
      console.log('🚫 Objection detected, handling...');
      return this.handleObjectionStage(context, userResponse);
    }
    
    const currentStage = this.determineCurrentStage(context.previousMessages);
    console.log('🎯 Current nurturing stage:', currentStage);

    switch (currentStage) {
      case 'opening':
        return this.handleOpeningStage(context);
      
      case 'permission':
        return this.handlePermissionStage(context, userResponse);
      
      case 'first_vs_replacement':
        return this.handleFirstVsReplacementStage(context, userResponse);
      
      case 'spouse_coverage':
        return this.handleSpouseCoverageStage(context, userResponse);
      
      case 'license_confirm':
        return this.handleLicenseConfirmStage(context, userResponse);
      
      case 'appointment_booking':
        return this.handleAppointmentBookingStage(context, userResponse);
      
      case 'objection_handling':
        return this.handleObjectionStage(context, userResponse);
      
      default:
        return this.handleOpeningStage(context);
    }
  }

  private determineCurrentStage(previousMessages: Array<{ role: string; content: string; botType?: string }>): string {
    if (previousMessages.length === 0) {
      return 'opening';
    }

    const botMessages = previousMessages.filter(m => m.role === 'ASSISTANT' || m.role === 'assistant');
    const userMessages = previousMessages.filter(m => m.role === 'USER' || m.role === 'user');
    
    const lastBotMessage = botMessages.pop()?.content.toLowerCase() || '';
    const lastUserMessage = userMessages.pop()?.content.toLowerCase() || '';
    
    // CRITICAL: If we have substantial conversation history, never go back to opening
    const allBotContentForStage = botMessages.map(m => m.content.toLowerCase()).join(' ');
    const hasIntroductionAlready = allBotContentForStage.includes('looking forward to speaking') || 
                                  allBotContentForStage.includes('assigned to go over') ||
                                  allBotContentForStage.includes('i\'m nick neessen');
    
    if (hasIntroductionAlready && previousMessages.length > 4) {
      console.log('🚨 CRITICAL: Extended conversation with introduction already sent - advancing stage');
    }

    console.log('🔍 Stage detection:', {
      messageCount: previousMessages.length,
      botMessageCount: botMessages.length + 1,
      userMessageCount: userMessages.length + 1,
      lastBot: lastBotMessage.substring(0, 50),
      lastUser: lastUserMessage.substring(0, 50)
    });

    // Check for objections FIRST - these override stage progression
    if (lastUserMessage.includes('just send me a quote') || 
        lastUserMessage.includes('just email me') ||
        lastUserMessage.includes('send me information') ||
        lastUserMessage.includes('not interested') ||
        lastUserMessage.includes('no thanks') ||
        lastUserMessage.includes('too busy') ||
        lastUserMessage.includes('no time')) {
      console.log('🚫 Detected objection:', lastUserMessage.substring(0, 50));
      return 'objection_handling';
    }

    // Progressive stage detection - check in order of conversation flow
    const allBotContent = botMessages.map(m => m.content.toLowerCase()).join(' ');
    
    // Check what we've already covered to prevent going backwards
    if (allBotContent.includes('available times') || allBotContent.includes('call to go over') || 
        allBotContent.includes('schedule a') || allBotContent.includes('set up a')) {
      return 'appointment_booking';
    }
    
    if (allBotContent.includes('insurance license') && allBotContent.includes('email')) {
      return 'license_confirm';
    }
    
    if (allBotContent.includes('just yourself or') || allBotContent.includes('spouse') || 
        allBotContent.includes('coverage for both')) {
      return 'spouse_coverage';
    }
    
    if (allBotContent.includes('first policy or') || allBotContent.includes('replace coverage')) {
      return 'first_vs_replacement';
    }
    
    if (allBotContent.includes('couple questions') || allBotContent.includes('do you mind if i ask')) {
      return 'permission';
    }

    // Default progression based on message count to prevent getting stuck
    if (previousMessages.length >= 8) return 'appointment_booking';
    if (previousMessages.length >= 6) return 'license_confirm';
    if (previousMessages.length >= 4) return 'spouse_coverage';  
    if (previousMessages.length >= 2) return 'first_vs_replacement';
    
    // Check if we've sent opening message
    if (allBotContent.includes('looking forward to speaking') || allBotContent.includes('assigned to go over')) {
      return 'permission';
    }

    return 'opening';
  }

  private handleOpeningStage(context: NurturingContext): NurturingStage {
    const { leadInfo, previousMessages } = context;
    
    // CRITICAL FIX: Check if we've already sent introduction messages in ANY conversation
    const allBotMessages = previousMessages.filter(m => m.role === 'ASSISTANT' || m.role === 'assistant');
    const hasIntroductionAlready = allBotMessages.some(msg => 
      msg.content.includes('Looking forward to speaking') || 
      msg.content.includes('assigned to go over') ||
      msg.content.includes('I\'m Nick Neessen')
    );
    
    if (hasIntroductionAlready || previousMessages.length > 2) {
      console.log('🚨 CRITICAL: Introduction already sent or mid-conversation - skipping to permission stage');
      return {
        stage: 'opening',
        nextStage: 'permission',
        response: `Do you mind if I ask you a couple questions before we hop on a call?`
      };
    }
    
    return {
      stage: 'opening',
      nextStage: 'permission',
      response: `Hi ${leadInfo.firstName}, I'm Nick Neessen. I was assigned to go over mortgage protection options with you. I sent you an email of my ${leadInfo.state || 'state'} insurance license to ${leadInfo.email}. Looking forward to speaking!`,
      requiresFollowUp: true
    };
  }

  private handlePermissionStage(context: NurturingContext, userResponse: string): NurturingStage {
    // Check if user is responding positively to permission request
    const positiveResponses = ['sure', 'yes', 'ok', 'go ahead', 'yeah', 'yep', 'fine', 'okay'];
    const isPositive = positiveResponses.some(word => userResponse.includes(word));

    if (isPositive) {
      return {
        stage: 'permission',
        nextStage: 'first_vs_replacement',
        response: 'Perfect! Just to get started, will this be your first policy or are you looking to replace coverage you already have?'
      };
    }

    // Handle objections at permission stage
    return {
      stage: 'objection_handling',
      response: `I understand you might have questions. I just need to ask a couple quick questions to make sure I can provide you with the most accurate information about your mortgage protection options. It'll just take a minute - is that okay?`
    };
  }

  private handleFirstVsReplacementStage(context: NurturingContext, userResponse: string): NurturingStage {
    const isFirst = userResponse.includes('first') || userResponse.includes('new') || userResponse.includes('don\'t have');
    const isReplacement = userResponse.includes('replace') || userResponse.includes('current') || userResponse.includes('have some') || userResponse.includes('existing');

    if (isFirst) {
      return {
        stage: 'first_vs_replacement',
        nextStage: 'spouse_coverage',
        response: 'Great! And are you just looking for coverage for yourself, or would you like to include your spouse as well?'
      };
    } else if (isReplacement) {
      return {
        stage: 'first_vs_replacement',
        nextStage: 'spouse_coverage',
        response: 'I see, looking to replace existing coverage. And will this new coverage be for just yourself, or for you and your spouse?'
      };
    }

    // If unclear response
    return {
      stage: 'first_vs_replacement',
      response: 'Just to clarify - do you currently have any mortgage protection coverage, or would this be your first policy?'
    };
  }

  private handleSpouseCoverageStage(context: NurturingContext, userResponse: string): NurturingStage {
    const justMe = userResponse.includes('just me') || userResponse.includes('myself') || userResponse.includes('only me') || userResponse.includes('single');
    const includeSpouse = userResponse.includes('spouse') || userResponse.includes('wife') || userResponse.includes('husband') || userResponse.includes('both') || userResponse.includes('us');

    let response = '';
    if (justMe) {
      response = 'Got it, just coverage for yourself. ';
    } else if (includeSpouse) {
      response = 'Perfect, coverage for both you and your spouse. ';
    } else {
      response = 'I want to make sure I understand - ';
    }

    response += `Have you received my ${context.leadInfo.state || 'state'} insurance license in your email? I always send that first so you know you're working with a licensed professional.`;

    return {
      stage: 'spouse_coverage',
      nextStage: 'license_confirm',
      response
    };
  }

  private handleLicenseConfirmStage(context: NurturingContext, userResponse: string): NurturingStage {
    const confirmed = userResponse.includes('yes') || userResponse.includes('got it') || userResponse.includes('received') || userResponse.includes('saw it');

    if (confirmed) {
      return {
        stage: 'license_confirm',
        nextStage: 'appointment_booking',
        response: 'Excellent! Now that we have the basics covered, I\'d love to set up a quick call to go over your specific options. I have some time available today or tomorrow - what works better for your schedule?'
      };
    }

    return {
      stage: 'license_confirm',
      response: `No worries! Let me resend that to ${context.leadInfo.email}. You should receive my license within a few minutes. Once you get that, we can set up a quick call to review your mortgage protection options.`
    };
  }

  private handleAppointmentBookingStage(context: NurturingContext, userResponse: string): NurturingStage {
    // This would integrate with the existing appointment booking service
    return {
      stage: 'appointment_booking',
      response: 'Let me check my calendar and show you some available times...'
    };
  }

  private handleObjectionStage(context: NurturingContext, userResponse: string): NurturingStage {
    if (userResponse.includes('just send me a quote')) {
      return {
        stage: 'objection_handling',
        response: `I understand you'd like to see numbers, but mortgage protection isn't like car insurance where I can just give you a standard quote. The coverage amount and premium depends on your specific situation - your age, health, mortgage balance, and what you're trying to protect. That's why I need just a few minutes on the phone to make sure you get accurate information that actually fits your needs. Would tomorrow morning or afternoon work better for a quick 10-minute call?`
      };
    }

    if (userResponse.includes('email me') || userResponse.includes('send me information')) {
      return {
        stage: 'objection_handling',
        response: `I totally understand wanting information first. I already sent you my license, and I can certainly follow up with details. But here's the thing - mortgage protection options vary quite a bit based on your specific situation. Rather than sending generic information that might not apply to you, would you be open to a quick 10-minute call where I can give you information that's actually relevant to your mortgage and situation?`
      };
    }

    if (userResponse.includes('not interested') || userResponse.includes('no thanks')) {
      return {
        stage: 'objection_handling',
        response: `I completely understand! Can I ask what's making you feel that way? Is it that you already have coverage, or are you concerned about the cost? I just want to make sure you have accurate information before making a decision.`
      };
    }

    if (userResponse.includes('too busy') || userResponse.includes('no time')) {
      return {
        stage: 'objection_handling',
        response: `I totally get that - everyone's schedule is crazy! That's actually why I try to keep these calls super short. I'm talking about 10-15 minutes max, just enough time to make sure you understand your options. I have some early morning slots or even evening time slots if that works better. What time of day usually works best for you?`
      };
    }

    // Default objection response
    return {
      stage: 'objection_handling',
      response: `I hear you, and I want to make sure this is worth your time. Since you took the time to request information about mortgage protection, I'm assuming you want to make sure your family and home are protected if something happens to you. All I'm asking for is 10 minutes to make sure you have the right information to make an informed decision. Would that be fair?`
    };
  }
}

export const leadNurturingService = new LeadNurturingService();