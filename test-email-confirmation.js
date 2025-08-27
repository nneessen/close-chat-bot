#!/usr/bin/env tsx

// Test email confirmation enhancement
import { appointmentBookingService } from './src/services/appointment-booking.ts';
import { PrismaClient } from '@prisma/client';

async function testEmailConfirmation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing email confirmation enhancement...');
    
    // Create test conversation
    const testConversation = await prisma.conversation.create({
      data: {
        leadId: 'cmeu98wty0000u5uufv989ff7', // Using the test lead with email
        botType: 'APPOINTMENT',
        status: 'active'
      }
    });
    
    console.log('✅ Test conversation created:', testConversation.id);
    
    // Test context with lead that has email
    const testContext = {
      leadInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com', // Lead has email
        phone: '+15551234567',
        leadId: 'cmeu98wty0000u5uufv989ff7'
      },
      userMessage: 'What time slots do you have available for today after 5pm?',
      conversationId: testConversation.id,
      previousMessages: []
    };
    
    console.log('📅 Testing appointment booking with email confirmation...');
    const result = await appointmentBookingService.handleAppointmentRequest(testContext);
    
    console.log('✅ Appointment booking result:');
    console.log('Action:', result.action);
    console.log('Response:', result.response);
    
    // Check if response includes email confirmation
    if (result.response.includes('john.doe@example.com')) {
      console.log('✅ SUCCESS: Response includes email confirmation!');
    } else {
      console.log('❌ FAIL: Response does not include email confirmation');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailConfirmation().catch(console.error);