import { calendlyService } from './calendly';
import { prisma } from '@/lib/prisma';

interface AppointmentBookingContext {
  leadInfo: {
    name: string;
    email?: string;
    phone: string;
    leadId: string;
  };
  userMessage: string;
  conversationId: string;
  previousMessages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

interface AppointmentBookingResult {
  action: 'show_availability' | 'book_appointment' | 'request_info' | 'general_response';
  response: string;
  appointmentDetails?: {
    dateTime: string;
    duration: number;
    calendlyUri?: string;
  };
}

interface TimePreferences {
  dayFilter: 'today' | 'tomorrow' | 'this_week' | 'any';
  timeFilter: {
    after?: number;
    before?: number;
    between?: [number, number];
  };
}

export class AppointmentBookingService {
  async handleAppointmentRequest(context: AppointmentBookingContext): Promise<AppointmentBookingResult> {
    const { userMessage, leadInfo } = context;
    
    console.log('📅 Handling appointment request:', userMessage);

    // Check if user is selecting a time slot (1, 2, 3, etc.)
    const timeSlotMatch = userMessage.match(/^([1-9])$/);
    if (timeSlotMatch) {
      return await this.handleTimeSlotSelection(parseInt(timeSlotMatch[1]), context);
    }

    // Check if we need to confirm the lead's email for booking
    if (!leadInfo.email) {
      return {
        action: 'request_info',
        response: `I'd be happy to book that appointment for you! I'll just need your email address to send you the confirmation. What's your email?`
      };
    }
    
    // If we have the email, confirm it with them and proceed to show availability
    return await this.showAvailabilityWithEmailConfirmation(context);
  }

  private async showAvailabilityWithEmailConfirmation(context: AppointmentBookingContext): Promise<AppointmentBookingResult> {
    try {
      console.log('📅 Showing availability with email confirmation');
      
      // Parse user preferences from the message
      const preferences = this.parseTimePreferences(context.userMessage);
      console.log('🕐 Parsed time preferences:', preferences);
      
      // Get event types (assuming mortgage protection consultation)
      const eventTypes = await calendlyService.getEventTypes();
      const mortgageEventType = eventTypes.find(et => 
        et.name.toLowerCase().includes('mortgage') || 
        et.name.toLowerCase().includes('consultation')
      ) || eventTypes[0]; // Fallback to first event type

      if (!mortgageEventType) {
        return {
          action: 'general_response',
          response: `I'd love to schedule a call with you! Let me check my calendar manually. Are you available tomorrow afternoon or later this week?`
        };
      }

      // Get filtered available times based on user preferences
      const availabilityText = await calendlyService.formatAvailableTimesForSMS(mortgageEventType.uri, preferences);
      
      // Store the event type in conversation metadata for later booking
      await this.storeEventTypeForConversation(context.conversationId, mortgageEventType.uri);

      // Add email confirmation to the response
      const emailConfirmation = `I'll send the confirmation to ${context.leadInfo.email} - does that work for you?`;
      
      return {
        action: 'show_availability',
        response: `${availabilityText}\n\n${emailConfirmation}`
      };
    } catch (error) {
      console.error('❌ Error showing availability with email confirmation:', error);
      return {
        action: 'general_response',
        response: `I'd be happy to schedule your appointment! Let me check my calendar and get back to you with some available times.`
      };
    }
  }

  private async showAvailability(context: AppointmentBookingContext): Promise<AppointmentBookingResult> {
    try {
      console.log('📅 Showing availability');
      
      // Parse user preferences from the message
      const preferences = this.parseTimePreferences(context.userMessage);
      console.log('🕐 Parsed time preferences:', preferences);
      
      // Get event types (assuming mortgage protection consultation)
      const eventTypes = await calendlyService.getEventTypes();
      const mortgageEventType = eventTypes.find(et => 
        et.name.toLowerCase().includes('mortgage') || 
        et.name.toLowerCase().includes('consultation')
      ) || eventTypes[0]; // Fallback to first event type

      if (!mortgageEventType) {
        return {
          action: 'general_response',
          response: `I'd love to schedule a call with you! Let me check my calendar manually. Are you available tomorrow afternoon or later this week?`
        };
      }

      // Get filtered available times based on user preferences
      const availabilityText = await calendlyService.formatAvailableTimesForSMS(mortgageEventType.uri, preferences);
      
      // Store the event type in conversation metadata for later booking
      await this.storeEventTypeForConversation(context.conversationId, mortgageEventType.uri);

      return {
        action: 'show_availability',
        response: availabilityText
      };
    } catch (error) {
      console.error('❌ Error showing availability:', error);
      return {
        action: 'general_response',
        response: `I'd be happy to schedule a call! Let me check my calendar and get back to you with some available times. Are mornings or afternoons better for you?`
      };
    }
  }

