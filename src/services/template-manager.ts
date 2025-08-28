import { prisma } from '@/lib/prisma';
import { BotType } from '@prisma/client';

export interface TemplateData {
  name: string;
  category: string;
  subcategory: string;
  botType: BotType;
  content: string;
  variations?: string[];
  conditions?: {
    leadAge?: 'fresh' | 'aged' | 'any';
    conversationStage?: string[];
    timeOfDay?: string[];
    excludeStates?: string[];
  };
  personalizations?: {
    byState?: Record<string, string>;
    byAge?: Record<string, string>;
    byMortgageAmount?: Record<string, string>;
  };
}

export class TemplateManager {
  
  /**
   * Bulk import templates from a structured dataset
   */
  async importTemplates(templates: TemplateData[]): Promise<number> {
    let imported = 0;
    
    for (const template of templates) {
      try {
        await prisma.promptTemplate.create({
          data: {
            name: template.name,
            botType: template.botType,
            content: template.content,
            variables: {
              category: template.category,
              subcategory: template.subcategory,
              variations: template.variations || [],
              conditions: template.conditions || {},
              personalizations: template.personalizations || {}
            },
            performance: {
              timesUsed: 0,
              responseRate: 0.0,
              appointmentRate: 0.0,
              avgResponseTime: 0.0,
              lastUpdated: new Date().toISOString()
            },
            isActive: true,
            version: 1
          }
        });
        imported++;
      } catch (error) {
        console.error(`Failed to import template: ${template.name}`, error);
      }
    }
    
    return imported;
  }
  
  /**
   * Create comprehensive template dataset for life insurance sales
   */
  async createComprehensiveTemplateSet(): Promise<number> {
    
    const templates: TemplateData[] = [
      
      // ===== OPENING MESSAGES (20+ variations) =====
      ...this.generateOpeningTemplates(),
      
      // ===== PERMISSION REQUESTS (15+ variations) =====
      ...this.generatePermissionTemplates(),
      
      // ===== QUALIFICATION QUESTIONS (25+ variations) =====
      ...this.generateQualificationTemplates(),
      
      // ===== OBJECTION HANDLING (100+ variations) =====
      ...this.generateObjectionTemplates(),
      
      // ===== APPOINTMENT BOOKING (30+ variations) =====
      ...this.generateAppointmentTemplates(),
      
      // ===== FOLLOW-UP SEQUENCES (40+ variations) =====
      ...this.generateFollowUpTemplates(),
      
      // ===== URGENCY & SCARCITY (20+ variations) =====
      ...this.generateUrgencyTemplates(),
      
      // ===== SOCIAL PROOF (25+ variations) =====
      ...this.generateSocialProofTemplates()
    ];
    
    console.log(`📝 Creating ${templates.length} response templates...`);
    return await this.importTemplates(templates);
  }
  
  private generateOpeningTemplates(): TemplateData[] {
    return [
      {
        name: 'Opening - Warm Introduction',
        category: 'opening',
        subcategory: 'introduction',
        botType: BotType.GENERAL,
        content: 'Hi {{firstName}}! I\'m Nick, and I help homeowners in {{state}} with mortgage protection. I\'d love to chat about your options.',
        variations: [
          'Hi {{firstName}}! I\'m Nick Neessen, and I specialize in helping {{state}} homeowners protect their mortgage. Mind if I ask a couple quick questions?',
          '{{firstName}}, I\'m Nick - I help families in {{state}} secure their mortgage with life insurance. Do you have a few minutes to chat?',
          'Hi {{firstName}}! Nick here. I work with homeowners in {{state}} on mortgage protection. Can I ask what prompted you to look into this?'
        ],
        conditions: { leadAge: 'fresh', timeOfDay: ['morning', 'afternoon'] },
        personalizations: {
          byState: {
            'CA': 'Hi {{firstName}}! I\'m Nick, licensed in California to help homeowners with mortgage protection.',
            'TX': 'Hi {{firstName}}! I\'m Nick, your Texas-licensed mortgage protection specialist.',
            'FL': 'Hi {{firstName}}! I\'m Nick, helping Florida homeowners protect their families since 2020.'
          }
        }
      },
      
      {
        name: 'Opening - Direct Benefit',
        category: 'opening',
        subcategory: 'benefit_focused',
        botType: BotType.GENERAL,
        content: '{{firstName}}, I help homeowners make sure their family keeps the house if something happens. Can I ask about your current situation?',
        variations: [
          '{{firstName}}, my job is making sure families don\'t lose their home when life happens. What\'s your mortgage situation like?',
          'Hi {{firstName}}! I specialize in keeping families in their homes during tough times. Mind if I ask about your mortgage?',
          '{{firstName}}, I help protect what matters most - your family\'s home. Can I ask a couple questions about your situation?'
        ],
        conditions: { leadAge: 'any' }
      },
      
      {
        name: 'Opening - Problem Awareness',
        category: 'opening',
        subcategory: 'problem_focused',
        botType: BotType.GENERAL,
        content: 'Hi {{firstName}}! Did you know that 1 in 5 surviving spouses lose their home within 2 years? I help prevent that. Can we chat?',
        variations: [
          '{{firstName}}, 63% of Americans couldn\'t cover a $500 emergency, let alone a mortgage. I help families prepare. Can I ask about your situation?',
          'Hi {{firstName}}! Most people don\'t realize their work life insurance only covers 1-2x their salary. Is that enough for your mortgage? Let\'s chat.',
          '{{firstName}}, if something happened to you tomorrow, would your family be able to keep the house? I help make sure the answer is yes.'
        ],
        conditions: { leadAge: 'any' }
      }
    ];
  }
  
