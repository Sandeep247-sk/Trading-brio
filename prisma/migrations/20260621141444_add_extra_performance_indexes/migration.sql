-- CreateIndex
CREATE INDEX "trades_accountId_idx" ON "trades"("accountId");

-- CreateIndex
CREATE INDEX "trades_accountId_pair_idx" ON "trades"("accountId", "pair");
