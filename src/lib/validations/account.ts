import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  brokerName: z.string().max(100).nullable().optional(),
  accountType: z.enum(["DEMO", "LIVE", "PROP_CHALLENGE", "PROP_FUNDED"]),
  platform: z.enum(["MT4", "MT5", "TRADINGVIEW", "CTRADER", "DXTRADE", "OTHER"]),
  accountNumber: z.string().max(50).nullable().optional(),
  startingBalance: z.number().positive("Starting balance must be positive"),
  currency: z.string().min(1).max(10).default("USD"),
  isDefault: z.boolean().default(false),

  // Risk Rules
  maxRiskPerTrade: z.number().min(0.01).max(100).nullable().optional(),
  maxDailyDrawdown: z.number().min(0.01).max(100).nullable().optional(),
  maxWeeklyDrawdown: z.number().min(0.01).max(100).nullable().optional(),
  maxOverallDrawdown: z.number().min(0.01).max(100).nullable().optional(),
  maxTradesPerDay: z.number().int().positive().nullable().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
