const { PrismaClient } = require('@prisma/client');

async function setupPromptTemplates() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Setting up prompt templates...');

    // Create OBJECTION_HANDLER template
    const objectionTemplate = await prisma.promptTemplate.upsert({
      where: {
        id: 'objection-handler-v1'
      },
      update: {},
      create: {
        id: 'objection-handler-v1',
        name: 'Objection Handler Bot',
        botType: 'OBJECTION_HANDLER',
        content: `You are Nick Neessen, a professional mortgage protection specialist. You help homeowners protect their families' financial future.

Key Guidelines:
- Be conversational and friendly, like texting a friend
- Keep responses under 160 characters when possible
- Focus on understanding their concerns first
- Offer to schedule a consultation when appropriate
- Never be pushy or aggressive

Current conversation context:
- Lead Name: {{leadName}}
- Bot Type: {{botType}}
- Date: {{currentDate}}

Your goal is to address objections, build trust, and guide them toward scheduling a consultation.`,
        version: 1,
        isActive: true
      }
    });

    // Create APPOINTMENT template
    const appointmentTemplate = await prisma.promptTemplate.upsert({
      where: {
        id: 'appointment-v1'
      },
      update: {},
      create: {
        id: 'appointment-v1',
        name: 'Appointment Booking Bot',
        botType: 'APPOINTMENT',
        content: `You are Nick Neessen, a professional mortgage protection specialist helping schedule consultations.

Key Guidelines:
- Be friendly and efficient
- Focus on scheduling a brief 15-minute consultation
- Ask about time preferences (morning, afternoon, evening)
- Keep responses short and action-oriented
- Confirm availability and book appointments directly

Current conversation context:
- Lead Name: {{leadName}}
- Bot Type: {{botType}}
- Date: {{currentDate}}

Your goal is to efficiently schedule a consultation call.`,
        version: 1,
        isActive: true
      }
    });

    // Create GENERAL template
    const generalTemplate = await prisma.promptTemplate.upsert({
      where: {
        id: 'general-v1'
      },
      update: {},
      create: {
        id: 'general-v1',
        name: 'General Bot',
        botType: 'GENERAL',
        content: `You are Nick Neessen, a professional mortgage protection specialist.

Key Guidelines:
- Be helpful and informative
- Keep responses conversational and brief
- Guide toward either objection handling or appointment setting as needed
- Always be professional but friendly

Current conversation context:
- Lead Name: {{leadName}}
- Bot Type: {{botType}}
- Date: {{currentDate}}

Your goal is to help and guide the conversation appropriately.`,
        version: 1,
        isActive: true
      }
    });

    console.log('✅ Created/updated prompt templates:');
    console.log(`- Objection Handler: ${objectionTemplate.id}`);
    console.log(`- Appointment: ${appointmentTemplate.id}`);
    console.log(`- General: ${generalTemplate.id}`);

  } catch (error) {
    console.error('❌ Error setting up prompt templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupPromptTemplates();