import { closeService } from './close';
import { prisma } from '@/lib/prisma';

interface LeadAgeCategory {
  type: 'fresh' | 'aged';
  daysOld: number;
}

interface ConversationPattern {
  id: string;
  leadAge: LeadAgeCategory;
  triggerPhrase: string;
  yourResponse: string;
  leadReaction: string;
  effectiveness: 'high' | 'medium' | 'low';
  conversationStage: 'opening' | 'objection' | 'qualification' | 'appointment_setting' | 'closing';
  outcome: 'responded_positively' | 'booked_appointment' | 'went_silent' | 'objected';
}

interface ConversationInsight {
  pattern: string;
  effectiveness: number;
  leadAgePreference: 'fresh' | 'aged' | 'both';
  usage_frequency: number;
  avg_response_time: number;
  conversion_rate: number;
}

class ConversationLearningService {
  
  async extractSuccessfulConversations(): Promise<ConversationPattern[]> {
    console.log('🧠 Extracting successful conversations from sold leads...');
    
    try {
      // Get all sold leads from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const soldLeads = await closeService.searchLeads({
        query: `status_label:"sold" date_created:>${sixMonthsAgo.toISOString().split('T')[0]}`,
        limit: 500
      });
      
      console.log(`📊 Found ${soldLeads.length} sold leads to analyze`);
      
      const patterns: ConversationPattern[] = [];
      
