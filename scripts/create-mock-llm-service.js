#!/usr/bin/env node

/**
 * Mock LLM Service for testing without API keys
 * This replaces the LLM calls with mock responses for testing
 */

const fs = require('fs');
const path = require('path');

const mockLLMService = `import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ConversationContext, LLMResponse } from '@/types';
import env from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { BotType } from '@prisma/client';

class LLMService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }

    if (env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
    }
  }

  async generateResponse(
    userMessage: string,
    context: ConversationContext
  ): Promise<LLMResponse | null> {
    try {
      // Get the appropriate prompt template
      const promptTemplate = await this.getPromptTemplate(context.botType);
      
      if (!promptTemplate) {
        console.error(\`No prompt template found for bot type: \${context.botType}\`);
        return null;
      }

      // Build the system prompt with context
      const systemPrompt = this.buildSystemPrompt(promptTemplate.content, context);
      
      // Build conversation history
      const messages = this.buildMessageHistory(context.previousMessages, systemPrompt);
      messages.push({ role: 'user', content: userMessage });

      let response: LLMResponse;

      // MOCK RESPONSE FOR TESTING - Remove this section for production
      if (env.ENABLE_DEBUG_MODE === 'true' && (!env.OPENAI_API_KEY?.startsWith('sk-proj-') || !env.ANTHROPIC_API_KEY?.startsWith('sk-ant-'))) {
        console.log('🤖 Using mock LLM response for testing...');
        response = this.generateMockResponse(userMessage, context.botType);
      } else if (env.LLM_PROVIDER === 'anthropic' && this.anthropic) {
        response = await this.generateAnthropicResponse(messages);
      } else if (env.LLM_PROVIDER === 'openai' && this.openai) {
        response = await this.generateOpenAIResponse(messages);
      } else {
        throw new Error(\`LLM provider \${env.LLM_PROVIDER} not configured\`);
      }

      return response;
    } catch (error) {
      console.error('LLM generation error:', error);
      return null;
    }
  }

  private generateMockResponse(userMessage: string, botType: 'appointment' | 'objection' | 'general'): LLMResponse {
    const mockResponses = {
      appointment: [
        "Hi there! I'd love to help you schedule a consultation about mortgage protection. I have some time available tomorrow afternoon - would that work for you?",
        "Great to hear from you! Let me help you find the perfect time for a quick 15-minute consultation. Are mornings or afternoons better for you?",
        "Thanks for reaching out! I can schedule a brief call to discuss your mortgage protection options. What's your preferred time - morning, afternoon, or evening?"
      ],
      objection: [
        "I completely understand your hesitation. Many homeowners feel the same way initially. Can I share why mortgage protection becomes so important once you understand the risks?",
        "That's a very common concern, and I appreciate you being honest about it. Let me explain how mortgage protection actually works and why it might be more affordable than you think.",
        "I hear this a lot, and it's totally understandable. The good news is that mortgage protection is designed to be much more affordable than traditional life insurance. Can I show you some numbers?"
      ],
      general: [
        "Thanks for your message! I'm here to help you understand your mortgage protection options. What specific questions do you have?",
        "Hi! I'm Nick, and I specialize in helping homeowners protect their families' financial future. How can I assist you today?",
        "Great to connect with you! I'd be happy to answer any questions about mortgage protection or life insurance. What would you like to know?"
      ]
    };

    const responses = mockResponses[botType] || mockResponses.general;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      content: randomResponse,
      tokens: randomResponse.length / 4, // Rough token estimate
      finishReason: 'stop',
      model: 'mock-model-for-testing'
    };
  }

  private async generateOpenAIResponse(
    messages: Array<{ role: string; content: string }>
  ): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: env.LLM_MODEL || 'gpt-4o-mini',
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_tokens: 500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const choice = completion.choices[0];
    
    return {
      content: choice.message.content || '',
      tokens: completion.usage?.total_tokens || 0,
      finishReason: choice.finish_reason || 'stop',
      model: completion.model,
    };
  }

  private async generateAnthropicResponse(
    messages: Array<{ role: string; content: string }>
  ): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    // Anthropic expects system message separately
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const response = await this.anthropic.messages.create({
      model: env.LLM_MODEL || 'claude-3-5-sonnet-20241022',
      system: systemMessage,
      messages: conversationMessages as Anthropic.MessageParam[],
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = response.content[0];
    
    return {
      content: content.type === 'text' ? content.text : '',
      tokens: response.usage.input_tokens + response.usage.output_tokens,
      finishReason: response.stop_reason || 'stop',
      model: response.model,
    };
  }

  private async getPromptTemplate(botType: string) {
    // Convert context botType to database enum
    const dbBotType: BotType = botType === 'appointment' ? BotType.APPOINTMENT : 
                               botType === 'objection' ? BotType.OBJECTION_HANDLER : 
                               BotType.GENERAL;
    
    return await prisma.promptTemplate.findFirst({
      where: {
        botType: dbBotType,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });
  }

  private buildSystemPrompt(template: string, context: ConversationContext): string {
    let prompt = template;

    // Replace variables in the template
    const variables = {
      leadName: context.leadInfo?.name || 'there',
      leadEmail: context.leadInfo?.email || '',
      leadPhone: context.leadInfo?.phone || '',
      botType: context.botType,
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString(),
    };

    Object.entries(variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(\`{{\${key}}}\`, 'g'), value);
    });

    return prompt;
  }

  private buildMessageHistory(
    messages: ConversationContext['previousMessages'],
    systemPrompt: string
  ): Array<{ role: string; content: string }> {
    const history = [{ role: 'system', content: systemPrompt }];
    
    // Add previous messages (limit to prevent context overflow)
    const recentMessages = messages.slice(-8); // Last 8 messages
    
    for (const msg of recentMessages) {
      history.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    return history;
  }

  // Utility method for testing different prompts
  async testPrompt(
    prompt: string,
    userMessage: string
  ): Promise<LLMResponse | null> {
    // Create temporary template
    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: userMessage },
    ];

    try {
      if (env.LLM_PROVIDER === 'anthropic' && this.anthropic) {
        return await this.generateAnthropicResponse(messages);
      } else if (env.LLM_PROVIDER === 'openai' && this.openai) {
        return await this.generateOpenAIResponse(messages);
      } else {
        throw new Error(\`LLM provider \${env.LLM_PROVIDER} not configured\`);
      }
    } catch (error) {
      console.error('Prompt test error:', error);
      return null;
    }
  }
}

export const llmService = new LLMService();
`;

// Create backup of original file
const originalPath = path.join(__dirname, '../src/services/llm.ts');
const backupPath = path.join(__dirname, '../src/services/llm.ts.backup');

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(originalPath, backupPath);
  console.log('✅ Backed up original llm.ts to llm.ts.backup');
}

// Write mock version
fs.writeFileSync(originalPath, mockLLMService);
console.log('✅ Updated LLM service with mock responses for testing');
console.log('📝 Mock responses will be used when ENABLE_DEBUG_MODE=true and no valid API keys are present');
console.log('🔧 To restore original: cp src/services/llm.ts.backup src/services/llm.ts');