-- CreateTable
CREATE TABLE "public"."ConversationPattern" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "leadAgeType" TEXT NOT NULL,
    "leadAgeDays" INTEGER NOT NULL,
    "triggerPhrase" TEXT NOT NULL,
    "successfulResponse" TEXT NOT NULL,
    "leadReaction" TEXT NOT NULL,
    "effectiveness" TEXT NOT NULL,
    "conversationStage" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationInsight" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "effectiveness" DOUBLE PRECISION NOT NULL,
    "leadAgePreference" TEXT NOT NULL,
    "usageFrequency" INTEGER NOT NULL,
    "avgResponseTime" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationPattern_patternId_key" ON "public"."ConversationPattern"("patternId");

-- CreateIndex
CREATE INDEX "ConversationPattern_leadAgeType_effectiveness_idx" ON "public"."ConversationPattern"("leadAgeType", "effectiveness");

-- CreateIndex
CREATE INDEX "ConversationPattern_conversationStage_effectiveness_idx" ON "public"."ConversationPattern"("conversationStage", "effectiveness");

-- CreateIndex
CREATE INDEX "ConversationPattern_outcome_idx" ON "public"."ConversationPattern"("outcome");

-- CreateIndex
CREATE INDEX "ConversationInsight_effectiveness_idx" ON "public"."ConversationInsight"("effectiveness");

-- CreateIndex
CREATE INDEX "ConversationInsight_leadAgePreference_idx" ON "public"."ConversationInsight"("leadAgePreference");
