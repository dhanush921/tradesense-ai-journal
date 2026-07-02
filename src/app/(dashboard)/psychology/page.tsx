"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, getDocs, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Smile, ShieldAlert, Award, Brain, Check, BarChart2, Heart } from "lucide-react";

export default function Psychology() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [psychLogs, setPsychLogs] = useState<any[]>([]);

  // Form State
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState(3); // 1-5
  const [focusLevel, setFocusLevel] = useState(4); // 1-5
  const [energyLevel, setEnergyLevel] = useState(4); // 1-5
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);

  const availableMoods = [
    "Confident",
    "Fear",
    "Greed",
    "FOMO",
    "Revenge Trading",
    "Disciplined",
    "Happy",
    "Frustrated",
  ];

  const fetchPsychLogs = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "psychology"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const logs: any[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      setPsychLogs(logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Error fetching psychology logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPsychLogs();
  }, [user]);

  const handleToggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveLoading(true);

    const logData = {
      userId: user.uid,
      date: new Date().toISOString().split("T")[0],
      mood: selectedMoods,
      sleepHours,
      stressLevel,
      focusLevel,
      energyLevel,
      notes,
      patternsDetected: getPatternWarning(selectedMoods, stressLevel, sleepHours),
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "psychology"), logData);
      setSuccess(true);
      setNotes("");
      setSelectedMoods([]);
      setSleepHours(7);
      setStressLevel(3);
      setFocusLevel(4);
      setEnergyLevel(4);
      await fetchPsychLogs();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error("Error saving log:", err);
      alert("Failed to save psychology log.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Automated pattern detection helper
  const getPatternWarning = (moods: string[], stress: number, sleep: number) => {
    const list = [];
    if (moods.includes("FOMO")) {
      list.push("FOMO alert: High likelihood of chasing prices. Wait for pullback confirmation.");
    }
    if (moods.includes("Revenge Trading")) {
      list.push("Revenge Trading warning: Step away from the screens immediately. Walk away.");
    }
    if (stress > 3) {
      list.push("Elevated Stress level: Reduce position sizes by 50% to ease mental pressure.");
    }
    if (sleep < 6) {
      list.push("Sleep deficit detected: Reduced reaction times. Avoid fast scalp set-ups today.");
    }
    if (moods.includes("Disciplined") && stress <= 2) {
      list.push("Optimal state: High discipline + low stress is your peak performance zone.");
    }
    return list.join(" | ");
  };

  // Derive global patterns/advices from history
  const getAggregatedInsights = () => {
    if (psychLogs.length === 0) return ["Log your daily mindset to activate aggregate AI pattern analysis."];
    const insights = [];
    const totalEntries = psychLogs.length;

    let totalSleep = 0;
    let highStressDays = 0;
    const moodCounts: Record<string, number> = {};

    psychLogs.forEach((log) => {
      totalSleep += log.sleepHours || 7;
      if ((log.stressLevel || 0) >= 4) highStressDays++;
      (log.mood || []).forEach((m: string) => {
        moodCounts[m] = (moodCounts[m] || 0) + 1;
      });
    });

    const avgSleep = totalSleep / totalEntries;
    if (avgSleep < 6.5) {
      insights.push("Sleep Deficit: Your historic sleep average is low. Sleep deficiency is highly correlated with FOMO and premature exits.");
    } else {
      insights.push(`Sleep Quality: You average ${avgSleep.toFixed(1)} hrs of sleep. Keep this up for cognitive focus.`);
    }

    const revengeCount = moodCounts["Revenge Trading"] || 0;
    if (revengeCount > 0) {
      insights.push(`Overtrading Alert: You have recorded Revenge Trading in ${((revengeCount / totalEntries) * 100).toFixed(0)}% of your recent sessions. Establish a rule to turn off your platform after 2 consecutive losses.`);
    }

    if (highStressDays / totalEntries > 0.4) {
      insights.push("Stress management: Over 40% of your logged days are high-stress. Consider moving to higher timeframes (H1/H4) which require less screen monitoring.");
    }

    return insights;
  };

  const insights = getAggregatedInsights();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Mindset & Psychology log
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Track emotional biases, focus indices, sleep ratios, and inspect automated pattern alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Form Entry */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-6">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-gray-800 pb-2">
              Log Today's Mental State
            </h2>

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-3 text-emerald-400 text-xs font-semibold">
                <Check className="h-4 w-4" /> Today's mindset recorded!
              </div>
            )}

            {/* Mood selector */}
            <div>
              <span className="block text-xs font-semibold text-gray-400 mb-2">Select Emotions felt today</span>
              <div className="flex flex-wrap gap-2">
                {availableMoods.map((mood) => {
                  const isSelected = selectedMoods.includes(mood);
                  const isWarningMood = ["Fear", "Greed", "FOMO", "Revenge Trading", "Frustrated"].includes(mood);
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => handleToggleMood(mood)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? isWarningMood
                            ? "bg-red-500/20 border-red-500/50 text-red-400"
                            : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : "bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex justify-between text-xs font-semibold text-gray-400 mb-1.5">
                  <span>Sleep Hours</span>
                  <span className="text-blue-400 font-bold">{sleepHours} hrs</span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="12"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="flex justify-between text-xs font-semibold text-gray-400 mb-1.5">
                  <span>Stress Level (1-5)</span>
                  <span className="text-blue-400 font-bold">{stressLevel} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="flex justify-between text-xs font-semibold text-gray-400 mb-1.5">
                  <span>Focus index (1-5)</span>
                  <span className="text-blue-400 font-bold">{focusLevel} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={focusLevel}
                  onChange={(e) => setFocusLevel(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="flex justify-between text-xs font-semibold text-gray-400 mb-1.5">
                  <span>Energy Index (1-5)</span>
                  <span className="text-blue-400 font-bold">{energyLevel} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Daily Mindset Journal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log any mental notes. How did losing a trade feel? Were rules respected?"
                rows={3}
                className="glass-input w-full text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveLoading ? "Saving state..." : "Save Today's Mindset"}
            </button>
          </form>
        </div>

        {/* Right Column: AI psychology insights & history */}
        <div className="space-y-6">
          {/* Insights Box */}
          <div className="glass-panel rounded-xl p-5 border border-blue-500/15">
            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
              <Brain className="h-4.5 w-4.5 text-blue-400 animate-pulse" /> AI Psychology Insights
            </h3>
            <div className="space-y-4">
              {insights.map((insight, i) => (
                <div key={i} className="flex gap-2 text-xs leading-relaxed text-gray-300">
                  <Heart className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* History log list */}
          <div className="glass-card rounded-xl p-5 max-h-[350px] overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">History logs</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : psychLogs.length === 0 ? (
              <p className="text-[11px] text-gray-500 text-center py-4">No logged mindsets yet.</p>
            ) : (
              <div className="space-y-3">
                {psychLogs.map((log) => (
                  <div key={log.id} className="border-b border-gray-800/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold mb-1">
                      <span>{log.date}</span>
                      <span>Sleep: {log.sleepHours}h • Stress: {log.stressLevel}/5</span>
                    </div>
                    {log.mood && log.mood.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {log.mood.map((m: string) => (
                          <span key={m} className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[9px]">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 leading-normal line-clamp-2">
                      {log.notes}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
