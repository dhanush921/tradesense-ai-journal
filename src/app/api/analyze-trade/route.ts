import { NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { tradeId, trade } = await request.json();
    if (!tradeId || !trade) {
      return NextResponse.json({ error: "Missing trade info" }, { status: 400 });
    }

    let report = null;

    // Check if OpenAI Key is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const prompt = `
          You are an expert trading coach. Analyze the following trade details and return a structured JSON report.
          Trade Details:
          - Title: ${trade.title}
          - Market: ${trade.market}
          - Direction: ${trade.direction}
          - Entry Price: ${trade.entryPrice}
          - Exit Price: ${trade.exitPrice}
          - Stop Loss: ${trade.stopLoss}
          - Take Profit: ${trade.takeProfit}
          - Risk %: ${trade.riskPct}
          - Status: ${trade.status}
          - Timeframe: ${trade.timeframe}
          - Reason for Entry: ${trade.reasonEntry}
          - Reason for Exit: ${trade.reasonExit}
          - Mistakes: ${trade.mistakes}
          - Lessons: ${trade.lessons}
          - Emotion Before: ${trade.emotionBefore}
          - Emotion After: ${trade.emotionAfter}
          - Market Condition: ${trade.marketCondition}

          Respond ONLY with a JSON object in this exact structure:
          {
            "summary": "Short 2-sentence summary of the trade execution.",
            "riskScore": 0-100 score on risk management efficiency,
            "entryQuality": "Poor" | "Average" | "Good" | "Excellent",
            "exitQuality": "Poor" | "Average" | "Good" | "Excellent",
            "rewardQuality": "Poor" | "Average" | "Good" | "Excellent",
            "psychologyAnalysis": "Brief assessment of the trader's emotional state before and after.",
            "mistakes": "Core mistake identified or 'None'.",
            "repeatedMistakes": "Is this mistake common for this setup or 'None'.",
            "patternRecognition": "Observed patterns in execution.",
            "confidenceScore": 1-5 rating,
            "rating": 1.0-5.0 rating of the overall trade quality,
            "strengths": ["Strength 1", "Strength 2"],
            "weaknesses": ["Weakness 1", "Weakness 2"],
            "improvementPlan": ["Actionable step 1", "Actionable step 2"],
            "overallScore": 0-100 total performance score
          }
        `;

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        const content = response.choices[0].message.content;
        if (content) {
          report = JSON.parse(content);
        }
      } catch (openAiError) {
        console.error("OpenAI call failed, using rule-based generator:", openAiError);
      }
    }

    // Fallback: Rule-based high-quality AI analysis (if API key is missing or calls fail)
    if (!report) {
      const risk = Math.abs(trade.entryPrice - trade.stopLoss);
      const reward = Math.abs(trade.takeProfit - trade.entryPrice);
      const rrRatio = risk > 0 ? reward / risk : 1;

      // Deduce scores based on rule logic
      let riskScore = 90;
      if (trade.riskPct > 2) riskScore -= 20;
      if (!trade.stopLoss) riskScore -= 50;

      let entryQuality: "Poor" | "Average" | "Good" | "Excellent" = "Good";
      if (trade.emotionBefore.toLowerCase().includes("fomo")) {
        entryQuality = "Poor";
      } else if (trade.confidence >= 4) {
        entryQuality = "Excellent";
      }

      let exitQuality: "Poor" | "Average" | "Good" | "Excellent" = "Good";
      if (trade.status === "Loss" && Math.abs(trade.exitPrice - trade.stopLoss) > Math.abs(trade.entryPrice - trade.stopLoss) * 0.1) {
        exitQuality = "Average"; // exited late
      } else if (trade.status === "Win" && trade.exitPrice >= trade.takeProfit) {
        exitQuality = "Excellent";
      }

      let overallScore = 75;
      if (trade.status === "Win") overallScore += 15;
      if (trade.status === "Loss") overallScore -= 10;
      if (riskScore < 70) overallScore -= 10;

      report = {
        summary: `Standard ${trade.direction} execution on ${trade.market} under ${trade.marketCondition} conditions.`,
        riskScore,
        entryQuality,
        exitQuality,
        rewardQuality: rrRatio >= 2 ? "Excellent" : rrRatio >= 1.5 ? "Good" : "Average",
        psychologyAnalysis: `Felt ${trade.emotionBefore} going in and ${trade.emotionAfter} exiting. Risk containment was ${riskScore >= 80 ? "excellent" : "deficient"}.`,
        mistakes: trade.mistakes || "None identified.",
        repeatedMistakes: trade.mistakes ? "Needs observation for repetition." : "None.",
        patternRecognition: `Trading the ${trade.timeframe} timeframe in ${trade.marketCondition} environment.`,
        confidenceScore: trade.confidence,
        rating: overallScore / 20,
        strengths: [
          `Clear direction choice: ${trade.direction}`,
          trade.stopLoss ? "Used a protective stop loss" : "No stop loss registered",
        ],
        weaknesses: [
          trade.mistakes ? `Registered mistake: ${trade.mistakes}` : "No specific mistake logged",
          rrRatio < 1.5 ? "Risk-to-reward ratio is sub-optimal" : "None",
        ],
        improvementPlan: [
          "Maintain strict stop loss placement on all entries.",
          trade.mistakes ? "Review the entry trigger to eliminate future emotional rushes." : "Maintain current discipline guidelines.",
        ],
        overallScore,
      };
    }

    // Save report in Firestore under "aiReports" mapping 1-to-1 with tradeId
    await setDoc(doc(db, "aiReports", tradeId), {
      ...report,
      tradeId,
      userId: trade.userId,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("API Analyze Trade Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
