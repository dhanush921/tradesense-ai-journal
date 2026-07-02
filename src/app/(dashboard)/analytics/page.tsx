"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, calculateTradeProfit } from "@/lib/tradeUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { BarChart3, TrendingUp, Calendar, ShieldAlert, PieChart as PieIcon, Hourglass, Layers } from "lucide-react";

export default function Analytics() {
  const { user, userSettings } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const initialEquity = userSettings?.brokerSettings?.defaultEquity || 10000;

  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "trades"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedTrades: Trade[] = [];
        querySnapshot.forEach((doc) => {
          fetchedTrades.push({ id: doc.id, ...doc.data() } as Trade);
        });
        setTrades(fetchedTrades);
      } catch (error) {
        console.error("Error fetching trades:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, [user]);

  const closedTrades = trades.filter((t) => t.status !== "Open");

  // Calculations
  // 1. Equity & Drawdown Curve
  const equityData: any[] = [];
  let currentEquity = initialEquity;
  let peakEquity = initialEquity;

  // Sort trades by date & time
  const sortedTrades = [...closedTrades].sort((a, b) => {
    return new Date(`${a.date}T${a.time || "00:00"}`).getTime() - new Date(`${b.date}T${b.time || "00:00"}`).getTime();
  });

  equityData.push({ name: "Start", equity: initialEquity, drawdown: 0 });

  sortedTrades.forEach((t) => {
    const profit = calculateTradeProfit(t);
    currentEquity += profit;
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const drawdownPct = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
    equityData.push({
      name: t.date.slice(5),
      equity: currentEquity,
      drawdown: -drawdownPct, // negative value for graphical mapping
    });
  });

  // 2. Win / Loss distribution
  const wins = closedTrades.filter((t) => calculateTradeProfit(t) > 0).length;
  const losses = closedTrades.filter((t) => calculateTradeProfit(t) < 0).length;
  const winLossData = [
    { name: "Wins", value: wins, color: "#10b981" },
    { name: "Losses", value: losses, color: "#ef4444" },
  ];

  // 3. Profit by Strategy
  const strategyMap: Record<string, number> = {};
  closedTrades.forEach((t) => {
    const strategy = t.strategyUsed || "Unknown";
    strategyMap[strategy] = (strategyMap[strategy] || 0) + calculateTradeProfit(t);
  });
  const strategyData = Object.entries(strategyMap).map(([name, profit]) => ({ name, profit }));

  // 4. Profit by Timeframe
  const tfMap: Record<string, number> = {};
  closedTrades.forEach((t) => {
    const tf = t.timeframe || "15M";
    tfMap[tf] = (tfMap[tf] || 0) + calculateTradeProfit(t);
  });
  const timeframeData = Object.entries(tfMap).map(([name, profit]) => ({ name, profit }));

  // 5. Profit by Weekday
  const weekdayMap: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
  };
  closedTrades.forEach((t) => {
    const day = new Date(t.date).toLocaleDateString("en-US", { weekday: "long" });
    if (day in weekdayMap) {
      weekdayMap[day] += calculateTradeProfit(t);
    }
  });
  const weekdayData = Object.entries(weekdayMap).map(([name, profit]) => ({ name, profit }));

  // 6. Asset Class Performance
  const assetMap: Record<string, number> = {};
  closedTrades.forEach((t) => {
    assetMap[t.assetType] = (assetMap[t.assetType] || 0) + calculateTradeProfit(t);
  });
  const assetData = Object.entries(assetMap).map(([name, profit]) => ({ name, profit }));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-800/40 rounded-xl"></div>
          <div className="h-64 bg-gray-800/40 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (closedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-gray-800 rounded-2xl p-16 text-center bg-[#070b18]/40">
        <BarChart3 className="h-12 w-12 text-gray-600 mb-4" />
        <h3 className="text-base font-bold text-gray-200">No Analytics records available</h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1">
          Analytics dashboard charts will automatically render once you have logged at least one closed trade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Analytics & Metrics
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Deep-dive graphical reports tracking drawdown, strategy efficiency, and timeframe performance.
        </p>
      </div>

      {/* Row 1: Equity Curve & Drawdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve Area */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-blue-400" /> Account Equity curve
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown Curve */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-red-400" /> Drawdown Curve (%)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} tickFormatter={(val) => `${val}%`} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDD)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Strategy Efficiency & Win/Loss distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Win/Loss distribution */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
            <PieIcon className="h-4 w-4 text-emerald-400" /> Win / Loss distribution
          </h2>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs font-semibold text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Wins ({wins})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Losses ({losses})</span>
            </div>
          </div>
        </div>

        {/* Strategy Performance */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-purple-400" /> Profitability by Strategy
          </h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strategyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="profit" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Weekday distributions & asset class metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit by Weekday */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-yellow-400" /> Net Profit by Weekday
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="profit" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Class performance */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
            <Hourglass className="h-4 w-4 text-emerald-400" /> Performance by Asset Class
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
