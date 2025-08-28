import axios, { AxiosInstance } from 'axios';
import env from '@/lib/env';

interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  scheduling_url: string;
  duration: number;
  kind: string;
}

interface CalendlyUser {
  uri: string;
  name: string;
  email: string;
  timezone: string;
  avatar_url?: string;
}

interface CalendlyAvailabilityTime {
  start_time: string;
  end_time: string;
  status: 'available' | 'busy';
}

interface CalendlyBookingParams {
  event_type_uri: string;
  start_time: string;
  end_time: string;
  invitee: {
    name: string;
    email: string;
    phone?: string;
  };
  answers?: Array<{
    question: string;
    answer: string;
  }>;
}

interface TimePreferences {
  dayFilter: 'today' | 'tomorrow' | 'this_week' | 'any';
  timeFilter: {
    after?: number;
    before?: number;
    between?: [number, number];
  };
}

class CalendlyService {
  private client: AxiosInstance;
  private userUri: string;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${env.CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    this.userUri = env.CALENDLY_USER_URI || '';

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        if (env.ENABLE_DEBUG_MODE) {
          console.log('📅 Calendly API Request:', {
            method: config.method,
            url: config.url,
            data: config.data,
          });
        }
        return config;
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        if (env.ENABLE_DEBUG_MODE) {
          console.log('📅 Calendly API Response:', {
            status: response.status,
            data: response.data,
          });
        }
        return response;
      },
      (error) => {
        console.error('❌ Calendly API Error:', {
          status: error.response?.status,
          message: error.response?.data || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  async getCurrentUser(): Promise<CalendlyUser> {
    try {
      const response = await this.client.get('/users/me');
      return response.data.resource;
    } catch (error) {
      console.error('Failed to get Calendly user:', error);
      throw new Error(`Failed to get Calendly user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEventTypes(): Promise<CalendlyEventType[]> {
    try {
      const user = await this.getCurrentUser();
      const response = await this.client.get('/event_types', {
        params: {
          user: user.uri,
          active: true
        }
      });
      return response.data.collection;
    } catch (error) {
      console.error('Failed to get event types:', error);
      throw new Error(`Failed to get event types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAvailability(
    eventTypeUri: string,
    startDate: string,
    endDate: string
  ): Promise<CalendlyAvailabilityTime[]> {
    try {
      console.log('📅 Getting availability for:', { eventTypeUri, startDate, endDate });
      
      const response = await this.client.get('/calendar_events', {
        params: {
          user: this.userUri,
          min_start_time: startDate,
          max_start_time: endDate
        }
      });

      // Transform the response to show available times
      // This is simplified - in reality you'd need to cross-reference with your actual calendar
      return response.data.collection.map((event: { start_time: string; end_time: string }) => ({
        start_time: event.start_time,
        end_time: event.end_time,
        status: 'busy' as const
      }));
    } catch (error) {
      console.error('Failed to get availability:', error);
      throw new Error(`Failed to get availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAvailableTimes(
    eventTypeUri: string,
    startDate: string,
    endDate: string,
    preferences?: TimePreferences
  ): Promise<string[]> {
    try {
      console.log('📅 Getting available times for booking');
      
      // Get the event type details first
      const eventTypes = await this.getEventTypes();
      const eventType = eventTypes.find(et => et.uri === eventTypeUri);
      
      if (!eventType) {
        throw new Error('Event type not found');
      }

      // For now, return some mock available times based on preferences
      // In a full implementation, you'd integrate with Calendly's availability API
      const availableTimes = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();
      
      // Determine date range based on preferences
      let searchEnd = new Date(end);
      if (preferences?.dayFilter === 'today') {
        searchEnd = new Date();
        searchEnd.setHours(23, 59, 59, 999);
      } else if (preferences?.dayFilter === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        start.setTime(tomorrow.getTime());
        start.setHours(0, 0, 0, 0);
        searchEnd = new Date(tomorrow);
        searchEnd.setHours(23, 59, 59, 999);
      }
      
      // Generate hourly slots between 9 AM and 6 PM for the date range
      for (let d = new Date(start); d <= searchEnd; d.setDate(d.getDate() + 1)) {
        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        
        // Determine time range for this day
        let startHour = 9;
        let endHour = 18;
        
        // Apply time filters from preferences
        if (preferences?.timeFilter) {
          if (preferences.timeFilter.after !== undefined) {
            startHour = Math.max(startHour, preferences.timeFilter.after);
          }
          if (preferences.timeFilter.before !== undefined) {
            endHour = Math.min(endHour, preferences.timeFilter.before);
          }
          if (preferences.timeFilter.between) {
            startHour = Math.max(startHour, preferences.timeFilter.between[0]);
            endHour = Math.min(endHour, preferences.timeFilter.between[1]);
          }
        }
        
        // Generate time slots for this day
        for (let hour = startHour; hour < endHour; hour++) {
          const slotTime = new Date(d);
          slotTime.setHours(hour, 0, 0, 0);
          
          // Only show future times (at least 30 minutes from now)
          const minFutureTime = new Date(now.getTime() + 30 * 60 * 1000);
          if (slotTime > minFutureTime) {
            availableTimes.push(slotTime.toISOString());
          }
        }
      }
      
      console.log(`🕐 Found ${availableTimes.length} available slots matching preferences:`, preferences);
      return availableTimes.slice(0, 3); // Return first 3 available slots
    } catch (error) {
      console.error('Failed to get available times:', error);
      throw new Error(`Failed to get available times: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bookAppointment(params: {
    eventTypeUri: string;
    dateTime: string;
    invitee: {
      name: string;
      email: string;
      phone: string;
    };
  }): Promise<{ eventUri: string; bookingUrl?: string }> {
    try {
      console.log('📅 Booking appointment via Calendly one-time link:', params);

      const startTime = new Date(params.dateTime);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minute default

      // Create a one-time scheduling link that directly books the appointment
      const linkResult = await this.createOneTimeLink({
        event_type_uri: params.eventTypeUri,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        invitee: params.invitee
      });
      
      console.log('✅ Appointment booking link created successfully:', {
        bookingUrl: linkResult.booking_url,
        scheduledAt: params.dateTime,
        attendee: params.invitee.name
      });

      // The one-time link will handle the actual booking when accessed
      // For now, return a success status with the booking URL
      return {
        eventUri: linkResult.booking_url, // Use the booking URL as the event URI
        bookingUrl: linkResult.booking_url
      };
    } catch (error) {
      console.error('❌ Failed to create appointment booking:', error);
      
      // Fallback: Create a direct booking URL
      const fallbackUrl = this.buildDirectBookingUrl({
        event_type_uri: params.eventTypeUri,
        start_time: params.dateTime,
        end_time: new Date(new Date(params.dateTime).getTime() + 30 * 60 * 1000).toISOString(),
        invitee: params.invitee
      });
      
      console.log('🔄 Using fallback booking URL:', fallbackUrl);
      
      return {
        eventUri: fallbackUrl,
        bookingUrl: fallbackUrl
      };
    }
  }

  async createOneTimeLink(params: CalendlyBookingParams): Promise<{ booking_url: string; owner: string; owner_type: string }> {
    try {
      console.log('📅 Creating one-time scheduling link:', params);
      
      // Create a single-use scheduling link with pre-filled information
      const response = await this.client.post('/one_off_meetings', {
        name: 'Mortgage Protection Consultation',
        event_type: params.event_type_uri,
        start_time: params.start_time,
        end_time: params.end_time,
        invitees_counter: {
          total: 1,
          limit: 1
        },
        invitee: [{
          email: params.invitee.email,
          name: params.invitee.name
        }]
      });
      
      console.log('✅ One-time link created successfully:', response.data);
      return response.data.resource;
    } catch (error) {
      console.error('❌ Failed to create scheduling link:', error);
      console.error('Error details:', error);
      
      // Fallback: Return a regular Calendly link with pre-filled params
      const fallbackUrl = this.buildDirectBookingUrl(params);
      console.log('🔄 Using fallback direct booking URL:', fallbackUrl);
      
      return {
        booking_url: fallbackUrl,
        owner: 'fallback',
        owner_type: 'direct_link'
      };
    }
  }

  private buildDirectBookingUrl(params: CalendlyBookingParams): string {
    // Extract event type slug from URI
    const eventTypeSlug = params.event_type_uri.split('/').pop();
    
    // Build Calendly direct booking URL with pre-filled parameters
    const baseUrl = `https://calendly.com/nickneessen/${eventTypeSlug}`;
    const queryParams = new URLSearchParams({
      name: params.invitee.name,
      email: params.invitee.email,
      a1: params.start_time, // Pre-select the time
    });
    
    if (params.invitee.phone) {
      queryParams.set('phone', params.invitee.phone);
    }
    
    return `${baseUrl}?${queryParams.toString()}`;
  }

  async formatAvailableTimesForSMS(eventTypeUri: string, preferences?: TimePreferences): Promise<string> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Determine date range based on time of day  
      let startDate: string;
      let endDate: string;
      
      if (currentHour < 18) { // Before 6 PM EST - show same day and next day
        startDate = now.toISOString();
        endDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(); // Next 2 days
      } else { // After 6 PM EST - show same day and next day
        startDate = now.toISOString();
        endDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(); // Next 2 days
      }
      
      const availableTimes = await this.getAvailableTimes(eventTypeUri, startDate, endDate, preferences);
      
      if (availableTimes.length === 0) {
        return "I don't have any immediate availability, but let me check my calendar manually. What times work best for you this week?";
      }

      // Limit to max 3 options
      const limitedTimes = availableTimes.slice(0, 3);
      
      let formattedTimes = "Here are my next available times:\n\n";
      
      limitedTimes.forEach((time, index) => {
        const date = new Date(time);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        formattedTimes += `${index + 1}. ${dayName}, ${dateStr} at ${timeStr}\n`;
      });
      
      formattedTimes += "\nReply with the number you prefer (like '1' or '2') and I'll book it for you!";
      
      return formattedTimes;
    } catch (error) {
      console.error('Failed to format available times:', error);
      return "Let me check my calendar and get back to you with some available times. What days work best for you?";
    }
  }
}

export const calendlyService = new CalendlyService();