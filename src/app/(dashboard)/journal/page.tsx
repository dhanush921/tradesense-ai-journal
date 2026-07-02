"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, calculateTradeProfit } from "@/lib/tradeUtils";
import {
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  Shield,
  Smile,
  BookOpen,
  Loader2,
} from "lucide-react";

export default function Journal() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    assetType: "All",
    direction: "All",
    status: "All",
    timeframe: "All",
    marketCondition: "All",
  });

  const fetchTrades = async () => {
    if (!user) return;
    setLoading(true);
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

  useEffect(() => {
    fetchTrades();
  }, [user]);

  const handleDeleteTrade = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade record? This action is permanent.")) return;
    try {
      await deleteDoc(doc(db, "trades", id));
      // Try deleting the AI report as well
      await deleteDoc(doc(db, "aiReports", id));
      setTrades((prev) => prev.filter((t) => t.id !== id));
      if (selectedTrade?.id === id) {
        setSelectedTrade(null);
        setAiReport(null);
      }
    } catch (e) {
      console.error("Error deleting trade:", e);
    }
  };

  const handleSelectTrade = async (trade: Trade) => {
    setSelectedTrade(trade);
    setAiReport(null);
    if (!trade.id) return;

    setAiLoading(true);
    try {
      const reportRef = doc(db, "aiReports", trade.id);
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) {
        setAiReport(reportSnap.data());
      } else {
        // AI Report didn't exist yet, trigger/generate client-side fallback
        setAiReport(null);
      }
    } catch (error) {
      console.error("Error fetching AI Report:", error);
    } finally {
      setAiLoading(false);
    }
  };

  // Filter and Search logic
  const filteredTrades = trades.filter((trade) => {
    const matchesSearch =
      trade.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.strategyUsed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trade.notes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAsset = filters.assetType === "All" || trade.assetType === filters.assetType;
    const matchesDirection = filters.direction === "All" || trade.direction === filters.direction;
    const matchesStatus = filters.status === "All" || trade.status === filters.status;
    const matchesTimeframe = filters.timeframe === "All" || trade.timeframe === filters.timeframe;
    const matchesCondition = filters.marketCondition === "All" || trade.marketCondition === filters.marketCondition;

    return matchesSearch && matchesAsset && matchesDirection && matchesStatus && matchesTimeframe && matchesCondition;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Trading Journal logs
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Review, filter, and inspect detailed analysis reports on every trade logged.
        </p>
      </div>

      {/* Search & Filter Header */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by asset, strategy, tags, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input w-full pl-10"
            />
          </div>
          <button
            onClick={() => {
              setFilters({
                assetType: "All",
                direction: "All",
                status: "All",
                timeframe: "All",
                marketCondition: "All",
              });
              setSearchTerm("");
            }}
            className="px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-800 text-xs font-semibold text-gray-400 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>

        {/* Multi Filters grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Asset Class</label>
            <select
              value={filters.assetType}
              onChange={(e) => setFilters((prev) => ({ ...prev, assetType: e.target.value }))}
              className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
            >
              <option value="All">All Assets</option>
              <option value="Forex">Forex</option>
              <option value="Crypto">Crypto</option>
              <option value="Stocks">Stocks</option>
              <option value="Indices">Indices</option>
              <option value="Commodities">Commodities</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Direction</label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters((prev) => ({ ...prev, direction: e.target.value }))}
              className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
            >
              <option value="All">All Directions</option>
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
            >
              <option value="All">All Outcomes</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="Break Even">Break Even</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Timeframe</label>
            <select
              value={filters.timeframe}
              onChange={(e) => setFilters((prev) => ({ ...prev, timeframe: e.target.value }))}
              className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
            >
              <option value="All">All TFs</option>
              <option value="1M">1M</option>
              <option value="5M">5M</option>
              <option value="15M">15M</option>
              <option value="30M">30M</option>
              <option value="1H">1H</option>
              <option value="4H">4H</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Market Condition</label>
            <select
              value={filters.marketCondition}
              onChange={(e) => setFilters((prev) => ({ ...prev, marketCondition: e.target.value }))}
              className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
            >
              <option value="All">All Conditions</option>
              <option value="Trending">Trending</option>
              <option value="Range">Range</option>
              <option value="Volatile">Volatile</option>
              <option value="News">News Release</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Logs Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-gray-800 rounded-lg"></div>
          <div className="h-64 bg-gray-800/30 rounded-lg border border-gray-800/50"></div>
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="border border-gray-800 rounded-xl p-12 text-center bg-[#070b18]/25">
          <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-gray-300">No matching trades found</h3>
          <p className="text-xs text-gray-500 mt-1">Try modifying your filters or search terms.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/30 text-gray-500">
                  <th className="p-4">Date/Time</th>
                  <th className="p-4">Pair</th>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Dir</th>
                  <th className="p-4">TF</th>
                  <th className="p-4">Strategy</th>
                  <th className="p-4">Result</th>
                  <th className="p-4 text-right">PnL</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {filteredTrades.map((t) => {
                  const profit = calculateTradeProfit(t);
                  const isWin = profit > 0;
                  return (
                    <tr key={t.id} className="hover:bg-gray-800/20 transition-colors">
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-gray-200">{t.date}</div>
                          <div className="text-[10px] text-gray-500">{t.time}</div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-300">{t.market}</td>
                      <td className="p-4 text-gray-400">{t.assetType}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.direction === "Buy" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300 font-mono">{t.timeframe}</td>
                      <td className="p-4 text-gray-400 truncate max-w-[120px]">{t.strategyUsed || "-"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === "Win" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                          t.status === "Loss" ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                          "bg-gray-800 text-gray-300"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className={`p-4 text-right font-bold ${isWin ? "text-emerald-400" : profit < 0 ? "text-red-400" : "text-gray-400"}`}>
                        {t.status === "Open" ? "Open" : `${isWin ? "+" : ""}$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleSelectTrade(t)}
                          className="p-1.5 bg-[#0b1329] border border-gray-800 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title="View trade details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => t.id && handleDeleteTrade(t.id)}
                          className="p-1.5 bg-red-950/20 border border-red-900/30 rounded hover:bg-red-900/30 text-red-400 transition-colors cursor-pointer"
                          title="Delete trade log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade Inspection Details Modal / Sheet */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#070b18] border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => {
                setSelectedTrade(null);
                setAiReport(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Header info */}
            <div className="mb-6 border-b border-gray-800 pb-4 pr-8">
              <span className="text-[10px] text-blue-400 uppercase font-extrabold tracking-widest">{selectedTrade.assetType} • {selectedTrade.timeframe}</span>
              <h2 className="text-xl font-bold text-gray-200 mt-1">{selectedTrade.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>Date: <strong className="text-gray-300">{selectedTrade.date}</strong></span>
                <span>Time: <strong className="text-gray-300">{selectedTrade.time}</strong></span>
                <span>Broker: <strong className="text-gray-300">{selectedTrade.broker}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Trade details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Statistics Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-900/20 p-4 rounded-xl border border-gray-800">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Direction</span>
                    <span className="text-xs font-bold text-gray-200">{selectedTrade.direction}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Entry Price</span>
                    <span className="text-xs font-bold text-gray-200">${selectedTrade.entryPrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Exit Price</span>
                    <span className="text-xs font-bold text-gray-200">${selectedTrade.exitPrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Net Profit</span>
                    <span className={`text-xs font-bold ${calculateTradeProfit(selectedTrade) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ${calculateTradeProfit(selectedTrade).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Narrative Logs */}
                <div className="space-y-4">
                  {selectedTrade.reasonEntry && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for Entry</h4>
                      <p className="text-xs text-gray-300 bg-gray-900/40 p-3 rounded-lg border border-gray-800/50 leading-relaxed">
                        {selectedTrade.reasonEntry}
                      </p>
                    </div>
                  )}

                  {selectedTrade.reasonExit && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for Exit</h4>
                      <p className="text-xs text-gray-300 bg-gray-900/40 p-3 rounded-lg border border-gray-800/50 leading-relaxed">
                        {selectedTrade.reasonExit}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mistakes Made</h4>
                      <p className="text-xs text-red-400 bg-red-950/5 p-3 rounded-lg border border-red-950/20 leading-relaxed">
                        {selectedTrade.mistakes || "None logged."}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Lessons Learned</h4>
                      <p className="text-xs text-emerald-400 bg-emerald-950/5 p-3 rounded-lg border border-emerald-950/20 leading-relaxed">
                        {selectedTrade.lessons || "None logged."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Screenshots Gallery */}
                {selectedTrade.screenshots && Object.keys(selectedTrade.screenshots).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trade Screenshots</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selectedTrade.screenshots).map(([k, url]) => (
                        <div key={k} className="border border-gray-800 rounded-lg overflow-hidden relative">
                          <img src={url} alt={k} className="w-full aspect-video object-cover" />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[9px] font-bold text-white rounded uppercase">
                            {k}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: AI Analysis Report Card */}
              <div className="space-y-4">
                <div className="glass-panel rounded-xl p-5 border border-blue-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1.5 bg-blue-600/10 rounded-bl text-blue-400">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>

                  <h3 className="text-sm font-bold text-gray-200 mb-3 flex items-center gap-1">
                    AI Analysis Report
                  </h3>

                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="text-xs text-gray-500">Loading AI assessment...</span>
                    </div>
                  ) : aiReport ? (
                    <div className="space-y-4 text-xs">
                      {/* Overall score radial representation */}
                      <div className="flex items-center gap-4 border-b border-gray-800/80 pb-3">
                        <div className="h-12 w-12 rounded-full border-4 border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
                          {aiReport.overallScore || 0}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-200">Score Assessment</div>
                          <div className="text-[10px] text-gray-500">Scale of 1-100 rating</div>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 block uppercase font-bold">Execution Review</span>
                        <p className="text-gray-300 mt-1 leading-relaxed">{aiReport.summary}</p>
                      </div>

                      {/* Performance meters */}
                      <div className="space-y-2 border-t border-b border-gray-800/80 py-3 my-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Entry Quality:</span>
                          <span className="font-bold text-gray-300">{aiReport.entryQuality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Exit Quality:</span>
                          <span className="font-bold text-gray-300">{aiReport.exitQuality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Risk Assessment:</span>
                          <span className="font-bold text-gray-300">{aiReport.riskScore}/100</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 block uppercase font-bold">Psychology assessment</span>
                        <p className="text-gray-400 mt-1 leading-normal italic">"{aiReport.psychologyAnalysis}"</p>
                      </div>

                      {/* Improvement checklists */}
                      {aiReport.improvementPlan && aiReport.improvementPlan.length > 0 && (
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold mb-1">Improvement Steps</span>
                          <ul className="list-disc pl-4 space-y-1 text-gray-400">
                            {aiReport.improvementPlan.map((step: string, i: number) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Info className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No AI Analysis generated. Resave this trade or verify server actions.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
