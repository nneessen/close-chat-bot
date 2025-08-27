#!/usr/bin/env tsx

// Test appointment booking with a mock lead that has an email
const { PrismaClient } = require('@prisma/client');

async function testAppointmentWithEmail() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing appointment booking with existing email...');
    
    // Create or update a test lead with email
    const testLead = await prisma.lead.upsert({
      where: { closeId: 'test-lead-with-email' },
      update: {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567'
      },
      create: {
        closeId: 'test-lead-with-email',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567',
        status: 'active'
      }
    });
    
    console.log('✅ Test lead created/updated:', {
      id: testLead.id,
      email: testLead.email,
      name: `${testLead.firstName} ${testLead.lastName}`
    });
    
    // Now test the appointment booking service directly
    const { appointmentBookingService } = require('./src/services/appointment-booking.ts');
    
    const testContext = {
      leadInfo: {
        name: `${testLead.firstName} ${testLead.lastName}`,
        email: testLead.email,
        phone: testLead.phone,
        leadId: testLead.id
      },
      userMessage: 'What time slots do you have available for today after 5pm?',
      conversationId: 'test-conv-' + Date.now(),
      previousMessages: []
    };
    
    console.log('📅 Testing appointment request with email confirmation...');
    const result = await appointmentBookingService.handleAppointmentRequest(testContext);
    
    console.log('✅ Appointment booking result:');
    console.log('Action:', result.action);
    console.log('Response preview:', result.response.substring(0, 200) + '...');
    console.log('Full response:', result.response);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAppointmentWithEmail().catch(console.error);