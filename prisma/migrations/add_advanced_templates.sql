-- Advanced Template System Migration

-- Enhanced ResponseTemplate table
ALTER TABLE "ResponseTemplate" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "ResponseTemplate" ADD COLUMN IF NOT EXISTS "subcategory" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "ResponseTemplate" ADD COLUMN IF NOT EXISTS "variations" JSONB DEFAULT '[]';
ALTER TABLE "ResponseTemplate" ADD COLUMN IF NOT EXISTS "conditions" JSONB DEFAULT '{}';
ALTER TABLE "ResponseTemplate" ADD COLUMN IF NOT EXISTS "personalizations" JSONB DEFAULT '{}';

-- Update performance column to be more detailed
UPDATE "ResponseTemplate" SET "performance" = jsonb_build_object(
  'timesUsed', 0,
  'responseRate', 0.0,
  'appointmentRate', 0.0,
  'avgResponseTime', 0.0,
  'lastUpdated', NOW()
) WHERE "performance" IS NULL;

-- Template Usage Tracking
CREATE TABLE IF NOT EXISTS "TemplateUsage" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "leadId" TEXT,
  "conversationId" TEXT,
  "leadAge" TEXT,
  "conversationStage" TEXT,
  "state" TEXT,
  "timeOfDay" TEXT,
  "messageCount" INTEGER,
  "responseReceived" BOOLEAN DEFAULT false,
  "responseTime" INTEGER, -- minutes until lead responded
  "appointmentBooked" BOOLEAN DEFAULT false,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TemplateUsage_pkey" PRIMARY KEY ("id")
);

-- A/B Testing
CREATE TABLE IF NOT EXISTS "ABTest" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "variationA" TEXT NOT NULL,
  "variationB" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "winnerVariation" TEXT,
  "confidenceLevel" DECIMAL,

  CONSTRAINT "ABTest_pkey" PRIMARY KEY ("id")
);

-- Template Performance Analytics
CREATE TABLE IF NOT EXISTS "TemplateAnalytics" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "timesUsed" INTEGER DEFAULT 0,
  "responses" INTEGER DEFAULT 0,
  "appointments" INTEGER DEFAULT 0,
  "avgResponseTime" DECIMAL,
  "leadAgeBreakdown" JSONB DEFAULT '{}',
  "stateBreakdown" JSONB DEFAULT '{}',

  CONSTRAINT "TemplateAnalytics_pkey" PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "ResponseTemplate_category_subcategory_idx" ON "ResponseTemplate"("category", "subcategory");
CREATE INDEX IF NOT EXISTS "TemplateUsage_templateId_idx" ON "TemplateUsage"("templateId");
CREATE INDEX IF NOT EXISTS "TemplateUsage_timestamp_idx" ON "TemplateUsage"("timestamp");
CREATE INDEX IF NOT EXISTS "ABTest_templateId_status_idx" ON "ABTest"("templateId", "status");
CREATE INDEX IF NOT EXISTS "TemplateAnalytics_templateId_date_idx" ON "TemplateAnalytics"("templateId", "date");

-- Sample template data with variations
INSERT INTO "ResponseTemplate" ("id", "name", "botType", "category", "subcategory", "content", "variations", "conditions", "personalizations", "isActive", "performance") VALUES

-- Opening Messages
('opening_intro_01', 'Initial Introduction', 'GENERAL', 'opening', 'introduction', 
 'Hi {{firstName}}! I''m Nick, and I help homeowners in {{state}} with mortgage protection. I''d love to chat about your options.',
 '["Hi {{firstName}}! I''m Nick Neessen, and I specialize in helping {{state}} homeowners protect their mortgage. Mind if I ask a couple quick questions?", "{{firstName}}, I''m Nick - I help families in {{state}} secure their mortgage with life insurance. Do you have a few minutes to chat?", "Hi {{firstName}}! Nick here. I work with homeowners in {{state}} on mortgage protection. Can I ask what prompted you to look into this?"]',
 '{"leadAge": "fresh", "timeOfDay": ["morning", "afternoon"]}',
 '{"byState": {"CA": "Hi {{firstName}}! I''m Nick, licensed in California to help homeowners with mortgage protection.", "TX": "Hi {{firstName}}! I''m Nick, your Texas-licensed mortgage protection specialist."}}',
 true,
 '{"timesUsed": 0, "responseRate": 0.75, "appointmentRate": 0.25, "avgResponseTime": 15.5, "lastUpdated": "2025-01-28T00:00:00Z"}'
),

