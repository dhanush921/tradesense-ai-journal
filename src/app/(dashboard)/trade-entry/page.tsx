"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Loader2, Upload, FileText, Image as ImageIcon, Save, Trash2, HelpCircle, CheckCircle, Sparkles } from "lucide-react";

export default function TradeEntry() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    market: "",
    broker: "MetaTrader 5",
    assetType: "Forex" as "Forex" | "Crypto" | "Stocks" | "Indices" | "Commodities",
    pair: "",
    direction: "Buy" as "Buy" | "Sell",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    riskPct: "1",
    lotSize: "",
    quantity: "",
    fees: "0",
    commission: "0",
    slippage: "0",
    status: "Closed" as "Open" | "Closed" | "Break Even" | "Win" | "Loss" | "Partial",
    duration: "", // minutes
    strategyUsed: "",
    setupName: "",
    timeframe: "15M",
    reasonEntry: "",
    reasonExit: "",
    mistakes: "",
    lessons: "",
    confidence: "3", // 1-5
    emotionBefore: "Disciplined",
    emotionAfter: "Disciplined",
    marketCondition: "Trending" as "Trending" | "Range" | "Volatile" | "News",
    tags: "",
    notes: "",
    tvUrl: "",
  });

  // Screenshots Upload States
  const [screenshots, setScreenshots] = useState<{
    beforeEntry?: string;
    duringTrade?: string;
    exit?: string;
    final?: string;
  }>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // Auto-save: load draft from local storage
  useEffect(() => {
    const savedDraft = localStorage.getItem("tradesense_trade_draft");
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (e) {
        console.error("Error loading draft", e);
      }
    }
  }, []);

  // Auto-save: write draft changes to local storage
  const handleFieldChange = (
    field: string,
    value: string | number | boolean
  ) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    localStorage.setItem("tradesense_trade_draft", JSON.stringify(updated));
  };

  // Upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const storageRef = ref(storage, `users/${user.uid}/trades/${Date.now()}_${key}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setScreenshots((prev) => ({ ...prev, [key]: url }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading screenshot. Please verify Firebase Storage rules.");
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const triggerAiAnalysis = async (tradeId: string, tradeData: any) => {
    setAiAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId, trade: tradeData }),
      });
      if (!response.ok) {
        throw new Error("AI analysis call failed.");
      }
    } catch (error) {
      console.error("AI Analysis Trigger Error:", error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const formattedData = {
      ...formData,
      userId: user.uid,
      entryPrice: parseFloat(formData.entryPrice) || 0,
      exitPrice: parseFloat(formData.exitPrice) || 0,
      stopLoss: parseFloat(formData.stopLoss) || 0,
      takeProfit: parseFloat(formData.takeProfit) || 0,
      riskPct: parseFloat(formData.riskPct) || 0,
      lotSize: parseFloat(formData.lotSize) || 0,
      quantity: parseFloat(formData.quantity) || 1,
      fees: parseFloat(formData.fees) || 0,
      commission: parseFloat(formData.commission) || 0,
      slippage: parseFloat(formData.slippage) || 0,
      duration: parseInt(formData.duration) || 0,
      confidence: parseInt(formData.confidence) || 3,
      tags: formData.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0),
      screenshots,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "trades"), formattedData);
      
      // Clear LocalStorage draft
      localStorage.removeItem("tradesense_trade_draft");
      
      // Trigger AI Analysis in parallel
      await triggerAiAnalysis(docRef.id, formattedData);

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Error adding trade:", error);
      alert("Failed to save trade to Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to discard this trade form draft?")) {
      localStorage.removeItem("tradesense_trade_draft");
      setFormData({
        title: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        market: "",
        broker: "MetaTrader 5",
        assetType: "Forex",
        pair: "",
        direction: "Buy",
        entryPrice: "",
        exitPrice: "",
        stopLoss: "",
        takeProfit: "",
        riskPct: "1",
        lotSize: "",
        quantity: "",
        fees: "0",
        commission: "0",
        slippage: "0",
        status: "Closed",
        duration: "",
        strategyUsed: "",
        setupName: "",
        timeframe: "15M",
        reasonEntry: "",
        reasonExit: "",
        mistakes: "",
        lessons: "",
        confidence: "3",
        emotionBefore: "Disciplined",
        emotionAfter: "Disciplined",
        marketCondition: "Trending",
        tags: "",
        notes: "",
        tvUrl: "",
      });
      setScreenshots({});
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Log New Trade
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Fill in the details below. Auto-saves drafts to your local device.
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-emerald-400 shadow-lg animate-bounce">
          <CheckCircle className="h-6 w-6" />
          <span className="font-semibold">Trade saved successfully! Redirecting...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: General Info Card */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            General Trade Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Trade Title / Setup Idea</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder="e.g. EURUSD Order Block Bounce"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Asset Class</label>
              <select
                value={formData.assetType}
                onChange={(e) => handleFieldChange("assetType", e.target.value)}
                className="glass-input w-full bg-[#0a0f1d]"
              >
                <option value="Forex">Forex</option>
                <option value="Crypto">Crypto</option>
                <option value="Stocks">Stocks</option>
                <option value="Indices">Indices</option>
                <option value="Commodities">Commodities</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Market Ticker / Pair</label>
              <input
                type="text"
                required
                value={formData.pair}
                onChange={(e) => handleFieldChange("pair", e.target.value)}
                placeholder="e.g. EUR/USD or BTC/USDT"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Broker Name</label>
              <input
                type="text"
                value={formData.broker}
                onChange={(e) => handleFieldChange("broker", e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Trade Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleFieldChange("date", e.target.value)}
                className="glass-input w-full bg-[#0a0f1d]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Trade Time</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => handleFieldChange("time", e.target.value)}
                className="glass-input w-full bg-[#0a0f1d]"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Risk and Entry Details */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Pricing, Position & Risk Control
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => handleFieldChange("direction", e.target.value)}
                className="glass-input w-full bg-[#0a0f1d]"
              >
                <option value="Buy">Buy (Long)</option>
                <option value="Sell">Sell (Short)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Entry Price</label>
              <input
                type="number"
                step="any"
                required
                value={formData.entryPrice}
                onChange={(e) => handleFieldChange("entryPrice", e.target.value)}
                placeholder="0.00"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Exit Price</label>
              <input
                type="number"
                step="any"
                required
                value={formData.exitPrice}
                onChange={(e) => handleFieldChange("exitPrice", e.target.value)}
                placeholder="0.00"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Trade Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
                className="glass-input w-full bg-[#0a0f1d]"
              >
                <option value="Closed">Closed</option>
                <option value="Open">Open (Active)</option>
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
                <option value="Break Even">Break Even</option>
                <option value="Partial">Partial realized</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={formData.stopLoss}
                onChange={(e) => handleFieldChange("stopLoss", e.target.value)}
                placeholder="0.00"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Take Profit</label>
              <input
                type="number"
                step="any"
                value={formData.takeProfit}
                onChange={(e) => handleFieldChange("takeProfit", e.target.value)}
                placeholder="0.00"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Risk Percentage (%)</label>
              <input
                type="number"
                step="any"
                value={formData.riskPct}
                onChange={(e) => handleFieldChange("riskPct", e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Lot Size</label>
              <input
                type="number"
                step="any"
                value={formData.lotSize}
                onChange={(e) => handleFieldChange("lotSize", e.target.value)}
                placeholder="e.g. 1.0"
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Total Quantity / Units</label>
              <input
                type="number"
                step="any"
                required
                value={formData.quantity}
                onChange={(e) => handleFieldChange("quantity", e.target.value)}
                placeholder="e.g. 100000"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Broker Fees ($)</label>
              <input
                type="number"
                step="any"
                value={formData.fees}
                onChange={(e) => handleFieldChange("fees", e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Commissions ($)</label>
              <input
                type="number"
                step="any"
                value={formData.commission}
                onChange={(e) => handleFieldChange("commission", e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Slippage ($)</label>
              <input
                type="number"
                step="any"
                value={formData.slippage}
                onChange={(e) => handleFieldChange("slippage", e.target.value)}
                className="glass-input w-full"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Strategy & Psychology Details */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Execution Strategy & psychology
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Strategy Used</label>
              <input
                type="text"
                value={formData.strategyUsed}
                onChange={(e) => handleFieldChange("strategyUsed", e.target.value)}
                placeholder="e.g. Order Block"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Setup Name</label>
              <input
                type="text"
                value={formData.setupName}
                onChange={(e) => handleFieldChange("setupName", e.target.value)}
                placeholder="e.g. FVG mitigation"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Timeframe</label>
              <select
                value={formData.timeframe}
                onChange={(e) => handleFieldChange("timeframe", e.target.value)}
                className="glass-input w-full bg-[#0a0f1d]"
              >
                <option value="1M">1M</option>
                <option value="5M">5M</option>
                <option value="15M">15M</option>
                <option value="30M">30M</option>
                <option value="1H">1H</option>
                <option value="4H">4H</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Duration (Minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleFieldChange("duration", e.target.value)}
                placeholder="e.g. 120"
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Market Condition</label>
              <select
                value={formData.marketCondition}
                onChange={(e) => handleFieldChange("marketCondition", e.target.value)}
                className="glass-input w-full bg-[#0a0f1d]"
              >
                <option value="Trending">Trending</option>
                <option value="Range">Range</option>
                <option value="Volatile">Volatile</option>
                <option value="News">News Release</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Emotion BEFORE Trade</label>
              <input
                type="text"
                value={formData.emotionBefore}
                onChange={(e) => handleFieldChange("emotionBefore", e.target.value)}
                placeholder="e.g. Confident, FOMO"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Emotion AFTER Trade</label>
              <input
                type="text"
                value={formData.emotionAfter}
                onChange={(e) => handleFieldChange("emotionAfter", e.target.value)}
                placeholder="e.g. Happy, Revenge"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Confidence Level (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.confidence}
                onChange={(e) => handleFieldChange("confidence", e.target.value)}
                className="glass-input w-full"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Text logs and annotations */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Narrative Analysis, Lessons & Mistakes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Reason for Entry</label>
              <textarea
                value={formData.reasonEntry}
                onChange={(e) => handleFieldChange("reasonEntry", e.target.value)}
                rows={3}
                className="glass-input w-full text-sm"
                placeholder="Why did you click buy/sell?"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Reason for Exit</label>
              <textarea
                value={formData.reasonExit}
                onChange={(e) => handleFieldChange("reasonExit", e.target.value)}
                rows={3}
                className="glass-input w-full text-sm"
                placeholder="What triggered the close?"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Mistakes Made</label>
              <textarea
                value={formData.mistakes}
                onChange={(e) => handleFieldChange("mistakes", e.target.value)}
                rows={2}
                className="glass-input w-full text-sm"
                placeholder="e.g. Entering too early, poor stop placement"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Lessons Learned</label>
              <textarea
                value={formData.lessons}
                onChange={(e) => handleFieldChange("lessons", e.target.value)}
                rows={2}
                className="glass-input w-full text-sm"
                placeholder="What would you do differently next time?"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">TradingView Widget / Chart URL</label>
              <input
                type="text"
                value={formData.tvUrl}
                onChange={(e) => handleFieldChange("tvUrl", e.target.value)}
                placeholder="https://www.tradingview.com/x/..."
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tags (Comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleFieldChange("tags", e.target.value)}
                placeholder="breakout, support, fomo"
                className="glass-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              rows={3}
              className="glass-input w-full text-sm"
            />
          </div>
        </div>

        {/* Step 5: Screenshot uploads */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Trade Screenshots / Attachments
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Before Entry", key: "beforeEntry" },
              { label: "During Trade", key: "duringTrade" },
              { label: "Exit Point", key: "exit" },
              { label: "Final Outcome", key: "final" },
            ].map((shot) => (
              <div key={shot.key} className="flex flex-col items-center justify-center border border-dashed border-gray-800 rounded-xl p-4 bg-gray-900/10">
                <span className="text-xs font-bold text-gray-400 mb-2">{shot.label}</span>
                {screenshots[shot.key as keyof typeof screenshots] ? (
                  <div className="relative w-full aspect-video rounded overflow-hidden border border-gray-800">
                    <img
                      src={screenshots[shot.key as keyof typeof screenshots]}
                      alt={shot.label}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setScreenshots((prev) => {
                        const copy = { ...prev };
                        delete copy[shot.key as keyof typeof screenshots];
                        return copy;
                      })}
                      className="absolute top-1 right-1 p-1 bg-red-600 rounded text-white hover:bg-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-video rounded cursor-pointer border border-gray-800 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-gray-500">
                    {uploading[shot.key] ? (
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mb-1" />
                        <span className="text-[10px]">Select image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, shot.key)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/5 border border-transparent rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" /> Discard Draft
          </button>
          
          <div className="flex items-center gap-3">
            {aiAnalyzing && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold animate-pulse">
                <Sparkles className="h-4 w-4 animate-spin" /> AI Analyzing...
              </span>
            )}
            <button
              type="submit"
              disabled={loading || Object.values(uploading).some(Boolean)}
              className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Trade Log
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