  private async handleTimeSlotSelection(
    slotNumber: number, 
    context: AppointmentBookingContext
  ): Promise<AppointmentBookingResult> {
    try {
      console.log('📅 Handling time slot selection:', slotNumber);

      // Get the event type URI from conversation metadata
      const eventTypeUri = await this.getEventTypeForConversation(context.conversationId);
      if (!eventTypeUri) {
        return {
          action: 'show_availability',
          response: `Let me show you my available times first, then you can pick one:`
        };
      }

      // Get available times again
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const availableTimes = await calendlyService.getAvailableTimes(eventTypeUri, startDate, endDate);

      if (slotNumber < 1 || slotNumber > availableTimes.length) {
        return {
          action: 'general_response',
          response: `Please choose a number between 1 and ${availableTimes.length}. Which time works best for you?`
        };
      }

      const selectedTime = availableTimes[slotNumber - 1];
      
      // Check if we have email
      if (!context.leadInfo.email) {
        return {
          action: 'request_info',
          response: `Perfect! I'll book ${this.formatDateTime(selectedTime)} for you. I just need your email address to send the confirmation.`
        };
      }

      // Book the appointment
      const bookingResult = await this.bookAppointment(selectedTime, eventTypeUri, context.leadInfo);
      
      if (bookingResult.success) {
        return {
          action: 'book_appointment',
          response: `✅ Perfect! Your appointment is confirmed for ${this.formatDateTime(selectedTime)}.\n\nYou'll receive a confirmation email at ${context.leadInfo.email} with all the details and calendar invitation.\n\nI look forward to speaking with you!`,
          appointmentDetails: {
            dateTime: selectedTime,
            duration: 30, // Default 30 minutes
            appointmentId: bookingResult.appointmentDetails?.id
          }
        };
      } else {
        return {
          action: 'general_response',
          response: `I had trouble booking that specific time. Let me check my calendar manually and confirm ${this.formatDateTime(selectedTime)} works for you.`
        };
      }
    } catch (error) {
      console.error('❌ Error handling time slot selection:', error);
      return {
        action: 'general_response',
        response: `Let me confirm that time manually. I'll get back to you within a few minutes to confirm your appointment.`
      };
    }
  }