      for (const lead of soldLeads) {
        try {
          // Get SMS history for this lead
          const smsHistory = await closeService.getSMSActivities(lead.id, 100);
          
          if (smsHistory.length < 2) continue; // Need at least conversation
          
          // Determine lead age at time of first contact
          const leadAge = this.calculateLeadAge(lead.date_created);
          
          // Analyze conversation patterns
          const leadPatterns = await this.analyzeConversationFlow(smsHistory, leadAge, lead);
          patterns.push(...leadPatterns);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error analyzing lead ${lead.id}:`, error);
          continue;
        }
      }
      
      console.log(`🎯 Extracted ${patterns.length} conversation patterns`);
      
      // Store patterns in database
      await this.storePatterns(patterns);
      
      return patterns;
    } catch (error) {
      console.error('❌ Error extracting conversations:', error);
      throw error;
    }
  }
  
  private calculateLeadAge(dateCreated: string): LeadAgeCategory {
    const createdDate = new Date(dateCreated);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      type: diffDays <= 14 ? 'fresh' : 'aged',
      daysOld: diffDays
    };
  }
  
  private async analyzeConversationFlow(
    smsHistory: Array<{ direction: string; text: string; date_created: string }>, 
    leadAge: LeadAgeCategory,
    lead: { id: string }
  ): Promise<ConversationPattern[]> {
    const patterns: ConversationPattern[] = [];
    
    // Sort by date to get chronological flow
    const sortedMessages = smsHistory.sort((a, b) => 
      new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
    );
    
    // Analyze message pairs (your message -> their response)
    for (let i = 0; i < sortedMessages.length - 1; i++) {
      const yourMessage = sortedMessages[i];
      const theirResponse = sortedMessages[i + 1];
      
      // Only analyze outbound (your) messages followed by inbound (their) responses
      if (yourMessage.direction === 'outbound' && theirResponse.direction === 'inbound') {
        const pattern: ConversationPattern = {
          id: `${lead.id}_${i}`,
          leadAge,
          triggerPhrase: this.extractTriggerContext(sortedMessages, i),
          yourResponse: yourMessage.text,
          leadReaction: theirResponse.text,
          effectiveness: this.assessResponseEffectiveness(theirResponse.text),
          conversationStage: this.determineConversationStage(yourMessage.text, i, sortedMessages.length),
          outcome: this.determineOutcome(theirResponse.text, sortedMessages, i)
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }
  
  private extractTriggerContext(messages: Array<{ direction: string; text: string }>, currentIndex: number): string {
    // Get the lead's message that triggered your response (if any)
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (messages[i].direction === 'inbound') {
        return messages[i].text;
      }
    }
    return 'initial_contact'; // First message
  }
  
  private assessResponseEffectiveness(response: string): 'high' | 'medium' | 'low' {
    const positiveIndicators = [
      'yes', 'sounds good', 'interested', 'when', 'schedule', 'time', 'available',
      'tell me more', 'how much', 'what are', 'that works', 'perfect', 'great',
      'ok', 'sure', 'thank you', 'thanks', 'appreciate'
    ];
    
    const negativeIndicators = [
      'no thanks', 'not interested', 'remove me', 'stop', 'too expensive',
      "can't afford", 'not now', 'busy', 'maybe later', 'not sure'
    ];
    
    const lowerResponse = response.toLowerCase();
    
    const positiveCount = positiveIndicators.filter(indicator => 
      lowerResponse.includes(indicator)
    ).length;
    
    const negativeCount = negativeIndicators.filter(indicator => 
      lowerResponse.includes(indicator)
    ).length;
    
    if (positiveCount > negativeCount && positiveCount > 0) return 'high';
    if (negativeCount > positiveCount) return 'low';
    return 'medium';
  }
  
  private determineConversationStage(
    yourMessage: string, 
    messageIndex: number, 
    totalMessages: number
  ): ConversationPattern['conversationStage'] {
    const lowerMessage = yourMessage.toLowerCase();
    
    if (messageIndex === 0) return 'opening';
    
    if (lowerMessage.includes('schedule') || lowerMessage.includes('available') || 
        lowerMessage.includes('appointment') || lowerMessage.includes('call')) {
      return 'appointment_setting';
    }
    
    if (lowerMessage.includes('qualify') || lowerMessage.includes('coverage') || 
        lowerMessage.includes('spouse') || lowerMessage.includes('policy')) {
      return 'qualification';
    }
    
    if (messageIndex > totalMessages * 0.7) return 'closing';
    
    return 'objection';
  }
  
  private determineOutcome(
    response: string, 
    allMessages: Array<{ direction: string }>, 
    currentIndex: number
  ): ConversationPattern['outcome'] {
    const lowerResponse = response.toLowerCase();
    
    // Check if they booked an appointment based on keywords
    if (lowerResponse.includes('schedule') || lowerResponse.includes('book') || 
        lowerResponse.includes('available') || lowerResponse.includes('when')) {
      return 'booked_appointment';
    }
    
    // Check if they responded positively
    if (lowerResponse.includes('yes') || lowerResponse.includes('interested') || 
        lowerResponse.includes('sounds good') || lowerResponse.includes('tell me more')) {
      return 'responded_positively';
    }
    
    // Check if they objected
    if (lowerResponse.includes('no') || lowerResponse.includes('not interested') || 
        lowerResponse.includes('too expensive') || lowerResponse.includes("can't")) {
      return 'objected';
    }
    
    // Check if conversation continued after this
    const hasFollowUp = allMessages.slice(currentIndex + 1).some(msg => 
      msg.direction === 'inbound'
    );
    
    return hasFollowUp ? 'responded_positively' : 'went_silent';
  }
  
  private async storePatterns(patterns: ConversationPattern[]): Promise<void> {
    console.log('💾 Storing conversation patterns...');
    
    // Clear existing patterns
    await prisma.conversationPattern.deleteMany();
    
    // Store new patterns
    for (const pattern of patterns) {
      try {
        await prisma.conversationPattern.create({
          data: {
            patternId: pattern.id,
            leadAgeType: pattern.leadAge.type,
            leadAgeDays: pattern.leadAge.daysOld,
            triggerPhrase: pattern.triggerPhrase,
            successfulResponse: pattern.yourResponse,
            leadReaction: pattern.leadReaction,
            effectiveness: pattern.effectiveness,
            conversationStage: pattern.conversationStage,
            outcome: pattern.outcome,
            createdAt: new Date()
          }
        });
      } catch (error) {
        console.error('Error storing pattern:', error);
      }
    }
    
    console.log(`✅ Stored ${patterns.length} conversation patterns`);
  }
  
  async generateInsights(): Promise<ConversationInsight[]> {
    console.log('🔍 Generating conversation insights...');
    
    const patterns = await prisma.conversationPattern.findMany();
    const insights: ConversationInsight[] = [];
    
    // Group patterns by similar responses  
    const responseGroups = new Map();
    
    patterns.forEach(pattern => {
      const key = this.normalizeResponse(pattern.successfulResponse);
      if (!responseGroups.has(key)) {
        responseGroups.set(key, []);
      }
      responseGroups.get(key)!.push(pattern);
    });
    
    // Analyze each group
    responseGroups.forEach((groupPatterns: typeof patterns, responseKey: string) => {
      const highEffectiveness = groupPatterns.filter((p: typeof patterns[0]) => p.effectiveness === 'high').length;
      const totalCount = groupPatterns.length;
      
      if (totalCount >= 3 && highEffectiveness / totalCount > 0.5) {
        const freshCount = groupPatterns.filter((p: typeof patterns[0]) => p.leadAgeType === 'fresh').length;
        const agedCount = groupPatterns.filter((p: typeof patterns[0]) => p.leadAgeType === 'aged').length;
        
        let leadAgePreference: 'fresh' | 'aged' | 'both';
        if (freshCount > agedCount * 1.5) leadAgePreference = 'fresh';
        else if (agedCount > freshCount * 1.5) leadAgePreference = 'aged';
        else leadAgePreference = 'both';
        
        insights.push({
          pattern: responseKey,
          effectiveness: highEffectiveness / totalCount,
          leadAgePreference,
          usage_frequency: totalCount,
          avg_response_time: 0, // Could calculate from timestamps
          conversion_rate: groupPatterns.filter((p: typeof patterns[0]) => 
            p.outcome === 'booked_appointment' || p.outcome === 'responded_positively'
          ).length / totalCount
        });
      }
    });
    
    return insights.sort((a, b) => b.effectiveness - a.effectiveness);
  }
  
  private normalizeResponse(response: string): string {
    // Remove specific details but keep the structure/tone
    return response
      .toLowerCase()
      .replace(/\b\d+\b/g, '[NUMBER]') // Replace numbers
      .replace(/\b[a-z]+@[a-z]+\.[a-z]+\b/g, '[EMAIL]') // Replace emails
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]') // Replace phones
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g, '[DAY]')
      .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, '[MONTH]')
      .trim();
  }
  
  async getBestResponseForContext(
    leadAge: LeadAgeCategory,
    triggerPhrase: string,
    conversationStage: string
  ): Promise<string | null> {
    console.log('🎯 Finding best response for context:', { leadAge: leadAge.type, conversationStage });
    
    const patterns = await prisma.conversationPattern.findMany({
      where: {
        leadAgeType: leadAge.type,
        conversationStage,
        effectiveness: 'high'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    if (patterns.length === 0) return null;
    
    // Return the most recent successful response
    return patterns[0].successfulResponse;
  }
}

export const conversationLearningService = new ConversationLearningService();