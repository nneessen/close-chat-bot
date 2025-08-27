export interface CloseWebhookPayload {
  subscription_id: string;
  event: {
    id: string;
    object_type: string;
    action: string;
    date_created: string;
    date_updated: string;
    organization_id: string;
    user_id: string | null;
    request_id: string | null;
    api_key_id: string | null;
    oauth_client_id: string | null;
    oauth_scope: string | null;
    object_id: string;
    lead_id: string;
    changed_fields: string[];
    meta: Record<string, unknown>;
    data: {
      id: string;
      direction?: string;
      text?: string;
      lead_id?: string;
      local_phone?: string;
      remote_phone?: string;
      [key: string]: unknown;
    };
    previous_data: Record<string, unknown>;
  };
}

export interface CalendlyWebhookPayload {
  event: string;
  created_at: string;
  payload: {
    event?: {
      uri: string;
      name: string;
      status: string;
      start_time: string;
      end_time: string;
      event_type: string;
      location?: {
        type: string;
        location?: string;
      };
      invitees_counter: {
        total: number;
        active: number;
        limit: number;
      };
      created_at: string;
      updated_at: string;
      event_memberships: Array<{
        user: string;
        user_email: string;
        user_name: string;
      }>;
      event_guests: Array<{
        email: string;
        created_at: string;
        updated_at: string;
      }>;
    };
    invitee?: {
      uri: string;
      email: string;
      name: string;
      status: string;
      questions_and_answers: Array<{
        question: string;
        answer: string;
      }>;
      timezone: string;
      created_at: string;
      updated_at: string;
      tracking?: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
      };
      cancel_url: string;
      reschedule_url: string;
      rescheduled: boolean;
      cancellation?: {
        canceled_by: string;
        reason?: string;
      };
    };
    questions_and_answers?: Array<{
      question: string;
      answer: string;
    }>;
    tracking?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    };
  };
}

export interface CloseSMSActivity {
  id: string;
  organization_id: string;
  lead_id: string;
  contact_id?: string;
  user_id?: string;
  assigned_to?: string;
  status: 'inbox' | 'draft' | 'scheduled' | 'outbox' | 'sent';
  direction: 'inbound' | 'outbound';
  date_created: string;
  date_updated: string;
  date_scheduled?: string;
  date_sent?: string;
  local_phone: string;
  remote_phone: string;
  text: string;
  attachments?: Array<{
    url: string;
    filename: string;
    size: number;
    content_type: string;
    media_id?: string;
    thumbnail_url?: string;
  }>;
  template_id?: string;
  template_name?: string;
  sequence_id?: string;
  sequence_name?: string;
  sequence_subscription_id?: string;
  dialer_id?: string;
  dialer_saved_search_id?: string;
  source?: string;
  cost?: number;
  local_country_code?: string;
  remote_country_code?: string;
  recording_url?: string;
  error_message?: string;
  error_code?: string;
}

export interface ConversationContext {
  leadInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    customFields?: Record<string, unknown>;
  };
  previousMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  botType: 'appointment' | 'objection' | 'general';
  sessionData?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  tokens: number;
  finishReason: string;
  model: string;
}

export interface CloseWebhookSubscription {
  id: string;
  url: string;
  events: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CloseAPIResponse<T> {
  data?: T[];
  has_more?: boolean;
  cursor?: string;
}