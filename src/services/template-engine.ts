import { prisma } from '@/lib/prisma';

export interface TemplateContext {
  // Lead Information
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  state?: string;
  age?: number;
  
  // Conversation Context
  conversationStage: string;
  previousMessage?: string;
  messageCount: number;
  leadAge: 'fresh' | 'aged';
  daysOld: number;
  
  // Business Context
  mortgageAmount?: number;
  currentCoverage?: 'none' | 'some' | 'adequate';
  spouseIncluded?: boolean;
  lastResponseTime?: number;
  
  // Performance Context
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: 'weekday' | 'weekend';
  responseHistory: string[];
}

export interface ResponseTemplate {
  id: string;
  category: string; // 'opening', 'objection', 'appointment', 'followup'
  subcategory: string; // 'price_objection', 'time_objection', etc.
  template: string; // Template with {{variables}}
  variations: string[]; // Array of template variations
  conditions?: {
    leadAge?: 'fresh' | 'aged' | 'any';
    conversationStage?: string[];
    previousMessages?: string[];
    timeOfDay?: string[];
    excludeStates?: string[];
  };
  performance: {
    timesUsed: number;
    responseRate: number; // % of leads who respond after this message
    appointmentRate: number; // % who book after this message
    avgResponseTime: number; // Minutes to respond
    lastUpdated: Date;
  };
  personalizations: {
    byState?: Record<string, string>; // State-specific variations
    byAge?: Record<string, string>; // Age-based variations
    byMortgageAmount?: Record<string, string>; // Mortgage-based variations
  };
}

export class AdvancedTemplateEngine {
  
  /**
   * Get the best response template for the given context
   */
  async getBestResponse(
    category: string,
    subcategory: string,
    context: TemplateContext
  ): Promise<string> {
    
    // Get all matching templates
    const templates = await this.getMatchingTemplates(category, subcategory, context);
    
    if (templates.length === 0) {
      console.log('⚠️ No matching templates found, using fallback');
      return this.getFallbackResponse(category, context);
    }
    
    // Select best template based on performance and context
    const selectedTemplate = await this.selectBestTemplate(templates, context);
    
    // Generate response with personalization
    const response = await this.generatePersonalizedResponse(selectedTemplate, context);
    
    // Track usage for performance optimization
    await this.trackTemplateUsage(selectedTemplate.id, context);
    
    return response;
  }
  
  /**
   * Get templates that match the current context
   */
  private async getMatchingTemplates(
    category: string,
    subcategory: string,
    context: TemplateContext
  ): Promise<ResponseTemplate[]> {
    
    // Get all active templates and filter in application code
    const allTemplates = await prisma.promptTemplate.findMany({
      where: { isActive: true }
    });
    
    const matchingTemplates = allTemplates
      .filter(template => {
        const vars = template.variables as Record<string, unknown> | null;
        const templateCategory = vars?.category as string || 'general';
        const templateSubcategory = vars?.subcategory as string || 'default';
        
        if (templateCategory !== category || templateSubcategory !== subcategory) {
          return false;
        }
        
        const conditions = vars?.conditions as Record<string, unknown> | null;
        
        // Check lead age condition
        const leadAgeCondition = conditions?.leadAge as string;
        if (leadAgeCondition && leadAgeCondition !== 'any' && leadAgeCondition !== context.leadAge) {
          return false;
        }
        
        // Check exclude states
        const excludeStates = conditions?.excludeStates as string[];
        if (excludeStates && context.state && excludeStates.includes(context.state)) {
          return false;
        }
        
        return true;
      })
      .map(template => {
        const vars = template.variables as Record<string, unknown> | null;
        const variations = vars?.variations as string[] || [];
        const conditions = vars?.conditions as Record<string, unknown> | null;
        const personalizations = vars?.personalizations as Record<string, unknown> | null;
        const performance = template.performance as Record<string, unknown> | null;
        
        return {
          id: template.id,
          category: vars?.category as string || 'general',
          subcategory: vars?.subcategory as string || 'default',
          template: template.content,
          variations,
          conditions: conditions as ResponseTemplate['conditions'],
          performance: {
            timesUsed: performance?.timesUsed as number || 0,
            responseRate: performance?.responseRate as number || 0,
            appointmentRate: performance?.appointmentRate as number || 0,
            avgResponseTime: performance?.avgResponseTime as number || 0,
            lastUpdated: new Date(performance?.lastUpdated as string || Date.now())
          },
          personalizations: personalizations as ResponseTemplate['personalizations'] || {}
        } as ResponseTemplate;
      })
      .sort((a, b) => b.performance.appointmentRate - a.performance.appointmentRate);
    
    return matchingTemplates;
  }
  
  /**
   * Select the best template using weighted scoring
   */
  private async selectBestTemplate(
    templates: ResponseTemplate[],
    context: TemplateContext
  ): Promise<ResponseTemplate> {
    
    // Avoid recently used templates for this lead
    const recentlyUsed = context.responseHistory.slice(-5);
    const availableTemplates = templates.filter(t => 
      !recentlyUsed.includes(t.id)
    );
    
    if (availableTemplates.length === 0) {
      return templates[0]; // Use best performing if all were recently used
    }
    
    // Weight by performance metrics
    const scoredTemplates = availableTemplates.map(template => ({
      template,
      score: this.calculateTemplateScore(template, context)
    }));
    
    // Sort by score and add randomization for top performers
    scoredTemplates.sort((a, b) => b.score - a.score);
    const topTemplates = scoredTemplates.slice(0, 3);
    
    // Randomly select from top 3 for variation
    return topTemplates[Math.floor(Math.random() * topTemplates.length)].template;
  }
  