-- Permission Requests  
('permission_01', 'Permission to Ask Questions', 'GENERAL', 'permission', 'initial_permission',
 'Do you mind if I ask you a couple questions before we hop on a call?',
 '["Can I ask you a few quick questions to make sure I give you the right information?", "Mind if I ask a couple questions so I can help you properly?", "Would it be okay if I asked 2-3 quick questions to understand your situation better?"]',
 '{"conversationStage": ["opening"]}',
 '{}',
 true,
 '{"timesUsed": 0, "responseRate": 0.80, "appointmentRate": 0.30, "avgResponseTime": 12.3, "lastUpdated": "2025-01-28T00:00:00Z"}'
),

-- Price Objections
('objection_price_01', 'Price Too High', 'OBJECTION_HANDLER', 'objection', 'price',
 'I understand, {{firstName}}. Many homeowners think that initially. Can I ask - what do you think mortgage protection costs per month?',
 '["I hear that a lot, {{firstName}}. Most people are surprised when they see real numbers. What would you guess it costs monthly?", "{{firstName}}, I get that concern. Before we talk cost, can I ask what you think your family would need if something happened to you?", "That''s totally fair, {{firstName}}. What if I told you it might cost less than your monthly streaming services?"]',
 '{"leadAge": "any", "previousMessages": ["expensive", "cost", "afford", "money"]}',
 '{"byAge": {"young": "{{firstName}}, at your age, you actually qualify for the best rates available.", "mature": "{{firstName}}, even though rates increase with age, mortgage protection is still very affordable."}}',
 true,
 '{"timesUsed": 0, "responseRate": 0.65, "appointmentRate": 0.35, "avgResponseTime": 18.2, "lastUpdated": "2025-01-28T00:00:00Z"}'
),

-- Time Objections
('objection_time_01', 'Too Busy for Call', 'OBJECTION_HANDLER', 'objection', 'time',
 'I totally get that, {{firstName}} - everyone''s schedule is crazy! That''s why I keep these super short. I''m talking 10-15 minutes max. What time of day usually works best for you?',
 '["{{firstName}}, I completely understand. What if we did just 10 minutes? I have early morning or evening slots if that helps.", "I hear you, {{firstName}}. How about this - I have 10-minute slots available. Would morning or evening work better?", "{{firstName}}, totally fair. I can do a quick 10-minute call at your convenience. When are you typically free?"]',
 '{"previousMessages": ["busy", "time", "schedule"]}',
 '{"byMortgageAmount": {"high": "{{firstName}}, with a mortgage like yours, 10 minutes could save your family hundreds of thousands."}}',
 true,
 '{"timesUsed": 0, "responseRate": 0.70, "appointmentRate": 0.40, "avgResponseTime": 14.7, "lastUpdated": "2025-01-28T00:00:00Z"}'
),

-- Appointment Booking
('appointment_schedule_01', 'Schedule Request', 'APPOINTMENT', 'appointment', 'scheduling',
 'Perfect! I have some time available {{timeOfDay}} - would that work for you?',
 '["Great! I have {{timeOfDay}} slots open. What works better for your schedule?", "Excellent! I can do {{timeOfDay}} or would a different time be better?", "Perfect timing! I have {{timeOfDay}} availability. Does that work?"]',
 '{"conversationStage": ["appointment_booking"]}',
 '{}',
 true,
 '{"timesUsed": 0, "responseRate": 0.85, "appointmentRate": 0.65, "avgResponseTime": 8.5, "lastUpdated": "2025-01-28T00:00:00Z"}'
)

ON CONFLICT ("id") DO NOTHING;