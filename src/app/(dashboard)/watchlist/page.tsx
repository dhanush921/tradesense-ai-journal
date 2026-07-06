"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Loader2,
  Trash2,
  TrendingUp,
  Check,
  RotateCcw,
  PlayCircle,
  PauseCircle,
  FastForward,
  Layers,
  LayoutGrid,
  AlertCircle,
  Eye,
} from "lucide-react";

interface WatchlistItem {
  id?: string;
  userId: string;
  symbol: string;
  notes: string;
  target: number;
  alertPrice: number;
  status: "active" | "triggered" | "cancelled";
  createdAt: string;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate realistic simulated price candles based on asset symbol and timeframe
const generateWatchlistCandles = (symbol: string, timeframe: string, count: number = 60): Candle[] => {
  const candles: Candle[] = [];
  let price = 150; // default Apple-like price
  let volatility = 0.02;

  const upperSymbol = symbol.toUpperCase();
  if (upperSymbol.includes("BTC") || upperSymbol.includes("ETH")) {
    price = upperSymbol.includes("BTC") ? 64000 : 3450;
    volatility = 0.035;
  } else if (upperSymbol.includes("EUR") || upperSymbol.includes("GBP")) {
    price = upperSymbol.includes("EUR") ? 1.0850 : 1.2720;
    volatility = 0.004;
  } else if (upperSymbol.includes("NIFTY")) {
    price = 23400;
    volatility = 0.012;
  } else if (upperSymbol === "GOLD") {
    price = 2330;
    volatility = 0.01;
  } else if (upperSymbol === "TSLA") {
    price = 220;
    volatility = 0.038;
  }

  const now = new Date();
  let timeMultiplier = 24 * 60 * 60 * 1000; // default 1D
  if (timeframe === "1m") timeMultiplier = 60 * 1000;
  else if (timeframe === "5m") timeMultiplier = 5 * 60 * 1000;
  else if (timeframe === "15m") timeMultiplier = 15 * 60 * 1000;
  else if (timeframe === "1h") timeMultiplier = 60 * 60 * 1000;
  else if (timeframe === "4h") timeMultiplier = 4 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const change = price * (Math.random() * (volatility * 2) - volatility + (volatility * 0.03)); 
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * (price * (volatility * 0.15));
    const low = Math.min(open, close) - Math.random() * (price * (volatility * 0.15));
    const volume = Math.round(50 + Math.random() * 200);
    
    const date = new Date(now.getTime() - (count - i) * timeMultiplier);
    let timeStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (timeframe.includes("m") || timeframe.includes("h")) {
      timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    
    candles.push({ time: timeStr, open, high, low, close, volume });
    price = close;
  }
  return candles;
};

// Calculate Heikin Ashi candles
const calculateHeikinAshi = (raw: Candle[]): Candle[] => {
  const ha: Candle[] = [];
  if (raw.length === 0) return ha;

  let prevOpen = raw[0].open;
  let prevClose = raw[0].close;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    ha.push({
      time: c.time,
      open: haOpen,
      close: haClose,
      high: haHigh,
      low: haLow,
      volume: c.volume
    });

    prevOpen = haOpen;
    prevClose = haClose;
  }
  return ha;
};

