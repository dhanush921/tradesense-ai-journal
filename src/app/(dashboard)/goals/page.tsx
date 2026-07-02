"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Plus, Trash2, Target, Award, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

interface Goal {
  id?: string;
  userId: string;
  type: "daily" | "weekly" | "monthly";
  targetAmount: number;
  currentAmount: number;
  maxDrawdown: number; // percentage
  riskGoal: number; // percentage per trade
  consistencyGoal: number; // win rate percentage
  status: "active" | "achieved" | "failed";
  createdAt: string;
}

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form State
  const [type, setType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [maxDrawdown, setMaxDrawdown] = useState("5");
  const [riskGoal, setRiskGoal] = useState("1");
  const [consistencyGoal, setConsistencyGoal] = useState("60");

  const fetchGoals = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "goals"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const items: Goal[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Goal);
      });
      setGoals(items);
    } catch (e) {
      console.error("Error fetching goals:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetAmount) return;
    setSaveLoading(true);

    const newItem: Goal = {
      userId: user.uid,
      type,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: parseFloat(currentAmount) || 0,
      maxDrawdown: parseFloat(maxDrawdown) || 5,
      riskGoal: parseFloat(riskGoal) || 1,
      consistencyGoal: parseFloat(consistencyGoal) || 60,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "goals"), newItem);
      setGoals((prev) => [...prev, { id: docRef.id, ...newItem }]);
      setTargetAmount("");
      setCurrentAmount("");
      setMaxDrawdown("5");
      setRiskGoal("1");
      setConsistencyGoal("60");
    } catch (e) {
      console.error("Error adding goal:", e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "goals", id));
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      console.error("Error deleting goal:", e);
    }
  };

  const handleUpdateProgress = async (id: string, amount: number, target: number) => {
    const nextAmount = amount + 50; // increment helper
    const status = nextAmount >= target ? "achieved" : "active";
    try {
      await updateDoc(doc(db, "goals", id), { currentAmount: nextAmount, status });
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, currentAmount: nextAmount, status } : g))
      );
    } catch (e) {
      console.error("Error updating goal:", e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Trading Objectives & Goals
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Establish profit targets, regulate maximum drawdowns, and monitor consistent win ratios.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Create Goal Form */}
        <form onSubmit={handleAdd} className="glass-card rounded-xl p-5 space-y-4 h-fit">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
            Create New Objective
          </h2>
          <div>
            <label className="block text-[10px] text-gray-500 font-semibold mb-1">Goal Cycle</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="glass-input w-full py-1.5 text-xs bg-[#0b0f1d]"
            >
              <option value="daily">Daily Target</option>
              <option value="weekly">Weekly Target</option>
              <option value="monthly">Monthly Target</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Profit Target ($)</label>
              <input
                type="number"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 1000"
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Start Value ($)</label>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="e.g. 0"
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] text-gray-500 font-semibold mb-1">Max DD (%)</label>
              <input
                type="number"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 font-semibold mb-1">Risk/Tr (%)</label>
              <input
                type="number"
                value={riskGoal}
                onChange={(e) => setRiskGoal(e.target.value)}
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 font-semibold mb-1">Win Rate (%)</label>
              <input
                type="number"
                value={consistencyGoal}
                onChange={(e) => setConsistencyGoal(e.target.value)}
                className="glass-input w-full py-1.5 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saveLoading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {saveLoading ? "Adding..." : "Add Goal"}
          </button>
        </form>

        {/* Right Columns: Active Goals Grid */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Active Objectives</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : goals.length === 0 ? (
            <div className="border border-gray-800 rounded-xl p-12 text-center bg-[#070b18]/25">
              <Target className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-xs text-gray-500">No active goals configured. Setup profit targets on the left form.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {goals.map((g) => {
                const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                const isAchieved = g.status === "achieved";
                return (
                  <div key={g.id} className="glass-card rounded-xl p-5 border border-gray-800/80 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-400">{g.type} Objective</span>
                        <h3 className="text-base font-bold text-gray-200 mt-0.5">
                          Reach ${g.targetAmount.toLocaleString()} Profit Target
                        </h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isAchieved ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                      }`}>
                        {g.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1">
                        <span>Progress: {pct.toFixed(0)}%</span>
                        <span>${g.currentAmount} / ${g.targetAmount}</span>
                      </div>
                      <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Rules/Safeguards */}
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-800/60 pt-3 text-[10px] text-gray-500">
                      <div>
                        <span>Max Drawdown Limit:</span>
                        <strong className="block text-gray-300 font-bold mt-0.5">{g.maxDrawdown}% Max</strong>
                      </div>
                      <div>
                        <span>Max Risk Per Trade:</span>
                        <strong className="block text-gray-300 font-bold mt-0.5">{g.riskGoal}% Max</strong>
                      </div>
                      <div>
                        <span>Consistency Win Rate:</span>
                        <strong className="block text-gray-300 font-bold mt-0.5">{g.consistencyGoal}% Min</strong>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-800/60 pt-3">
                      <button
                        onClick={() => g.id && handleDelete(g.id)}
                        className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove Goal
                      </button>

                      {!isAchieved && (
                        <button
                          onClick={() => g.id && handleUpdateProgress(g.id, g.currentAmount, g.targetAmount)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Log +$50 Profit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