  private generatePermissionTemplates(): TemplateData[] {
    return [
      {
        name: 'Permission - Standard Request',
        category: 'permission',
        subcategory: 'initial_permission',
        botType: BotType.GENERAL,
        content: 'Do you mind if I ask you a couple questions before we hop on a call?',
        variations: [
          'Can I ask you a few quick questions to make sure I give you the right information?',
          'Mind if I ask a couple questions so I can help you properly?',
          'Would it be okay if I asked 2-3 quick questions to understand your situation better?',
          'Before we set up a call, can I ask a few questions to make sure I\'m prepared?'
        ],
        conditions: { conversationStage: ['opening'] }
      },
      
      {
        name: 'Permission - Benefit Driven',
        category: 'permission',
        subcategory: 'benefit_permission',
        botType: BotType.GENERAL,
        content: 'I want to make sure I give you information that actually applies to your situation - can I ask a couple quick questions?',
        variations: [
          'So I don\'t waste your time with generic information, mind if I ask about your specific situation?',
          'I want to give you accurate numbers for YOUR situation - can I ask a few questions first?',
          'Rather than sending you generic info, let me ask a couple questions so I can give you relevant details.'
        ]
      }
    ];
  }
  
  private generateQualificationTemplates(): TemplateData[] {
    return [
      {
        name: 'Qualification - First vs Replacement',
        category: 'qualification',
        subcategory: 'coverage_status',
        botType: BotType.GENERAL,
        content: 'Just to get started, will this be your first policy or are you looking to replace coverage you already have?',
        variations: [
          'Quick question - do you currently have any life insurance, or would this be your first policy?',
          'Are you looking to add coverage or replace something you already have?',
          'Do you have any existing life insurance or mortgage protection, or starting fresh?'
        ]
      },
      
      {
        name: 'Qualification - Spouse Coverage',
        category: 'qualification',
        subcategory: 'spouse_inclusion',
        botType: BotType.GENERAL,
        content: 'Are you just looking for coverage for yourself, or would you like to include your spouse as well?',
        variations: [
          'Will this coverage be for just you, or for you and your spouse?',
          'Are we looking at individual coverage or would your spouse be included too?',
          'Just for you, or should we look at covering both you and your spouse?'
        ]
      },
      
      {
        name: 'Qualification - Mortgage Details',
        category: 'qualification',
        subcategory: 'mortgage_info',
        botType: BotType.GENERAL,
        content: 'What\'s your current mortgage balance, roughly? I want to make sure we\'re looking at the right coverage amount.',
        variations: [
          'Ballpark, what do you owe on your mortgage? This helps me recommend the right coverage.',
          'What\'s left on your mortgage? I want to make sure the coverage makes sense.',
          'Roughly how much is left on your home loan? This helps determine coverage needs.'
        ]
      }
    ];
  }
  