  private async bookAppointment(
    dateTime: string, 
    eventTypeUri: string, 
    leadInfo: { name: string; email?: string; phone: string; leadId: string }
  ): Promise<{ success: boolean; appointmentDetails?: any; error?: string }> {
    try {
      console.log('📅 Booking appointment:', { dateTime, leadInfo: leadInfo.name });

      // Actually book the appointment directly in Calendly
      const bookingResult = await calendlyService.bookAppointment({
        eventTypeUri,
        dateTime,
        invitee: {
          name: leadInfo.name,
          email: leadInfo.email!,
          phone: leadInfo.phone,
        }
      });
      
      // Store appointment in database
      const appointment = await prisma.appointment.create({
        data: {
          leadId: leadInfo.leadId,
          calendlyEventId: bookingResult.eventUri || 'pending',
          scheduledAt: new Date(dateTime),
          duration: 30,
          status: 'scheduled',
          eventType: 'mortgage_consultation',
          metadata: {
            attendeeEmail: leadInfo.email!,
            attendeeName: leadInfo.name,
            attendeePhone: leadInfo.phone,
            calendlyEventUri: bookingResult.eventUri
          }
        }
      });

      return { 
        success: true, 
        appointmentDetails: {
          id: appointment.id,
          scheduledAt: dateTime,
          eventUri: bookingResult.eventUri
        }
      };
    } catch (error) {
      console.error('❌ Booking failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async storeEventTypeForConversation(conversationId: string, eventTypeUri: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        context: {
          eventTypeUri,
          lastAvailabilityShown: new Date().toISOString()
        }
      }
    });
  }

  private async getEventTypeForConversation(conversationId: string): Promise<string | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    
    return (conversation?.context as Record<string, unknown>)?.eventTypeUri as string || null;
  }

  private parseTimePreferences(message: string): TimePreferences {
    const lowerMessage = message.toLowerCase();
    
    // Parse day preferences
    let dayFilter: 'today' | 'tomorrow' | 'this_week' | 'any' = 'any';
    if (lowerMessage.includes('today')) {
      dayFilter = 'today';
    } else if (lowerMessage.includes('tomorrow')) {
      dayFilter = 'tomorrow';
    } else if (lowerMessage.includes('this week')) {
      dayFilter = 'this_week';
    }
    
    // Parse time preferences
    const timeFilter: { after?: number; before?: number; between?: [number, number] } = {};
    
    // Handle "after X pm/am" patterns
    const afterMatch = lowerMessage.match(/after\s+(\d{1,2})(?:\s*(am|pm))?/i);
    if (afterMatch) {
      let hour = parseInt(afterMatch[1]);
      const ampm = afterMatch[2]?.toLowerCase();
      
      // Convert to 24-hour format
      if (ampm === 'pm' && hour < 12) hour += 12;
      else if (ampm === 'am' && hour === 12) hour = 0;
      else if (!ampm && hour <= 12) hour += 12; // Default to PM for ambiguous times
      
      timeFilter.after = hour;
    }
    
    // Handle "before X pm/am" patterns
    const beforeMatch = lowerMessage.match(/before\s+(\d{1,2})(?:\s*(am|pm))?/i);
    if (beforeMatch) {
      let hour = parseInt(beforeMatch[1]);
      const ampm = beforeMatch[2]?.toLowerCase();
      
      if (ampm === 'pm' && hour < 12) hour += 12;
      else if (ampm === 'am' && hour === 12) hour = 0;
      else if (!ampm && hour <= 12) hour += 12;
      
      timeFilter.before = hour;
    }
    
    // Handle "between X and Y" patterns
    const betweenMatch = lowerMessage.match(/between\s+(\d{1,2})(?:\s*(am|pm))?\s+and\s+(\d{1,2})(?:\s*(am|pm))?/i);
    if (betweenMatch) {
      let startHour = parseInt(betweenMatch[1]);
      let endHour = parseInt(betweenMatch[3]);
      const startAmPm = betweenMatch[2]?.toLowerCase();
      const endAmPm = betweenMatch[4]?.toLowerCase();
      
      // Convert both to 24-hour format
      if (startAmPm === 'pm' && startHour < 12) startHour += 12;
      else if (startAmPm === 'am' && startHour === 12) startHour = 0;
      
      if (endAmPm === 'pm' && endHour < 12) endHour += 12;
      else if (endAmPm === 'am' && endHour === 12) endHour = 0;
      
      timeFilter.between = [startHour, endHour];
    }
    
    // Handle morning/afternoon/evening keywords
    if (lowerMessage.includes('morning') || lowerMessage.includes('am')) {
      timeFilter.after = 8;  // Start at 8 AM
      timeFilter.before = 12; // End before noon
    } else if (lowerMessage.includes('afternoon') || lowerMessage.includes('lunch')) {
      timeFilter.after = 12;  // Start at noon
      timeFilter.before = 17; // End before 5 PM
    } else if (lowerMessage.includes('evening') || lowerMessage.includes('night')) {
      timeFilter.after = 17; // Start at 5 PM
      timeFilter.before = 20; // End before 8 PM
    }
    
    return {
      dayFilter,
      timeFilter
    };
  }

  private formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${dayName}, ${dateStr} at ${timeStr}`;
  }
}

export const appointmentBookingService = new AppointmentBookingService();