-- DropIndex
DROP INDEX "strategies_userId_idx";

-- DropIndex
DROP INDEX "trades_accountId_date_idx";

-- DropIndex
DROP INDEX "trades_accountId_deletedAt_idx";

-- DropIndex
DROP INDEX "trades_accountId_idx";

-- DropIndex
DROP INDEX "trades_accountId_pair_idx";

-- DropIndex
DROP INDEX "trades_accountId_result_idx";

-- DropIndex
DROP INDEX "trades_accountId_session_idx";

-- CreateIndex
CREATE INDEX "strategies_userId_deletedAt_idx" ON "strategies"("userId", "deletedAt");