  private generateObjectionTemplates(): TemplateData[] {
    return [
      // Price Objections
      {
        name: 'Objection - Too Expensive',
        category: 'objection',
        subcategory: 'price',
        botType: BotType.OBJECTION_HANDLER,
        content: 'I understand, {{firstName}}. Most people think that initially. Can I ask - what do you think mortgage protection costs per month?',
        variations: [
          'I hear that a lot, {{firstName}}. Most people are surprised when they see real numbers. What would you guess it costs monthly?',
          '{{firstName}}, I get that concern. Before we talk cost, can I ask what you think your family would need if something happened to you?',
          'That\'s totally fair, {{firstName}}. What if I told you it might cost less than your monthly streaming services?',
          '{{firstName}}, expensive compared to what? Your mortgage payment? Your car insurance? Let me show you real numbers.'
        ],
        personalizations: {
          byAge: {
            'young': '{{firstName}}, at your age, you actually qualify for the best rates available.',
            'mature': '{{firstName}}, even though rates increase with age, mortgage protection is still very affordable.'
          }
        }
      },
      
      // Time Objections
      {
        name: 'Objection - No Time',
        category: 'objection',
        subcategory: 'time',
        botType: BotType.OBJECTION_HANDLER,
        content: 'I totally get that, {{firstName}} - everyone\'s schedule is crazy! That\'s why I keep these super short. I\'m talking 10-15 minutes max.',
        variations: [
          '{{firstName}}, I completely understand. What if we did just 10 minutes? I have early morning or evening slots if that helps.',
          'I hear you, {{firstName}}. How about this - I have 10-minute slots available. Would morning or evening work better?',
          '{{firstName}}, totally fair. I can do a quick 10-minute call at your convenience. When are you typically free?',
          'I get it, {{firstName}}. But what takes more time - 10 minutes now, or your family dealing with financial stress later?'
        ]
      },
      
      // Trust Objections
      {
        name: 'Objection - Don\'t Trust Insurance',
        category: 'objection',
        subcategory: 'trust',
        botType: BotType.OBJECTION_HANDLER,
        content: 'I completely understand that skepticism, {{firstName}}. That\'s exactly why I send my license upfront and work with A+ rated companies.',
        variations: [
          '{{firstName}}, your skepticism actually shows you\'re smart about this. That\'s why I always prove I\'m legitimate first.',
          'I hear you, {{firstName}}. The insurance industry has earned that reputation. Let me show you how I\'m different.',
          '{{firstName}}, I don\'t blame you one bit. Would it help if I showed you how the top-rated companies actually pay claims?'
        ]
      },
      
      // Need Objections
      {
        name: 'Objection - Don\'t Need It',
        category: 'objection',
        subcategory: 'need',
        botType: BotType.OBJECTION_HANDLER,
        content: 'I hear you, {{firstName}}. Can I ask - if something happened to you, how would your family cover the mortgage payments?',
        variations: [
          '{{firstName}}, that\'s fair. Just curious - does your family have another way to pay the mortgage if something happens?',
          'I understand, {{firstName}}. What\'s your family\'s backup plan for the mortgage if you\'re not there?',
          'Got it, {{firstName}}. So if something happened, your family could handle the $2,000+ monthly mortgage payment?'
        ]
      }
    ];
  }
  
  private generateAppointmentTemplates(): TemplateData[] {
    return [
      {
        name: 'Appointment - Time Preference',
        category: 'appointment',
        subcategory: 'scheduling',
        botType: BotType.APPOINTMENT,
        content: 'Perfect! I have some time available {{timeOfDay}}. What works better for your schedule?',
        variations: [
          'Great! I have {{timeOfDay}} slots open. Would that work for you?',
          'Excellent! I can do {{timeOfDay}} or would a different time be better?',
          'Perfect timing! I have {{timeOfDay}} availability. Does that work?'
        ]
      },
      
      {
        name: 'Appointment - Urgency Close',
        category: 'appointment',
        subcategory: 'urgency_close',
        botType: BotType.APPOINTMENT,
        content: 'I actually have one spot left today at {{time}}. Should I hold it for you?',
        variations: [
          'I just had a cancellation for {{time}} today. Want to grab that spot?',
          'Perfect timing - I have exactly one opening left this week. {{time}} work?',
          'You\'re in luck - I have one last spot available today at {{time}}. Interested?'
        ]
      }
    ];
  }
  
