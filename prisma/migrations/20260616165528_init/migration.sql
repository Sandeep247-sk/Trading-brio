-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TRADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeResult" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');

-- CreateEnum
CREATE TYPE "TradingSession" AS ENUM ('LONDON', 'NEW_YORK', 'ASIAN');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('BEFORE_ENTRY', 'ENTRY', 'EXIT', 'ANNOTATED');

-- CreateEnum
CREATE TYPE "Market" AS ENUM ('XAUUSD', 'FOREX', 'INDICES', 'CRYPTO');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEMO', 'LIVE', 'PROP_CHALLENGE', 'PROP_FUNDED');

-- CreateEnum
CREATE TYPE "TradingPlatform" AS ENUM ('MT4', 'MT5', 'TRADINGVIEW', 'CTRADER', 'DXTRADE', 'OTHER');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('PRE_TRADE', 'ENTRY', 'EXIT', 'RISK', 'SESSION', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "TradeGrade" AS ENUM ('A_PLUS', 'A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "DetectedBy" AS ENUM ('AI', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'ANALYZE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TRADER',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brokerName" TEXT,
    "accountType" "AccountType" NOT NULL DEFAULT 'LIVE',
    "platform" "TradingPlatform" NOT NULL DEFAULT 'OTHER',
    "accountNumber" TEXT,
    "startingBalance" DECIMAL(18,2) NOT NULL,
    "currentBalance" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxRiskPerTrade" DECIMAL(5,2),
    "maxDailyDrawdown" DECIMAL(5,2),
    "maxWeeklyDrawdown" DECIMAL(5,2),
    "maxOverallDrawdown" DECIMAL(5,2),
    "maxTradesPerDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "session" "TradingSession" NOT NULL,
    "direction" "Direction" NOT NULL,
    "entryPrice" DECIMAL(18,8) NOT NULL,
    "stopLoss" DECIMAL(18,8) NOT NULL,
    "takeProfit" DECIMAL(18,8) NOT NULL,
    "riskPercent" DECIMAL(5,2) NOT NULL,
    "result" "TradeResult",
    "rrAchieved" DECIMAL(8,2),
    "pnl" DECIMAL(18,2),
    "notes" TEXT,
    "strategyVersionId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_images" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_analyses" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "executionScore" INTEGER NOT NULL,
    "disciplineScore" INTEGER NOT NULL,
    "grade" "TradeGrade" NOT NULL,
    "checklist" JSONB NOT NULL,
    "mistakes" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "detectedViolations" JSONB NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_versions" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT,
    "preferredSessions" JSONB NOT NULL,
    "higherTimeframes" JSONB NOT NULL,
    "entryTimeframes" JSONB NOT NULL,
    "entryConditions" JSONB NOT NULL,
    "riskRules" JSONB NOT NULL,
    "managementRules" JSONB NOT NULL,
    "changelog" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_rules" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_change_logs" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_performance_history" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "profitFactor" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "averageRR" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adherenceScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "executionScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_performance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "violation_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_violations" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "plImpact" DECIMAL(18,2),
    "detectedBy" "DetectedBy" NOT NULL DEFAULT 'AI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "disciplineScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "complianceScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "consistencyScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behavior_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "trades_accountId_date_idx" ON "trades"("accountId", "date");

-- CreateIndex
CREATE INDEX "trades_accountId_session_idx" ON "trades"("accountId", "session");

-- CreateIndex
CREATE INDEX "trades_accountId_result_idx" ON "trades"("accountId", "result");

-- CreateIndex
CREATE INDEX "trades_strategyVersionId_idx" ON "trades"("strategyVersionId");

-- CreateIndex
CREATE INDEX "trades_date_idx" ON "trades"("date");

-- CreateIndex
CREATE INDEX "trade_images_tradeId_idx" ON "trade_images"("tradeId");

-- CreateIndex
CREATE INDEX "trade_analyses_tradeId_idx" ON "trade_analyses"("tradeId");

-- CreateIndex
CREATE INDEX "trade_analyses_createdAt_idx" ON "trade_analyses"("createdAt");

-- CreateIndex
CREATE INDEX "strategies_userId_idx" ON "strategies"("userId");

-- CreateIndex
CREATE INDEX "strategy_versions_strategyId_idx" ON "strategy_versions"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_versions_strategyId_version_key" ON "strategy_versions"("strategyId", "version");

-- CreateIndex
CREATE INDEX "strategy_rules_versionId_idx" ON "strategy_rules"("versionId");

-- CreateIndex
CREATE INDEX "strategy_change_logs_versionId_idx" ON "strategy_change_logs"("versionId");

-- CreateIndex
CREATE INDEX "strategy_performance_history_versionId_idx" ON "strategy_performance_history"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "violation_categories_name_key" ON "violation_categories"("name");

-- CreateIndex
CREATE INDEX "rule_violations_userId_createdAt_idx" ON "rule_violations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "rule_violations_tradeId_idx" ON "rule_violations"("tradeId");

-- CreateIndex
CREATE INDEX "rule_violations_categoryId_idx" ON "rule_violations"("categoryId");

-- CreateIndex
CREATE INDEX "behavior_scores_userId_periodType_idx" ON "behavior_scores"("userId", "periodType");

-- CreateIndex
CREATE UNIQUE INDEX "behavior_scores_userId_period_periodType_key" ON "behavior_scores"("userId", "period", "periodType");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_images" ADD CONSTRAINT "trade_images_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_analyses" ADD CONSTRAINT "trade_analyses_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_rules" ADD CONSTRAINT "strategy_rules_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_change_logs" ADD CONSTRAINT "strategy_change_logs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_performance_history" ADD CONSTRAINT "strategy_performance_history_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "violation_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_scores" ADD CONSTRAINT "behavior_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
