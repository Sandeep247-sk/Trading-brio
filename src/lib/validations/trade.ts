import { z } from "zod";

export const createTradeSchema = z.object({
  accountId: z.string().uuid().optional(),
  pair: z.string().min(1, "Trading pair is required").max(20),
  date: z.string().datetime().or(z.date()),
  session: z.enum(["LONDON", "NEW_YORK", "ASIAN"]),
  direction: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().positive("Entry price must be positive"),
  stopLoss: z.number().positive("Stop loss must be positive"),
  takeProfit: z.number().positive("Take profit must be positive"),
  riskPercent: z.number().min(0.01).max(100, "Risk cannot exceed 100%"),
  result: z.enum(["WIN", "LOSS", "BREAKEVEN"]).nullable().optional(),
  rrAchieved: z.number().nullable().optional(),
  pnl: z.number().nullable().optional(),
  notes: z.string().max(5000).optional(),
  strategyVersionId: z.string().uuid().nullable().optional(),
});

export const updateTradeSchema = createTradeSchema.partial();

export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;
