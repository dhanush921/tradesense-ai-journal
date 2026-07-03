"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Plus, Trash2, Bell, AlertCircle, TrendingUp, Check, ExternalLink } from "lucide-react";

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

export default function Watchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [mounted, setMounted] = useState(false);
 
  useEffect(() => {
    setMounted(true);
  }, []);
 
  // Form State
  const [symbol, setSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState("");
  const [alertPrice, setAlertPrice] = useState("");

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !symbol) return;
    setSaveLoading(true);

    const newItem: WatchlistItem = {
      userId: user.uid,
      symbol: symbol.toUpperCase().replace("/", ""),
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

  // Safe TradingView Chart URL Generator
  const getTvWidgetUrl = (sym: string) => {
    // Format symbols: BINANCE:BTCUSDT, NASDAQ:AAPL, FX:EURUSD
    let formattedSym = sym.toUpperCase();
    if (!formattedSym.includes(":")) {
      if (formattedSym === "EURUSD" || formattedSym === "GBPUSD") {
        formattedSym = `FX:${formattedSym}`;
      } else if (formattedSym === "AAPL" || formattedSym === "TSLA" || formattedSym === "MSFT") {
        formattedSym = `NASDAQ:${formattedSym}`;
      } else {
        formattedSym = `BINANCE:${formattedSym}`;
      }
    }
    return `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${formattedSym}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=070b18&theme=dark`;
  };

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

        {/* Right Column: Embedded TradingView Widget */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5 flex flex-col justify-between min-h-[480px]">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
              <h3 className="text-sm font-bold text-gray-200">
                Interactive Chart: <strong className="text-blue-400">{selectedSymbol}</strong>
              </h3>
            </div>
            <a
              href={`https://www.tradingview.com/symbols/${selectedSymbol}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1.5"
            >
              TradingView <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex-1 w-full bg-gray-950 rounded-lg overflow-hidden border border-gray-800 relative">
            {mounted ? (
              <iframe
                src={getTvWidgetUrl(selectedSymbol)}
                className="w-full h-full border-none absolute inset-0"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950 text-gray-500 text-xs">
                Loading TradingView Chart...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
