import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prisma, Severity, DetectedBy, TradeGrade } from "@prisma/client";
import fs from "fs";
import path from "path";

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export class AIComplianceService {
  /**
   * Runs AI analysis on a trade against its account risk limits and strategy rules.
   */
  static async analyzeTrade(userId: string, tradeId: string): Promise<any> {
    console.log("GEMINI KEY EXISTS:", !!process.env.GEMINI_API_KEY);
    if (!genAI) {
      console.warn("GEMINI_API_KEY is not configured. Skipping trade analysis.");
      return null;
    }

    const startTime = Date.now();

    // 1. Fetch trade with full relations
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        images: true,
        account: true,
        strategyVersion: {
          include: {
            strategy: true,
            rules: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!trade) {
      throw new Error(`Trade ${tradeId} not found.`);
    }

    // Ensure account belongs to user
    if (trade.account.userId !== userId) {
      throw new Error("Unauthorized trade access.");
    }

    // 2. Load screenshots if present
    const imageParts: any[] = [];
    const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_ROOT || "./uploads");

    for (const img of trade.images) {
      const safeKey = path.normalize(img.key).replace(/^(\.\.(\/|\\|$))+/, "");
      const filePath = path.join(uploadRoot, safeKey);
      try {
        if (fs.existsSync(filePath)) {
          const base64Data = fs.readFileSync(filePath).toString("base64");
          imageParts.push({
            inlineData: {
              data: base64Data,
              mimeType: img.mimeType || "image/webp",
            },
          });
        }
      } catch (err) {
        console.error(`AI Compliance: Failed to load screenshot file ${filePath}:`, err);
      }
    }

    // 3. Construct strategies & rules description
    let strategyContext = "No specific strategy selected for this trade.";
    let checklistContext = "No strategy checklist rules configured.";

    if (trade.strategyVersion) {
      const sv = trade.strategyVersion;
      const rules = sv.rules;

      strategyContext = `
Strategy: ${sv.strategy.name}
Description: ${sv.description || "N/A"}
Preferred Sessions: ${JSON.stringify(sv.preferredSessions)}
Higher Timeframes: ${JSON.stringify(sv.higherTimeframes)}
Entry Timeframes: ${JSON.stringify(sv.entryTimeframes)}
`;

      const ruleList = rules.map((r, idx) => `- [Rule ${idx + 1}] Category: ${r.category}, Name: ${r.name}, Description: ${r.description || "N/A"}, Required: ${r.isRequired}`);
      checklistContext = `
Strategy Checklist Rules:
${ruleList.join("\n")}
`;
    }

    // 4. Construct risk limits description
    const account = trade.account;
    const riskContext = `
Account Sizing & Limits:
- Currency: ${account.currency}
- Max Risk Per Trade (%): ${account.maxRiskPerTrade ? account.maxRiskPerTrade.toString() + "%" : "No Limit"}
- Max Daily Drawdown (%): ${account.maxDailyDrawdown ? account.maxDailyDrawdown.toString() + "%" : "No Limit"}
- Max Weekly Drawdown (%): ${account.maxWeeklyDrawdown ? account.maxWeeklyDrawdown.toString() + "%" : "No Limit"}
- Max Overall Drawdown (%): ${account.maxOverallDrawdown ? account.maxOverallDrawdown.toString() + "%" : "No Limit"}
`;

    // 5. Construct trade context description
    const tradeContext = `
Trade Details to Evaluate:
- Asset/Pair: ${trade.pair}
- Date/Time: ${trade.date.toISOString()}
- Session Taken: ${trade.session}
- Direction: ${trade.direction}
- Entry Price: ${trade.entryPrice.toString()}
- Stop Loss: ${trade.stopLoss.toString()}
- Take Profit: ${trade.takeProfit.toString()}
- Risk Percent: ${trade.riskPercent.toString()}%
- Result: ${trade.result || "OPEN"}
- P&L: ${trade.pnl ? trade.pnl.toString() : "0.00"}
- Trader Notes: ${trade.notes || "None provided"}
`;

    // 6. Define Prompt instructions
    const systemInstruction = `
You are an expert quantitative trading risk officer and behavioral coach.
Your job is to analyze the trade details and attached chart screenshots (if any) against the trader's strategy checklist and account risk limits.
Evaluate compliance, spot mistakes, and detect rule violations.

You MUST respond in raw JSON format matching this EXACT schema:
{
  "matchScore": 85, // 0-100 (adherence to strategy setup & conditions)
  "executionScore": 90, // 0-100 (precision of entry/exit points, slippage)
  "disciplineScore": 80, // 0-100 (adherence to checklist and risk limits)
  "grade": "A", // Must be one of: "A_PLUS", "A", "B", "C", "D"
  "checklist": [
    // Verify each rule from "Strategy Checklist Rules" above.
    { "rule": "Rule Name", "detected": true } // detected=true if the notes/screenshot confirm compliance
  ],
  "mistakes": [
    // Array of strings indicating mistakes (e.g. "Traded outside session hours", "Oversized risk", "Chasing/FOMO")
  ],
  "suggestions": [
    // Array of actionable suggestions for improvement
  ],
  "detectedViolations": [
    // List any clear rule violations
    {
      "category": "Risk Limit Violation", // Choose from: "Risk Limit Violation", "Session Rule Violation", "Prerequisite Checklist Violation", "Discipline Violation", "FOMO / Chasing Entry", "Slippage / Bad Execution", "Other Violation"
      "description": "Detailed explanation of what rule was broken.",
      "severity": "HIGH", // "LOW", "MEDIUM", "HIGH", "CRITICAL"
      "plImpact": -150.00 // Optional estimated cost/loss caused by this specific violation (negative number), null if not applicable
    }
  ]
}

Guidelines:
- If trade's riskPercent (${trade.riskPercent.toString()}%) exceeds account maxRiskPerTrade, flag a "Risk Limit Violation" (Severity: HIGH).
- If trade's Session (${trade.session}) is NOT in strategy preferred sessions, flag a "Session Rule Violation" (Severity: MEDIUM).
- Review Trader Notes and Screenshots carefully. Check if checklist rules are followed. If a required checklist rule was missed, flag a "Prerequisite Checklist Violation" (Severity: MEDIUM).
- Be objective, strict, but encouraging. Your scores must reflect the number and severity of violations.
`;

    const prompt = `
=== CONTEXT ===
${strategyContext}
${checklistContext}
${riskContext}
${tradeContext}

=== EVALUATION REQUEST ===
Please evaluate this trade. Return the analysis JSON.
`;

    try {
      let result;
      let modelName = "gemini-2.5-flash";
      const contents: any[] = [...imageParts, prompt, systemInstruction];

      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        result = await model.generateContent(contents);
      } catch (firstErr: any) {
        console.warn(`Gemini 2.5 Flash failed, falling back to 1.5 Flash. Error:`, firstErr.message || firstErr);
        modelName = "gemini-1.5-flash";
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
            },
          });
          result = await model.generateContent(contents);
        } catch (secondErr: any) {
          console.error("Gemini 1.5 Flash also failed:", secondErr);
          throw secondErr; // Re-throw if fallback also fails
        }
      }

      const text = result.response.text();

      // Parse AI response
      const parsedAnalysis = JSON.parse(text);

      const processingTimeMs = Date.now() - startTime;
      console.log(`AI Compliance: Successfully analyzed trade ${tradeId} using ${modelName} in ${processingTimeMs}ms`);

      // 7. Write results in transactional database update
      return await prisma.$transaction(async (tx) => {
        // Delete any existing analysis and violations for this trade (to prevent duplicates on re-run)
        await tx.tradeAnalysis.deleteMany({ where: { tradeId } });
        await tx.ruleViolation.deleteMany({ where: { tradeId } });

        // Save AI Trade Analysis
        const analysis = await tx.tradeAnalysis.create({
          data: {
            tradeId,
            matchScore: parsedAnalysis.matchScore || 0,
            executionScore: parsedAnalysis.executionScore || 0,
            disciplineScore: parsedAnalysis.disciplineScore || 0,
            grade: (parsedAnalysis.grade as TradeGrade) || TradeGrade.B,
            checklist: parsedAnalysis.checklist || [],
            mistakes: parsedAnalysis.mistakes || [],
            suggestions: parsedAnalysis.suggestions || [],
            detectedViolations: parsedAnalysis.detectedViolations || [],
            rawResponse: parsedAnalysis,
            modelUsed: modelName,
            processingTimeMs,
          },
        });

        // Save Rule Violations if detected
        if (Array.isArray(parsedAnalysis.detectedViolations)) {
          for (const dv of parsedAnalysis.detectedViolations) {
            // Find or create ViolationCategory
            let category = await tx.violationCategory.findUnique({
              where: { name: dv.category },
            });

            if (!category) {
              category = await tx.violationCategory.create({
                data: {
                  name: dv.category,
                  description: `Automatically created for ${dv.category}`,
                  severity: (dv.severity as Severity) || Severity.MEDIUM,
                },
              });
            }

            // Create Rule Violation
            await tx.ruleViolation.create({
              data: {
                tradeId,
                userId,
                categoryId: category.id,
                description: dv.description,
                plImpact: dv.plImpact !== null && dv.plImpact !== undefined ? new Prisma.Decimal(dv.plImpact) : null,
                detectedBy: DetectedBy.AI,
              },
            });
          }
        }

        return analysis;
      });
    } catch (error: any) {
      console.error("AI Compliance: Error during analysis:", error);
      throw error;
    }
  }
}