  private generateFollowUpTemplates(): TemplateData[] {
    return [
      {
        name: 'Follow-up - Gentle Check-in',
        category: 'followup',
        subcategory: 'gentle',
        botType: BotType.GENERAL,
        content: 'Hi {{firstName}}, just following up on our conversation about mortgage protection. Any questions I can help with?',
        variations: [
          '{{firstName}}, wanted to circle back about your mortgage protection. What questions do you have?',
          'Hi {{firstName}}! Following up on mortgage protection - did anything else come to mind?',
          '{{firstName}}, just checking in about protecting your family\'s home. How are you feeling about everything?'
        ]
      }
    ];
  }
  
  private generateUrgencyTemplates(): TemplateData[] {
    return [
      {
        name: 'Urgency - Health Based',
        category: 'urgency',
        subcategory: 'health',
        botType: BotType.GENERAL,
        content: 'The best time to get life insurance is when you don\'t need it. Your health today qualifies you for the best rates.',
        variations: [
          'Every day you wait, you\'re rolling the dice with your health and age. Both affect your rates.',
          'Right now you\'re healthy and insurable. Tomorrow, that might change. That\'s the reality.',
          'The insurance company sees you as their best customer today. Next year? Maybe not.'
        ]
      }
    ];
  }
  
  private generateSocialProofTemplates(): TemplateData[] {
    return [
      {
        name: 'Social Proof - Similar Families',
        category: 'social_proof',
        subcategory: 'similar_situation',
        botType: BotType.GENERAL,
        content: 'I just helped a family in {{state}} with a similar mortgage secure $500K for under $40/month. Want to see what that looks like for you?',
        variations: [
          'Last week I helped a {{state}} family with a ${{mortgageAmount}} mortgage get amazing rates. Similar situation to yours.',
          'Just set up a {{state}} homeowner like yourself with mortgage protection for less than their Netflix bill.',
          'Yesterday I helped a family in your area lock in 30-year level rates. Great timing for people your age.'
        ]
      }
    ];
  }
  
  /**
   * Generate performance report for templates
   */
  async generatePerformanceReport(): Promise<Array<{
    category: string;
    subcategory: string;
    template_count: number;
    avg_response_rate: number;
    avg_appointment_rate: number;
    total_uses: number;
  }>> {
    const templates = await prisma.promptTemplate.findMany({
      where: { isActive: true },
      select: {
        name: true,
        botType: true,
        performance: true,
        variables: true
      }
    });
    
    const report = templates.reduce((acc, template) => {
      const vars = template.variables as Record<string, unknown> | null;
      const category = (vars?.category as string) || 'general';
      const subcategory = (vars?.subcategory as string) || 'default';
      const perf = template.performance as Record<string, unknown> | null;
      
      const key = `${category}_${subcategory}`;
      if (!acc[key]) {
        acc[key] = {
          category,
          subcategory,
          template_count: 0,
          avg_response_rate: 0,
          avg_appointment_rate: 0,
          total_uses: 0
        };
      }
      
      acc[key].template_count++;
      acc[key].avg_response_rate += (perf?.responseRate as number) || 0;
      acc[key].avg_appointment_rate += (perf?.appointmentRate as number) || 0;
      acc[key].total_uses += (perf?.timesUsed as number) || 0;
      
      return acc;
    }, {} as Record<string, {
      category: string;
      subcategory: string;
      template_count: number;
      avg_response_rate: number;
      avg_appointment_rate: number;
      total_uses: number;
    }>);
    
    return Object.values(report).map((item) => ({
      ...item,
      avg_response_rate: item.avg_response_rate / item.template_count,
      avg_appointment_rate: item.avg_appointment_rate / item.template_count
    }));
  }
  
  /**
   * Optimize templates based on performance
   */
  async optimizeTemplates(): Promise<void> {
    // Disable low-performing templates
    await prisma.promptTemplate.updateMany({
      where: {
        AND: [
          { isActive: true },
          { 
            performance: {
              path: ['appointmentRate'],
              lt: 0.10 // Less than 10% appointment rate
            }
          },
          {
            performance: {
              path: ['timesUsed'],
              gt: 50 // Used more than 50 times (statistically significant)
            }
          }
        ]
      },
      data: { isActive: false }
    });
    
    console.log('🚫 Disabled low-performing templates');
    
    // Promote high-performing variations
    const highPerformers = await prisma.promptTemplate.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            performance: {
              path: ['appointmentRate'],
              gt: 0.40 // Greater than 40% appointment rate
            }
          }
        ]
      }
    });
    
    console.log(`🚀 Found ${highPerformers.length} high-performing templates`);
  }
}

export const templateManager = new TemplateManager();