export default function Watchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [mounted, setMounted] = useState(false);
 
  // Form State
  const [symbol, setSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState("");
  const [alertPrice, setAlertPrice] = useState("");

  // Toolbar settings states
  const [timeframe, setTimeframe] = useState<string>("1D");
  const [chartStyle, setChartStyle] = useState<"candles" | "heikin" | "line" | "bars">("candles");
  const [visibleIndicators, setVisibleIndicators] = useState<string[]>(["EMA9", "EMA21", "BB"]);
  const [layoutMode, setLayoutMode] = useState<"single" | "split">("single");

  // Replay states
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [replayIndex, setReplayIndex] = useState<number>(25);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1); // 1x, 2x, 4x

  // Candles & Indicators data
  const [rawCandles, setRawCandles] = useState<Candle[]>([]);
  const [activeCandles, setActiveCandles] = useState<Candle[]>([]);
  const [indicatorData, setIndicatorData] = useState<{
    fastEMA: number[];
    slowEMA: number[];
    bbUpper: number[];
    bbLower: number[];
  } | null>(null);

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchWatchlist = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "watchlists"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const items: WatchlistItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as WatchlistItem);
      });
      setWatchlist(items);
      if (items.length > 0) {
        setSelectedSymbol(items[0].symbol);
      }
    } catch (e) {
      console.error("Error fetching watchlist:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [user]);

  // Regenerate candles when symbol or timeframe changes
  useEffect(() => {
    const generated = generateWatchlistCandles(selectedSymbol, timeframe, 60);
    setRawCandles(generated);
    if (isReplayMode) {
      setActiveCandles(generated.slice(0, replayIndex));
    } else {
      setActiveCandles(generated);
    }
  }, [selectedSymbol, timeframe]);

  // Synchronize candles when Replay Index increments
  useEffect(() => {
    if (isReplayMode) {
      setActiveCandles(rawCandles.slice(0, replayIndex));
    } else {
      setActiveCandles(rawCandles);
    }
  }, [replayIndex, isReplayMode, rawCandles]);

  // Dynamic automatic playback effect for replay mode
  useEffect(() => {
    if (isReplayPlaying && isReplayMode) {
      const intervalTime = 1000 / replaySpeed;
      playbackTimerRef.current = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= rawCandles.length) {
            setIsReplayPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalTime);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isReplayPlaying, isReplayMode, replaySpeed, rawCandles.length]);

  // Recalculate indicators on candles changes
  useEffect(() => {
    if (activeCandles.length > 0) {
      const closePrices = activeCandles.map(c => c.close);
      
      const calcEMA = (data: number[], length: number): number[] => {
        const ema: number[] = [];
        const k = 2 / (length + 1);
        let val = data[0] || 0;
        ema.push(val);
        for (let i = 1; i < data.length; i++) {
          val = data[i] * k + val * (1 - k);
          ema.push(val);
        }
        return ema;
      };

      const calcBB = (data: number[], length: number): { upper: number[]; lower: number[] } => {
        const upper: number[] = [];
        const lower: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < length) {
            upper.push(data[i]);
            lower.push(data[i]);
            continue;
          }
          const slice = data.slice(i - length + 1, i + 1);
          const mean = slice.reduce((a, b) => a + b, 0) / length;
          const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
          const stdDev = Math.sqrt(variance);
          upper.push(mean + stdDev * 2);
          lower.push(mean - stdDev * 2);
        }
        return { upper, lower };
      };

      const bb = calcBB(closePrices, 20);
      setIndicatorData({
        fastEMA: calcEMA(closePrices, 9),
        slowEMA: calcEMA(closePrices, 21),
        bbUpper: bb.upper,
        bbLower: bb.lower
      });
    }
  }, [activeCandles]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !symbol) return;
    setSaveLoading(true);

    const rawSymbol = symbol.toUpperCase().replace("/", "").trim();
    const newItem: WatchlistItem = {
      userId: user.uid,
      symbol: rawSymbol,
      notes,
      target: parseFloat(target) || 0,
      alertPrice: parseFloat(alertPrice) || 0,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "watchlists"), newItem);
      setWatchlist((prev) => [...prev, { id: docRef.id, ...newItem }]);
      setSelectedSymbol(newItem.symbol);
      setSymbol("");
      setNotes("");
      setTarget("");
      setAlertPrice("");
    } catch (e) {
      console.error("Error adding to watchlist:", e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "watchlists", id));
      setWatchlist((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error("Error deleting item:", e);
    }
  };

  const handleTrigger = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "triggered" : "active";
    try {
      await updateDoc(doc(db, "watchlists", id), { status: nextStatus });
      setWatchlist((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus as any } : item))
      );
    } catch (e) {
      console.error("Error updating status:", e);
    }
  };

  const toggleIndicator = (ind: string) => {
    setVisibleIndicators(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  // Find currently active alert levels
  const selectedWatchlistItem = watchlist.find(item => item.symbol === selectedSymbol);

  // SVG Chart rendering helper calculations
  const padding = 40;
  const chartHeight = 270;
  const chartWidth = 680;

  const minVal = activeCandles.length > 0 ? Math.min(...activeCandles.map(c => c.low)) * 0.995 : 0;
  const maxVal = activeCandles.length > 0 ? Math.max(...activeCandles.map(c => c.high)) * 1.005 : 100;
  const range = maxVal - minVal;

  const getX = (index: number) => {
    if (activeCandles.length <= 1) return padding;
    return padding + (index / (activeCandles.length - 1)) * (chartWidth - padding * 2);
  };

  const getY = (value: number) => {
    return chartHeight - padding - ((value - minVal) / range) * (chartHeight - padding * 2);
  };

  const displayCandles = chartStyle === "heikin" ? calculateHeikinAshi(activeCandles) : activeCandles;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Watchlists & Technicals
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Monitor symbol alerts, target levels, and interact with the integrated TradingView charts.
        </p>
      </div>

      {/* Main Studio Tools Toolbar */}
      <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-3 flex flex-wrap gap-4 items-center justify-between shadow-2xl">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#070b18] border border-gray-800 rounded-lg p-0.5">
            {["1m", "5m", "15m", "1h", "4h", "1D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                  timeframe === tf ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style Selector */}
          <div className="flex items-center bg-[#070b18] border border-gray-800 rounded-lg p-0.5">
            {[
              { id: "candles", label: "🕯️" },
              { id: "heikin", label: "🧘" },
              { id: "line", label: "📈" },
              { id: "bars", label: "📊" },
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setChartStyle(style.id as any)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
                  chartStyle === style.id ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
                title={style.id}
              >
                {style.label}
              </button>
            ))}
          </div>

          {/* Indicators Checkboxes */}
          <div className="flex items-center gap-1.5">
            {[
              { id: "EMA9", label: "EMA 9" },
              { id: "EMA21", label: "EMA 21" },
              { id: "BB", label: "Bands" },
            ].map((ind) => (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind.id)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                  visibleIndicators.includes(ind.id)
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                    : "border-gray-800 text-gray-500 hover:text-gray-300"
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Chart Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-[#070b18] border border-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setLayoutMode("single")}
            className={`p-1 rounded cursor-pointer ${
              layoutMode === "single" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setLayoutMode("split")}
            className={`p-1 rounded cursor-pointer ${
              layoutMode === "split" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Watchlist items list */}
        <div className="space-y-6">
          {/* Add Item form */}
          <form onSubmit={handleAdd} className="glass-card rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
              Add New Symbol
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 font-semibold mb-1">Symbol / Ticker</label>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. BTCUSDT"
                  className="glass-input w-full py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-semibold mb-1">Alert Price ($)</label>
                <input
                  type="number"
                  step="any"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder="e.g. 68000"
                  className="glass-input w-full py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Target Price ($)</label>
              <input
                type="number"
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 70000"
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Alert Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Look for daily close rejection"
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              {saveLoading ? "Adding..." : "Add Symbol"}
            </button>
          </form>

          {/* List group */}
          <div className="glass-card rounded-xl p-5 space-y-3 max-h-[350px] overflow-y-auto">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Watchlist Symbols</h2>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : watchlist.length === 0 ? (
              <p className="text-[11px] text-gray-500 text-center py-4">Watchlist is empty.</p>
            ) : (
              <div className="space-y-2">
                {watchlist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedSymbol(item.symbol)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      selectedSymbol === item.symbol
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-gray-900/30 border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-200">{item.symbol}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded ${
                          item.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-[180px] truncate">{item.notes}</p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-400">
                        <span>Alert: <strong>${item.alertPrice}</strong></span>
                        <span>Target: <strong>${item.target}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => item.id && handleTrigger(item.id, item.status)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          item.status === "triggered" ? "bg-emerald-600/20 text-emerald-400" : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                        title="Mark triggered/active"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-1 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Native Interactive SVG Candlestick Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-xl p-5 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
                <h3 className="text-sm font-bold text-gray-200">
                  Interactive Chart: <strong className="text-blue-400">{selectedSymbol}</strong>
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsReplayMode(!isReplayMode);
                  setReplayIndex(25);
                  setIsReplayPlaying(false);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  isReplayMode ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                }`}
              >
                {isReplayMode ? "Exit Replay" : "Bar Replay"}
              </button>
            </div>

            {/* Split Screen layout container */}
            <div className="grid grid-cols-1 gap-4">
              {mounted && activeCandles.length > 0 ? (
                <div className="relative w-full overflow-hidden bg-gray-950 rounded-xl border border-gray-800/80 p-2">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                    {/* Grid Lines */}
                    {[0, 1, 2, 3, 4].map(idx => (
                      <line key={idx} x1={padding} y1={padding + (idx / 4) * (chartHeight - padding * 2)} x2={chartWidth - padding} y2={padding + (idx / 4) * (chartHeight - padding * 2)} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="4 4" />
                    ))}

                    {/* Candlesticks, Line or Bar Chart */}
                    {displayCandles.map((candle, idx) => {
                      const x = getX(idx);
                      const yOpen = getY(candle.open);
                      const yClose = getY(candle.close);
                      const yHigh = getY(candle.high);
                      const yLow = getY(candle.low);
                      const isGreen = candle.close >= candle.open;
                      
                      if (chartStyle === "line") return null;

                      if (chartStyle === "bars") {
                        return (
                          <g key={idx}>
                            <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={isGreen ? "#10b981" : "#ef4444"} strokeWidth="1.5" />
                            <line x1={x - 4} y1={yOpen} x2={x} y2={yOpen} stroke={isGreen ? "#10b981" : "#ef4444"} strokeWidth="1.5" />
                            <line x1={x} y1={yClose} x2={x + 4} y2={yClose} stroke={isGreen ? "#10b981" : "#ef4444"} strokeWidth="1.5" />
                          </g>
                        );
                      }

                      return (
                        <g key={idx}>
                          <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={isGreen ? "#10b981" : "#ef4444"} strokeWidth="1.5" />
                          <rect x={x - 4} y={Math.min(yOpen, yClose)} width="8" height={Math.max(Math.abs(yOpen - yClose), 1)} fill={isGreen ? "#10b981" : "#ef4444"} />
                        </g>
                      );
                    })}

                    {chartStyle === "line" && (
                      <path d={displayCandles.map((c, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(c.close)}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                    )}

                    {/* Indicator overlays */}
                    {indicatorData && (
                      <>
                        {visibleIndicators.includes("BB") && (
                          <path
                            d={
                              indicatorData.bbUpper.map((val, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(val)}`).join(" ") + " " +
                              indicatorData.bbLower.map((val, idx) => `L ${getX(indicatorData.bbLower.length - 1 - idx)} ${getY(indicatorData.bbLower[indicatorData.bbLower.length - 1 - idx])}`).join(" ") + " Z"
                            }
                            fill="rgba(59, 130, 246, 0.04)"
                            stroke="none"
                          />
                        )}

                        {visibleIndicators.includes("EMA9") && (
                          <path d={indicatorData.fastEMA.map((val, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(val)}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="1.8" />
                        )}

                        {visibleIndicators.includes("EMA21") && (
                          <path d={indicatorData.slowEMA.map((val, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(val)}`).join(" ")} fill="none" stroke="#f97316" strokeWidth="1.8" />
                        )}
                      </>
                    )}

                    {/* Draw Target and Alert horizontal lines directly from Firestore data */}
                    {selectedWatchlistItem && (
                      <>
                        {/* Target Price line */}
                        {selectedWatchlistItem.target > minVal && selectedWatchlistItem.target < maxVal && (
                          <g>
                            <line x1={padding} y1={getY(selectedWatchlistItem.target)} x2={chartWidth - padding} y2={getY(selectedWatchlistItem.target)} stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="3 3" />
                            <text x={chartWidth - padding - 80} y={getY(selectedWatchlistItem.target) - 4} fill="#3b82f6" className="text-[9px] font-mono font-bold">Target: ${selectedWatchlistItem.target}</text>
                          </g>
                        )}

                        {/* Alert Price line */}
                        {selectedWatchlistItem.alertPrice > minVal && selectedWatchlistItem.alertPrice < maxVal && (
                          <g>
                            <line x1={padding} y1={getY(selectedWatchlistItem.alertPrice)} x2={chartWidth - padding} y2={getY(selectedWatchlistItem.alertPrice)} stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
                            <text x={chartWidth - padding - 80} y={getY(selectedWatchlistItem.alertPrice) - 4} fill="#ef4444" className="text-[9px] font-mono font-bold">Alert: ${selectedWatchlistItem.alertPrice}</text>
                          </g>
                        )}
                      </>
                    )}
                  </svg>

                  {/* Label overlay info */}
                  <div className="absolute top-4 left-4 text-[9px] text-gray-500 font-mono">
                    <span className="uppercase text-gray-400 font-black">{selectedSymbol} ({timeframe})</span>
                  </div>
                </div>
              ) : (
                <div className="h-60 w-full flex items-center justify-center bg-gray-950 text-gray-500 text-xs rounded-xl border border-gray-800">
                  Loading Ticker Candle Feeds...
                </div>
              )}

              {/* Split Screen layout */}
              {layoutMode === "split" && (
                <div className="relative w-full overflow-hidden bg-gray-950 rounded-xl border border-gray-800/80 p-2">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                    {[0, 1].map(i => <line key={i} x1={padding} y1={padding + (i / 1) * (chartHeight - padding * 2)} x2={chartWidth - padding} y2={padding + (i / 1) * (chartHeight - padding * 2)} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="4 4" />)}
                    <path d={displayCandles.map((c, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(c.close * 0.95)}`).join(" ")} fill="none" stroke="#8b5cf6" strokeWidth="1.8" />
                  </svg>
                  <div className="absolute top-4 left-4 text-[9px] text-purple-400 font-mono font-black uppercase">
                    ETHUSD ({timeframe})
                  </div>
                </div>
              )}
            </div>

            {/* Replay Controls Panel */}
            {isReplayMode && (
              <div className="bg-gray-950/80 border border-gray-800 p-2.5 rounded-xl flex items-center justify-between gap-3 flex-wrap mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReplayIndex(15)}
                    className="p-1 bg-gray-900 hover:bg-gray-800 rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setIsReplayPlaying(!isReplayPlaying)}
                    className="p-1 bg-blue-600 hover:bg-blue-500 rounded-full text-white cursor-pointer"
                  >
                    {isReplayPlaying ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      if (replayIndex < rawCandles.length) setReplayIndex(prev => prev + 1);
                    }}
                    className="p-1 bg-gray-900 hover:bg-gray-800 rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    <FastForward className="h-3 w-3" />
                  </button>
                </div>

                <div className="text-[10px] text-gray-400 font-mono">
                  Bar: <strong>{replayIndex}</strong> / {rawCandles.length}
                </div>

                <div className="flex items-center gap-1.5 bg-[#070b18] border border-gray-800 rounded p-0.5">
                  {[1, 2, 4].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setReplaySpeed(speed)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold rounded cursor-pointer ${
                        replaySpeed === speed ? "bg-blue-600 text-white" : "text-gray-500"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
