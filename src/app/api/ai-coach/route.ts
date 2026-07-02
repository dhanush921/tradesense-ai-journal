import { NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateMetrics } from "@/lib/tradeUtils";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { userId, messages, quickQuestion } = await request.json();
    if (!userId || !messages) {
      return NextResponse.json({ error: "Missing required details" }, { status: 400 });
    }

    // Fetch user trades to provide contextual advice
    const q = query(collection(db, "trades"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const trades: any[] = [];
    querySnapshot.forEach((doc) => {
      trades.push(doc.data());
    });

    const metrics = calculateMetrics(trades);
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    let aiResponse = "";

    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const systemMessage = `
          You are TradeSense AI Coach, a world-class professional trading performance coach.
          You have access to the trader's metrics:
          - Total trades logged: ${metrics.totalTrades}
          - Win Rate: ${metrics.winRate.toFixed(1)}%
          - Profit Factor: ${metrics.profitFactor === Infinity ? "N/A" : metrics.profitFactor.toFixed(2)}
          - Current Realized profit: $${metrics.totalProfit.toFixed(2)}
          - Streaks: Best win streak +${metrics.bestStreak}, Worst loss streak -${metrics.worstStreak}
          - Average Risk Reward: 1:${metrics.averageRR.toFixed(2)}

          Analyze their metrics, look at their questions, and give highly actionable, professional, and empathetic trading advice.
          Reference their actual metrics to show you understand their profile. Limit your responses to 3-4 paragraphs max.
        `;

        const chatResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemMessage },
            ...messages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.7,
        });

        aiResponse = chatResponse.choices[0].message.content || "";
      } catch (e) {
        console.error("OpenAI call in coach failed, using rule-based coaching response:", e);
      }
    }

    // Fallback contextual rule-based AI Coach
    if (!aiResponse) {
      const queryLower = lastUserMessage.toLowerCase();
      
      if (queryLower.includes("why am i losing") || queryLower.includes("find mistakes")) {
        if (metrics.winRate < 50) {
          aiResponse = `Looking at your data, your win rate is currently sitting at ${metrics.winRate.toFixed(1)}%. The primary issue could be entry timing or trade location. Make sure you are waiting for a clear liquidity sweep or value zone pullbacks instead of chasing green/red candles. Also check if you are logging any FOMO emotions.`;
        } else if (metrics.averageRR < 1.5) {
          aiResponse = `Your win rate is good (${metrics.winRate.toFixed(1)}%), but your average Risk-to-Reward ratio is sub-optimal at 1:${metrics.averageRR.toFixed(1)}. This means your losses are eating up your wins. Focus on cutting losses quickly at your stop loss and letting your winning trades run to 2R+ targets.`;
        } else {
          aiResponse = "Your overall metrics are actually solid! You are profitable. Your losses are likely normal variance in your trading model. Continue to manage your risk tightly and avoid changing your strategies mid-drawdown.";
        }
      } else if (queryLower.includes("analyze today") || queryLower.includes("analyze this week")) {
        aiResponse = `You have completed a total of ${metrics.totalTrades} trades historically. To keep your coaching updated, continue to log every entry and exit. Looking at your recent entries, focus on matching your execution with your defined strategies (e.g. Order Blocks, Retests) and record any emotional deviations.`;
      } else if (queryLower.includes("psychology") || queryLower.includes("emotion")) {
        aiResponse = "Trading psychology is 80% of execution. I recommend checking your Psychology logs. If you log FOMO or Revenge trading frequently, write a strict rule: Limit yourself to maximum 2 trades per day. This forces you to select only the highest probability setups.";
      } else if (queryLower.includes("risk")) {
        aiResponse = `Your current default risk goal is set. With an average R:R of 1:${metrics.averageRR.toFixed(1)}, you need a win rate of at least ${(100 / (1 + metrics.averageRR)).toFixed(0)}% to break even. Try not to exceed 1-2% risk per trade on your account equity to prevent devastating drawdowns.`;
      } else {
        aiResponse = `Hello! I am your TradeSense AI Coach. Analyzing your account, you have logged ${metrics.totalTrades} trades with a win rate of ${metrics.winRate.toFixed(0)}% and a net profit of $${metrics.totalProfit.toFixed(0)}. How can I help you improve your execution, risk control, or trading psychology today?`;
      }
    }

    return NextResponse.json({ reply: aiResponse });
  } catch (error: any) {
    console.error("AI Coach API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
