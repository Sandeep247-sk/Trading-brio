import { z } from "zod";

export const createStrategySchema = z.object({
  name: z.string().min(1, "Strategy name is required").max(200),
  market: z.enum(["XAUUSD", "FOREX", "INDICES", "CRYPTO"]),
  preferredSessions: z.array(z.enum(["LONDON", "NEW_YORK", "ASIAN"])),
  higherTimeframes: z.array(z.string()),
  entryTimeframes: z.array(z.string()),
  entryConditions: z.array(z.string()),
  riskRules: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      isRequired: z.boolean().default(true),
    })
  ),
  managementRules: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      isRequired: z.boolean().default(true),
    })
  ),
  rules: z.array(
    z.object({
      category: z.enum(["PRE_TRADE", "ENTRY", "EXIT", "RISK", "SESSION", "MANAGEMENT"]),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      isRequired: z.boolean().default(true),
      order: z.number().int().min(0).default(0),
    })
  ).optional(),
});

export const updateStrategySchema = createStrategySchema.partial();

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
