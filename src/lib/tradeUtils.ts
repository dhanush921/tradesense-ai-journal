export interface Trade {
  id?: string;
  userId: string;
  title: string;
  date: string;
  time: string;
  market: string;
  broker: string;
  assetType: "Forex" | "Crypto" | "Stocks" | "Indices" | "Commodities";
  pair: string;
  direction: "Buy" | "Sell";
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskPct: number;
  lotSize: number;
  quantity: number;
  fees: number;
  commission: number;
  slippage: number;
  status: "Open" | "Closed" | "Break Even" | "Win" | "Loss" | "Partial";
  duration: number; // in minutes
  strategyUsed: string;
  setupName: string;
  timeframe: string;
  reasonEntry: string;
  reasonExit: string;
  mistakes: string;
  lessons: string;
  confidence: number; // 1 to 5
  emotionBefore: string;
  emotionAfter: string;
  marketCondition: "Trending" | "Range" | "Volatile" | "News";
  tags: string[];
  notes: string;
  tvUrl: string;
  screenshots: {
    beforeEntry?: string;
    duringTrade?: string;
    exit?: string;
    final?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function calculateTradeProfit(trade: Trade): number {
  if (trade.status === "Open") return 0;
  
  const diff = trade.direction === "Buy" 
    ? trade.exitPrice - trade.entryPrice 
    : trade.entryPrice - trade.exitPrice;
  
  const grossProfit = diff * trade.quantity;
  const totalCosts = (trade.fees || 0) + (trade.commission || 0) + (trade.slippage || 0);
  
  return grossProfit - totalCosts;
}

export interface TradingMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfit: number;
  currentEquity: number;
  largestWin: number;
  largestLoss: number;
  averageRR: number;
  averageHoldingTime: number; // in minutes
  currentStreak: number;
  bestStreak: number;
  worstStreak: number;
  dailyProfit: number;
  monthlyProfit: number;
}

export function calculateMetrics(trades: Trade[], initialEquity: number = 10000): TradingMetrics {
  const closedTrades = trades.filter(t => t.status !== "Open");
  
  const totalTrades = closedTrades.length;
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalProfit: 0,
      currentEquity: initialEquity,
      largestWin: 0,
      largestLoss: 0,
      averageRR: 0,
      averageHoldingTime: 0,
      currentStreak: 0,
      bestStreak: 0,
      worstStreak: 0,
      dailyProfit: 0,
      monthlyProfit: 0,
    };
  }

  let totalProfit = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossWins = 0;
  let grossLosses = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let totalRR = 0;
  let totalDuration = 0;

  // Streak tracking helper variables
  let currentStreak = 0;
  let bestStreak = 0;
  let worstStreak = 0;
  let tempStreak = 0;
  let tempLossStreak = 0;

  // Sort trades by date & time for streak & equity calculations
  const sortedTrades = [...closedTrades].sort((a, b) => {
    return new Date(`${a.date}T${a.time || "00:00"}`).getTime() - new Date(`${b.date}T${b.time || "00:00"}`).getTime();
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  let dailyProfit = 0;
  let monthlyProfit = 0;

  sortedTrades.forEach((trade) => {
    const profit = calculateTradeProfit(trade);
    totalProfit += profit;

    if (trade.date === todayStr) {
      dailyProfit += profit;
    }
    if (trade.date.startsWith(thisMonthStr)) {
      monthlyProfit += profit;
    }

    if (profit > 0) {
      winningTrades++;
      grossWins += profit;
      if (profit > largestWin) largestWin = profit;

      // Streaks
      if (tempStreak >= 0) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > bestStreak) bestStreak = tempStreak;
      currentStreak = tempStreak;
    } else if (profit < 0) {
      losingTrades++;
      grossLosses += Math.abs(profit);
      if (profit < largestLoss) largestLoss = profit; // largest loss will be more negative

      // Streaks
      if (tempStreak <= 0) {
        tempStreak--;
      } else {
        tempStreak = -1;
      }
      if (tempStreak < worstStreak) worstStreak = tempStreak;
      currentStreak = tempStreak;
    }

    // Risk-Reward (RR) calculation: (TP - Entry) / (Entry - SL)
    const risk = Math.abs(trade.entryPrice - trade.stopLoss);
    const reward = Math.abs(trade.takeProfit - trade.entryPrice);
    if (risk > 0) {
      totalRR += reward / risk;
    }

    totalDuration += trade.duration || 0;
  });

  const winRate = (winningTrades / totalTrades) * 100;
  const profitFactor = grossLosses === 0 ? grossWins : grossWins / grossLosses;
  const currentEquity = initialEquity + totalProfit;
  const averageRR = totalTrades === 0 ? 0 : totalRR / totalTrades;
  const averageHoldingTime = totalTrades === 0 ? 0 : totalDuration / totalTrades;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    totalProfit,
    currentEquity,
    largestWin,
    largestLoss,
    averageRR,
    averageHoldingTime,
    currentStreak,
    bestStreak,
    worstStreak: Math.abs(worstStreak), // return positive value representing number of consecutive losses
    dailyProfit,
    monthlyProfit,
  };
}
