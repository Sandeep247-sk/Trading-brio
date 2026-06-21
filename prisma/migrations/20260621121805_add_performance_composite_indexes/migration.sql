-- CreateIndex
CREATE INDEX "trades_accountId_deletedAt_pair_result_idx" ON "trades"("accountId", "deletedAt", "pair", "result");

-- CreateIndex
CREATE INDEX "trades_accountId_deletedAt_session_idx" ON "trades"("accountId", "deletedAt", "session");

-- CreateIndex
CREATE INDEX "trades_accountId_deletedAt_pnl_idx" ON "trades"("accountId", "deletedAt", "pnl");