  /**
   * Calculate template performance score
   */
  private calculateTemplateScore(template: ResponseTemplate, context: TemplateContext): number {
    let score = 0;
    
    // Performance weights
    score += template.performance.appointmentRate * 0.5; // 50% weight on conversion
    score += template.performance.responseRate * 0.3; // 30% weight on engagement
    score += (1 / Math.max(template.performance.avgResponseTime, 1)) * 0.1; // 10% on response time
    score += (template.performance.timesUsed > 10 ? 0.1 : 0); // 10% bonus for proven templates
    
    // Context bonuses
    if (context.timeOfDay === 'evening' && template.template.includes('evening')) score += 0.1;
    if (context.leadAge === 'fresh' && template.conditions?.leadAge === 'fresh') score += 0.15;
    if (context.state && template.personalizations.byState?.[context.state]) score += 0.1;
    
    return score;
  }
  
  /**
   * Generate personalized response from template
   */
  private async generatePersonalizedResponse(
    template: ResponseTemplate,
    context: TemplateContext
  ): Promise<string> {
    
    // Select template variation
    const variations = template.variations.length > 0 ? template.variations : [template.template];
    const selectedVariation = variations[Math.floor(Math.random() * variations.length)];
    
    let response = selectedVariation;
    
    // Apply state-specific personalization
    if (context.state && template.personalizations.byState?.[context.state]) {
      response = template.personalizations.byState[context.state];
    }
    
    // Apply age-based personalization
    if (context.age && template.personalizations.byAge) {
      const ageRange = context.age < 35 ? 'young' : context.age > 50 ? 'mature' : 'middle';
      if (template.personalizations.byAge[ageRange]) {
        response = template.personalizations.byAge[ageRange];
      }
    }
    
    // Replace template variables
    response = this.replaceTemplateVariables(response, context);
    
    return response;
  }
  
  /**
   * Replace template variables with context data
   */
  private replaceTemplateVariables(template: string, context: TemplateContext): string {
    return template
      .replace(/\{\{firstName\}\}/g, context.firstName)
      .replace(/\{\{lastName\}\}/g, context.lastName || '')
      .replace(/\{\{fullName\}\}/g, `${context.firstName} ${context.lastName || ''}`.trim())
      .replace(/\{\{state\}\}/g, context.state || 'your state')
      .replace(/\{\{email\}\}/g, context.email || 'your email')
      .replace(/\{\{timeOfDay\}\}/g, context.timeOfDay)
      .replace(/\{\{mortgageAmount\}\}/g, context.mortgageAmount ? `$${context.mortgageAmount.toLocaleString()}` : 'your mortgage')
      .replace(/\{\{leadAge\}\}/g, context.leadAge)
      .replace(/\{\{daysOld\}\}/g, context.daysOld.toString());
  }
  
  /**
   * Track template usage for performance optimization
   */
  private async trackTemplateUsage(templateId: string, context: TemplateContext): Promise<void> {
    await prisma.promptTemplate.update({
      where: { id: templateId },
      data: {
        performance: {
          timesUsed: 1, // Increment by 1
          lastUsed: new Date().toISOString()
        }
      }
    });
    
    // Log template usage for analytics
    // TODO: Create TemplateUsage table in future migration
    console.log('📊 Template usage tracked:', {
      templateId,
      leadAge: context.leadAge,
      conversationStage: context.conversationStage,
      state: context.state,
      timeOfDay: context.timeOfDay,
      messageCount: context.messageCount
    });
  }
  
  /**
   * Get current performance metrics for a template
   */
  private async getCurrentPerformance(templateId: string) {
    const template = await prisma.promptTemplate.findUnique({
      where: { id: templateId },
      select: { performance: true }
    });
    return template?.performance || {};
  }
  
  /**
   * Fallback response when no templates match
   */
  private getFallbackResponse(category: string, context: TemplateContext): string {
    const fallbacks = {
      opening: `Hi ${context.firstName}! I'm Nick, and I help homeowners in ${context.state || 'your area'} with mortgage protection. I'd love to chat about your options.`,
      objection: `I understand, ${context.firstName}. Many homeowners have similar concerns. Can I ask what's making you hesitant about mortgage protection?`,
      appointment: `I'd be happy to schedule a quick call, ${context.firstName}. What time usually works best for you - mornings or afternoons?`,
      followup: `Hi ${context.firstName}, just following up on our conversation about mortgage protection. Do you have any questions I can help with?`
    };
    
    return fallbacks[category as keyof typeof fallbacks] || 
           `Thanks for your message, ${context.firstName}! How can I help you with your mortgage protection needs?`;
  }
  
  /**
   * Add new template variations dynamically
   */
  async addTemplateVariation(
    templateId: string,
    variation: string,
    testPerformance: boolean = true
  ): Promise<void> {
    
    if (testPerformance) {
      // A/B test the new variation
      await this.startABTest(templateId, variation);
    } else {
      // Add directly to variations (stored in variables field)
      const template = await prisma.promptTemplate.findUnique({
        where: { id: templateId },
        select: { variables: true }
      });
      
      if (template) {
        const vars = template.variables as Record<string, unknown> | null;
        const variations = (vars?.variations as string[]) || [];
        variations.push(variation);
        
        await prisma.promptTemplate.update({
          where: { id: templateId },
          data: {
            variables: {
              ...vars,
              variations
            }
          }
        });
      }
    }
  }
  
  /**
   * Start A/B test for new template variation
   */
  private async startABTest(templateId: string, newVariation: string): Promise<void> {
    // TODO: Create ABTest table in future migration
    console.log('🧪 A/B test started:', {
      templateId,
      variationA: 'original',
      variationB: newVariation,
      startDate: new Date()
    });
  }
}

export const templateEngine = new AdvancedTemplateEngine();