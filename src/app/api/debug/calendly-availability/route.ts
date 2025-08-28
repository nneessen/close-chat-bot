import { calendlyService } from '@/services/calendly';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing Calendly availability...');
    
    // Get event types first
    const eventTypes = await calendlyService.getEventTypes();
    console.log('📋 Event types:', eventTypes.map(et => ({ name: et.name, uri: et.uri })));
    
    if (eventTypes.length === 0) {
      return Response.json({ 
        error: 'No event types found',
        success: false
      });
    }
    
    const testEventType = eventTypes[0];
    console.log('🎯 Using event type:', testEventType.name);
    
    // Test availability formatting
    const availabilityText = await calendlyService.formatAvailableTimesForSMS(testEventType.uri);
    console.log('⏰ Availability response:', availabilityText);
    
    // Test raw available times
    const now = new Date();
    const endDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const availableTimes = await calendlyService.getAvailableTimes(
      testEventType.uri, 
      now.toISOString(), 
      endDate.toISOString()
    );
    
    return Response.json({
      success: true,
      eventTypes: eventTypes.map(et => ({ name: et.name, uri: et.uri })),
      availabilityText,
      rawAvailableTimes: availableTimes,
      testConfig: {
        currentTime: now.toISOString(),
        searchEndTime: endDate.toISOString(),
        currentHour: now.getHours()
      }
    });
    
  } catch (error) {
    console.error('❌ Calendly availability test failed:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}