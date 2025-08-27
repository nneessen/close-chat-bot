-- CreateEnum
CREATE TYPE "public"."BotType" AS ENUM ('APPOINTMENT', 'OBJECTION_HANDLER', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('active', 'completed', 'failed', 'timeout');

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "closeId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "botType" "public"."BotType" NOT NULL,
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'active',
    "context" JSONB,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "public"."MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "closeActivityId" TEXT,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "calendlyEventId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "eventType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromptTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "botType" "public"."BotType" NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "performance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_closeId_key" ON "public"."Lead"("closeId");

-- CreateIndex
CREATE INDEX "Lead_closeId_idx" ON "public"."Lead"("closeId");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "public"."Lead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_sessionId_key" ON "public"."Conversation"("sessionId");

-- CreateIndex
CREATE INDEX "Conversation_leadId_idx" ON "public"."Conversation"("leadId");

-- CreateIndex
CREATE INDEX "Conversation_sessionId_idx" ON "public"."Conversation"("sessionId");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "public"."Conversation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Message_closeActivityId_key" ON "public"."Message"("closeActivityId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "public"."Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_closeActivityId_idx" ON "public"."Message"("closeActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_calendlyEventId_key" ON "public"."Appointment"("calendlyEventId");

-- CreateIndex
CREATE INDEX "Appointment_leadId_idx" ON "public"."Appointment"("leadId");

-- CreateIndex
CREATE INDEX "Appointment_calendlyEventId_idx" ON "public"."Appointment"("calendlyEventId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "public"."Appointment"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_source_processed_idx" ON "public"."WebhookEvent"("source", "processed");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "public"."WebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_name_key" ON "public"."PromptTemplate"("name");

-- CreateIndex
CREATE INDEX "PromptTemplate_botType_isActive_idx" ON "public"."PromptTemplate"("botType", "isActive");

-- CreateIndex
CREATE INDEX "PromptTemplate_name_idx" ON "public"."PromptTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "public"."SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "public"."SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
