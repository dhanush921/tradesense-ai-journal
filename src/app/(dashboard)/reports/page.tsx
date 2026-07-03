"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, calculateMetrics, calculateTradeProfit } from "@/lib/tradeUtils";
// jsPDF is lazy-loaded on demand inside handleGeneratePDF to avoid adding ~200KB to the initial bundle
import { Loader2, Download, Upload, FileText, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Import State
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState(0);

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

  // CSV Export Handler
  const handleExportCSV = () => {
    if (trades.length === 0) return alert("No trades to export.");

    const headers = [
      "Title",
      "Date",
      "Time",
      "Market",
      "Asset Type",
      "Direction",
      "Entry Price",
      "Exit Price",
      "Stop Loss",
      "Take Profit",
      "Lot Size",
      "Quantity",
      "Fees",
      "Status",
      "Duration (Mins)",
      "Strategy",
      "Timeframe",
      "Mistakes",
      "Lessons",
      "Notes",
    ];

    const rows = trades.map((t) => [
      t.title,
      t.date,
      t.time,
      t.market,
      t.assetType,
      t.direction,
      t.entryPrice,
      t.exitPrice,
      t.stopLoss,
      t.takeProfit,
      t.lotSize,
      t.quantity,
      t.fees,
      t.status,
      t.duration,
      t.strategyUsed,
      t.timeframe,
      t.mistakes || "",
      t.lessons || "",
      t.notes || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tradesense_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // jsPDF report generator
  const handleGeneratePDF = async (cycle: "Weekly" | "Monthly" | "Yearly") => {
    if (trades.length === 0) return alert("No trades logged yet.");
    setPdfGenerating(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const metrics = calculateMetrics(trades);

      // Header
      doc.setFillColor(7, 11, 24);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("TradeSense AI Journal", 15, 25);
      doc.setFontSize(10);
      doc.text(`${cycle} Performance Summary Report`, 15, 32);

      // Title & Date
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 52);
      doc.text(`Trader Account Reference: ${user?.email || "Anonymous User"}`, 15, 59);

      // Metrics Table Box
      doc.rect(15, 70, 180, 75);
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text("PERFORMANCE METRICS SUMMARY", 20, 80);
      doc.setFont("Helvetica", "normal");
      
      const statRows = [
        `Total Trades Logged: ${metrics.totalTrades}`,
        `Win Rate Achievement: ${metrics.winRate.toFixed(1)}%`,
        `Realized Net Profit: $${metrics.totalProfit.toFixed(2)}`,
        `Profit Factor Index: ${metrics.profitFactor === Infinity ? "N/A" : metrics.profitFactor.toFixed(2)}`,
        `Average Risk-Reward Ratio: 1:${metrics.averageRR.toFixed(1)}`,
        `Largest Win: +$${metrics.largestWin.toFixed(2)}`,
        `Largest Loss: -$${Math.abs(metrics.largestLoss).toFixed(2)}`,
        `Average holding duration: ${metrics.averageHoldingTime.toFixed(0)} minutes`,
      ];

      statRows.forEach((row, idx) => {
        doc.text(row, 25, 92 + idx * 6.5);
      });

      // Disclaimer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Confidential information generated automatically by TradeSense AI. Risk warning: Forex/Crypto trading involves capital risks.", 15, 280);

      doc.save(`tradesense_${cycle.toLowerCase()}_report.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error compiling PDF document.");
    } finally {
      setPdfGenerating(false);
    }
  };

  // CSV Importer Parser
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
        if (lines.length < 2) throw new Error("CSV requires a header and at least one trade row.");

        const header = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
        
        // Match columns
        const marketIdx = header.indexOf("market");
        const dirIdx = header.indexOf("direction");
        const entryIdx = header.indexOf("entry price");
        const exitIdx = header.indexOf("exit price");
        const qtyIdx = header.indexOf("quantity");
        const statusIdx = header.indexOf("status");
        
        if (marketIdx === -1 || dirIdx === -1 || entryIdx === -1 || exitIdx === -1) {
          throw new Error("Missing required columns: 'market', 'direction', 'entry price', 'exit price'.");
        }

        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          // simple quote-escaped splitter
          const row = lines[i].split(",").map((cell) => cell.replace(/"/g, "").trim());
          if (row.length < header.length) continue;

          const market = row[marketIdx];
          const direction = row[dirIdx] as "Buy" | "Sell";
          const entryPrice = parseFloat(row[entryIdx]) || 0;
          const exitPrice = parseFloat(row[exitIdx]) || 0;
          const quantity = qtyIdx !== -1 ? parseFloat(row[qtyIdx]) || 1 : 1;
          const status = statusIdx !== -1 ? row[statusIdx] as any : "Closed";

          const newTrade = {
            userId: user.uid,
            title: `Imported ${market} ${direction}`,
            date: new Date().toISOString().split("T")[0],
            time: "12:00",
            market,
            broker: "Imported CSV",
            assetType: "Forex" as const,
            pair: market,
            direction,
            entryPrice,
            exitPrice,
            stopLoss: 0,
            takeProfit: 0,
            riskPct: 1,
            lotSize: 0.1,
            quantity,
            fees: 0,
            commission: 0,
            slippage: 0,
            status,
            duration: 60,
            strategyUsed: "CSV Importer",
            setupName: "Bulk Upload",
            timeframe: "15M",
            reasonEntry: "Imported from CSV records.",
            reasonExit: "",
            mistakes: "",
            lessons: "",
            confidence: 3,
            emotionBefore: "Disciplined",
            emotionAfter: "Disciplined",
            marketCondition: "Trending" as const,
            tags: ["imported"],
            notes: "",
            tvUrl: "",
            screenshots: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await addDoc(collection(db, "trades"), newTrade);
          importedCount++;
        }

        setImportCount(importedCount);
        setImportSuccess(true);
        // Refresh page trades count
        setTrades((prev) => [...prev, ...Array(importedCount)]);
      } catch (err: any) {
        setImportError(err.message || "Failed parsing CSV data. Please match columns.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Reports & CSV Importer
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Compile PDF summaries, download spreadsheet data, or import historical records from MT4, MT5, or Bybit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compilation downloads */}
        <div className="glass-card rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Generate Performance Reports
          </h2>
          <p className="text-xs text-gray-400 leading-normal">
            Download summaries compiling accuracy ratios, cumulative gross realization, and extremum wins/losses.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {["Weekly", "Monthly", "Yearly"].map((cycle) => (
              <button
                key={cycle}
                onClick={() => handleGeneratePDF(cycle as any)}
                disabled={pdfGenerating || trades.length === 0}
                className="py-3 bg-[#090f1d] hover:bg-gray-800 border border-gray-800 rounded-lg text-xs font-semibold text-gray-300 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <FileText className="h-4.5 w-4.5 text-blue-400" />
                <span>{cycle} PDF</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-800">
            <button
              onClick={handleExportCSV}
              disabled={trades.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Download className="h-4.5 w-4.5" /> Export All to CSV / Excel
            </button>
          </div>
        </div>

        {/* CSV Importer */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Import CSV History Records
          </h2>
          <p className="text-xs text-gray-400 leading-normal">
            Select a CSV containing headers: <strong>market, direction, entry price, exit price</strong> (and optionally <em>quantity, status</em>) to batch-import historical trades.
          </p>

          {importSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-3 text-emerald-400 text-xs font-semibold">
              <CheckCircle className="h-4 w-4" /> Successfully imported {importCount} trade logs!
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/25 p-3 text-red-400 text-xs font-semibold">
              <AlertCircle className="h-4 w-4" /> {importError}
            </div>
          )}

          <label className="flex flex-col items-center justify-center border border-dashed border-gray-800 hover:border-blue-500 hover:bg-blue-500/5 rounded-xl p-6 cursor-pointer text-gray-500 transition-all">
            <Upload className="h-8 w-8 mb-2 text-gray-400" />
            <span className="text-xs font-semibold text-gray-300">Select file to parse</span>
            <span className="text-[10px] text-gray-500 mt-1">supports CSV formatting</span>
            <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
