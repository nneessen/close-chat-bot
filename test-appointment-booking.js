#!/usr/bin/env node

// Test the enhanced appointment booking system
const { appointmentBookingService } = require('./src/services/appointment-booking.ts');

async function testAppointmentBooking() {
  console.log('🧪 Testing enhanced appointment booking...');
  
  // Test case 1: User requests times after 5pm today
  const testContext1 = {
    leadInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      leadId: 'test-lead-123'
    },
    userMessage: 'What time slots do you have available for today after 5pm?',
    conversationId: 'test-conv-123',
    previousMessages: []
  };
  
  try {
    console.log('📋 Test 1: "What time slots do you have available for today after 5pm?"');
    const result1 = await appointmentBookingService.handleAppointmentRequest(testContext1);
    console.log('✅ Result 1:', {
      action: result1.action,
      response: result1.response.substring(0, 200) + '...'
    });
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test case 2: User selects time slot 2
  const testContext2 = {
    leadInfo: {
      name: 'Jane Smith', 
      email: 'jane@example.com',
      phone: '555-5678',
      leadId: 'test-lead-456'
    },
    userMessage: '2',
    conversationId: 'test-conv-456',
    previousMessages: []
  };
  
  try {
    console.log('📋 Test 2: User selects time slot "2"');
    const result2 = await appointmentBookingService.handleAppointmentRequest(testContext2);
    console.log('✅ Result 2:', {
      action: result2.action,
      response: result2.response.substring(0, 200) + '...'
    });
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
}

testAppointmentBooking().catch(console.error);