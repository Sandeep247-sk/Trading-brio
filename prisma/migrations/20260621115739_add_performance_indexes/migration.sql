-- CreateIndex
CREATE INDEX "accounts_userId_isDefault_idx" ON "accounts"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "trades_accountId_deletedAt_idx" ON "trades"("accountId", "deletedAt");

-- CreateIndex
CREATE INDEX "trades_accountId_deletedAt_result_idx" ON "trades"("accountId", "deletedAt", "result");

-- CreateIndex
CREATE INDEX "trades_accountId_deletedAt_date_idx" ON "trades"("accountId", "deletedAt", "date");
