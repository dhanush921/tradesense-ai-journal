"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade } from "@/lib/tradeUtils";
import { Search, X, BookOpen, Compass, Tag, FileText } from "lucide-react";

export default function SearchPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const fetchSearchData = async () => {
      if (!user || !isOpen) return;
      try {
        const q = query(collection(db, "trades"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        const fetched: Trade[] = [];
        snap.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() } as Trade);
        });
        setTrades(fetched);
      } catch (e) {
        console.error("Search fetch error:", e);
      }
    };
    fetchSearchData();
  }, [user, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Search filter categorizer
  const term = searchTerm.toLowerCase().trim();
  
  const results = {
    trades: [] as Trade[],
    markets: [] as string[],
    strategies: [] as string[],
    tags: [] as string[],
  };

  if (term.length > 0) {
    const marketSet = new Set<string>();
    const stratSet = new Set<string>();
    const tagSet = new Set<string>();

    trades.forEach((t) => {
      if (t.title.toLowerCase().includes(term) || (t.notes || "").toLowerCase().includes(term)) {
        results.trades.push(t);
      }
      if (t.market.toLowerCase().includes(term)) {
        marketSet.add(t.market);
      }
      if (t.strategyUsed && t.strategyUsed.toLowerCase().includes(term)) {
        stratSet.add(t.strategyUsed);
      }
      t.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(term)) {
          tagSet.add(tag);
        }
      });
    });

    results.markets = Array.from(marketSet);
    results.strategies = Array.from(stratSet);
    results.tags = Array.from(tagSet);
  }

  const handleSelectResult = (type: string, value: string) => {
    onClose();
    // Redirect to journal with search parameter
    router.push(`/journal?search=${encodeURIComponent(value)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm pt-[15vh]">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#070b18] border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh]">
        {/* Search Input bar */}
        <div className="flex items-center gap-3 p-3.5 border-b border-gray-800/80">
          <Search className="h-5 w-5 text-gray-500" />
          <input
            type="text"
            autoFocus
            placeholder="Search trades, markets, strategies, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-grow overflow-y-auto p-3 space-y-4 text-xs scrollbar-hide">
          {term.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Type to search your trading records...</p>
          ) : Object.values(results).every((arr) => arr.length === 0) ? (
            <p className="text-gray-500 text-center py-8">No results matching "{searchTerm}"</p>
          ) : (
            <>
              {/* Markets */}
              {results.markets.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-600 px-2 block mb-1">Markets</span>
                  {results.markets.map((m) => (
                    <div
                      key={m}
                      onClick={() => handleSelectResult("market", m)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-800/40 text-gray-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <Compass className="h-4 w-4 text-blue-500" />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Strategies */}
              {results.strategies.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-600 px-2 block mb-1">Strategies</span>
                  {results.strategies.map((s) => (
                    <div
                      key={s}
                      onClick={() => handleSelectResult("strategy", s)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-800/40 text-gray-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-purple-500" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {results.tags.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-600 px-2 block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-2 p-2">
                    {results.tags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => handleSelectResult("tag", tag)}
                        className="px-2.5 py-1 bg-gray-900 border border-gray-800 hover:border-blue-500 text-gray-300 rounded-full cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Tag className="h-3 w-3 text-emerald-500" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trades */}
              {results.trades.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-600 px-2 block mb-1">Trades & Notes</span>
                  {results.trades.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => t.id && handleSelectResult("trade", t.title)}
                      className="flex items-start gap-2.5 p-2 hover:bg-gray-800/40 text-gray-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <FileText className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">{t.title}</div>
                        <div className="text-[10px] text-gray-500">{t.market} • {t.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
