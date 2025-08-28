import axios, { AxiosInstance } from 'axios';
import env from '@/lib/env';
import { CloseSMSActivity, CloseWebhookSubscription, CloseAPIResponse } from '@/types';

export interface SendSMSParams {
  leadId: string;
  text: string;
  localPhone: string;
  remotePhone: string;
  status?: 'outbox' | 'draft' | 'scheduled';
  templateId?: string;
}

export interface CloseLead {
  id: string;
  name: string;
  organization_id: string;
  status_id: string;
  status_label: string;
  contacts: Array<{
    id: string;
    name: string;
    title?: string;
    emails: Array<{
      type: string;
      email: string;
    }>;
    phones: Array<{
      type: string;
      phone: string;
    }>;
  }>;
  custom?: Record<string, unknown>;
  date_created: string;
  date_updated: string;
}

class CloseService {
  private client: AxiosInstance;

  constructor() {
    // Use env.CLOSE_API_KEY if available, fallback to process.env for build-safe scenarios
    const closeApiKey = env.CLOSE_API_KEY || process.env.CLOSE_API_KEY;
    
    this.client = axios.create({
      baseURL: 'https://api.close.com/api/v1',
      auth: {
        username: closeApiKey!,
        password: '',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging and error handling
    this.client.interceptors.request.use(
      (config) => {
        if (env.ENABLE_DEBUG_MODE || process.env.ENABLE_DEBUG_MODE === 'true') {
          console.log('Close API Request:', {
            method: config.method,
            url: config.url,
            data: config.data,
          });
        }
        return config;
      },
      (error) => {
        console.error('Close API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        if (env.ENABLE_DEBUG_MODE || process.env.ENABLE_DEBUG_MODE === 'true') {
          console.log('Close API Response:', {
            status: response.status,
            data: response.data,
          });
        }
        return response;
      },
      (error) => {
        console.error('Close API Response Error:', {
          status: error.response?.status,
          message: error.response?.data?.error || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  async sendSMS(params: SendSMSParams): Promise<CloseSMSActivity> {
    try {
      const smsPayload = {
        lead_id: params.leadId,
        text: params.text,
        local_phone: params.localPhone,
        remote_phone: params.remotePhone,
        status: params.status || 'outbox',
        template_id: params.templateId,
      };
      
      console.log('📤 Sending SMS to Close.io API:', smsPayload);
      
      const response = await this.client.post('/activity/sms/', smsPayload);
      
      console.log('✅ Close.io SMS API response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Close.io SMS API error - Full details:');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown }; config?: { data?: unknown } };
        console.error('- Status:', axiosError.response?.status);
        console.error('- Status Text:', axiosError.response?.statusText);
        console.error('- Response Data:', JSON.stringify(axiosError.response?.data, null, 2));
        console.error('- Request Config:', JSON.stringify(axiosError.config?.data, null, 2));
      }
      console.error('- Error Message:', error instanceof Error ? error.message : String(error));
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send SMS: ${errorMessage}`);
    }
  }

  async getLead(leadId: string): Promise<CloseLead | null> {
    try {
      const response = await this.client.get(`/lead/${leadId}/`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Failed to get lead:', error);
      throw new Error(`Failed to get lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateLead(leadId: string, data: Partial<CloseLead>): Promise<CloseLead> {
    try {
      const response = await this.client.put(`/lead/${leadId}/`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update lead:', error);
      throw new Error(`Failed to update lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSMSActivities(leadId: string, limit = 20): Promise<CloseSMSActivity[]> {
    try {
      const response = await this.client.get('/activity/sms/', {
        params: {
          lead_id: leadId,
          _limit: limit,
        },
      });
      
      return (response.data as CloseAPIResponse<CloseSMSActivity>).data || [];
    } catch (error) {
      console.error('Failed to get SMS activities:', error);
      throw new Error(`Failed to get SMS activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createWebhookSubscription(url: string, events: string[]): Promise<CloseWebhookSubscription> {
    try {
      const response = await this.client.post('/webhook/', {
        url,
        events,
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create webhook subscription:', error);
      throw new Error(`Failed to create webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWebhookSubscriptions(): Promise<CloseWebhookSubscription[]> {
    try {
      const response = await this.client.get('/webhook/');
      return (response.data as CloseAPIResponse<CloseWebhookSubscription>).data || [];
    } catch (error) {
      console.error('Failed to get webhook subscriptions:', error);
      throw new Error(`Failed to get webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteWebhookSubscription(webhookId: string): Promise<void> {
    try {
      await this.client.delete(`/webhook/${webhookId}/`);
    } catch (error) {
      console.error('Failed to delete webhook subscription:', error);
      throw new Error(`Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchLeads(query: {
    query?: string;
    phone?: string;
    email?: string;
    limit?: number;
  }): Promise<CloseLead[]> {
    try {
      const response = await this.client.get('/lead/', {
        params: {
          query: query.query,
          phone: query.phone,
          email: query.email,
          _limit: query.limit || 20,
        },
      });
      
      return (response.data as CloseAPIResponse<CloseLead>).data || [];
    } catch (error) {
      console.error('Failed to search leads:', error);
      throw new Error(`Failed to search leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPromptTemplates(): Promise<Array<{ id: string; name: string; text: string }>> {
    try {
      const response = await this.client.get('/sms_template/');
      return (response.data as CloseAPIResponse<{ id: string; name: string; text: string }>).data || [];
    } catch (error) {
      console.error('Failed to get SMS templates:', error);
      return []; // Non-critical, return empty array
    }
  }
}

export const closeService = new CloseService();