"use client";

import React, { useState, useEffect } from "react";
import { Check, Crown, Zap, Star, Rocket, X, Loader2, BadgeCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    icon: Star,
    gradient: "from-gray-600 to-gray-700",
    borderColor: "border-gray-700/50",
    badgeColor: "bg-gray-800 text-gray-300",
    ctaClass: "bg-gray-800 hover:bg-gray-700 text-gray-200 cursor-default",
    features: [
      "Up to 50 trades",
      "Basic analytics dashboard",
      "Trade journal",
      "Manual trade entry",
      "Basic performance metrics",
      "Mobile responsive",
    ],
    missing: ["AI analysis", "Pine Script charts", "Advanced analytics", "Demo account", "Priority support"],
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: { monthly: 299, yearly: 249 },
    icon: Zap,
    gradient: "from-blue-600 to-blue-700",
    borderColor: "border-blue-700/40",
    badgeColor: "bg-blue-500/10 text-blue-400",
    ctaClass: "bg-blue-600 hover:bg-blue-500 text-white",
    features: [
      "Unlimited trades",
      "Performance dashboard",
      "Full trade journal",
      "Basic analytics",
      "Psychology tracker",
      "Goal tracking",
      "Watchlist (up to 20)",
      "Demo + Real account",
    ],
    missing: ["AI trade analysis", "Pine Script charts", "Advanced analytics", "Priority support"],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: { monthly: 799, yearly: 599 },
    icon: Rocket,
    gradient: "from-violet-600 to-purple-700",
    borderColor: "border-violet-500/40",
    badgeColor: "bg-violet-500/10 text-violet-400",
    ctaClass: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white",
    features: [
      "Everything in Basic",
      "AI trade analysis (GPT-4)",
      "Pine Script chart view",
      "Advanced analytics",
      "Broker data import",
      "AI Coach (unlimited)",
      "Backtesting insights",
      "Risk management alerts",
      "Unlimited watchlist",
      "Export to PDF/CSV",
    ],
    missing: ["Portfolio tracking", "Custom strategy builder", "Priority support"],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: { monthly: 1999, yearly: 1499 },
    icon: Crown,
    gradient: "from-yellow-500 to-amber-600",
    borderColor: "border-yellow-500/40",
    badgeColor: "bg-yellow-500/10 text-yellow-400",
    ctaClass: "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold",
    features: [
      "Everything in Pro",
      "Portfolio tracking",
      "Custom strategy builder",
      "Pine Script editor",
      "Custom reports & analytics",
      "Multi-account management",
      "API access",
      "Priority support (24/7)",
      "Early access to new features",
      "Dedicated account manager",
    ],
    missing: [],
    popular: false,
  },
];

export default function PremiumPage() {
  const { user, userSettings, refreshSettings } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const currentPlan = userSettings?.plan || "free";
  const planExpiry = userSettings?.planExpiresAt;

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      showToast("error", "Please log in to subscribe.");
      return;
    }
    if (planId === "free" || planId === currentPlan) return;

    setLoadingPlan(planId);
    try {
      // 1. Create order on backend
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          billing,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // 2. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TradeSense AI Journal",
        description: `${orderData.planName} — ${billing === "yearly" ? "Yearly" : "Monthly"}`,
        order_id: orderData.orderId,
        prefill: {
          email: user.email || "",
          name: user.displayName || "",
        },
        theme: { color: "#3b82f6" },
        modal: { backdropclose: false },
        handler: async (response: any) => {
          // 3. Verify payment on backend
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
                plan: planId,
                billing,
                amount: orderData.amount,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

            // 4. Write plan to Firestore from client (browser) — avoids Node.js SDK issues
            const planExpiry = new Date(verifyData.expiresAt);
            const settingsRef = doc(db, "settings", user.uid);
            const snap = await getDoc(settingsRef);
            const planData = {
              plan: planId,
              planBilling: billing,
              planActivatedAt: new Date().toISOString(),
              planExpiresAt: planExpiry.toISOString(),
              lastPaymentId: response.razorpay_payment_id,
              lastOrderId: response.razorpay_order_id,
              lastPaymentAmount: orderData.amount,
            };
            if (snap.exists()) {
              await updateDoc(settingsRef, planData);
            } else {
              await setDoc(settingsRef, { userId: user.uid, ...planData });
            }

            // 5. Log payment record
            await setDoc(doc(db, "payments", response.razorpay_payment_id), {
              userId: user.uid,
              userEmail: user.email,
              plan: planId,
              billing,
              amount: orderData.amount,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              status: "captured",
              paidAt: new Date().toISOString(),
            });

            await refreshSettings();
            showToast("success", `🎉 ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan activated! Welcome aboard.`);
          } catch (err: any) {
            showToast("error", err.message || "Payment verification failed. Contact support.");
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        "modal.ondismiss": () => {},
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay failed to load. Check your internet connection.");
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        showToast("error", `Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      showToast("error", err.message || "Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border max-w-sm ${
            toast.type === "success"
              ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200"
              : "bg-red-900/90 border-red-500/40 text-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <BadgeCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          )}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Current Plan Banner */}
      {currentPlan !== "free" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
          <BadgeCheck className="h-5 w-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-300">
              You are on the <span className="capitalize">{currentPlan}</span> plan
            </p>
            {planExpiry && (
              <p className="text-xs text-gray-400 mt-0.5">
                Renews on {new Date(planExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-xs font-semibold mb-4">
          <Crown className="h-3.5 w-3.5" />
          TradeSense AI Plans
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Choose Your{" "}
          <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
            Trading Edge
          </span>
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
          From beginner traders to professional fund managers — TradeSense AI has a plan for every level.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm font-medium ${billing === "monthly" ? "text-white" : "text-gray-500"}`}>Monthly</span>
          <button
            onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${billing === "yearly" ? "bg-emerald-600" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${billing === "yearly" ? "translate-x-6" : ""}`} />
          </button>
          <span className={`text-sm font-medium ${billing === "yearly" ? "text-white" : "text-gray-500"}`}>Yearly</span>
          {billing === "yearly" && (
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">Save up to 25%</span>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const price = billing === "monthly" ? plan.price.monthly : plan.price.yearly;
          const isCurrentPlan = currentPlan === plan.id;
          const isLoading = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border ${plan.borderColor} bg-[#0d1117] p-5 transition-all ${
                plan.popular ? "ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/10" : ""
              } ${isCurrentPlan ? "ring-2 ring-emerald-500/40" : ""}`}
            >
              {plan.popular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-md">
                    Most Popular
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-md flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" /> Active Plan
                  </span>
                </div>
              )}

              {/* Icon & name */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr ${plan.gradient}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${plan.badgeColor}`}>
                    {plan.id === "free" ? "Forever free" : plan.id === "premium" ? "Best value" : `${plan.name} plan`}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5 pb-5 border-b border-gray-800">
                {price === 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">₹0</span>
                    <span className="text-gray-500 text-sm">/forever</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">₹{price.toLocaleString("en-IN")}</span>
                      <span className="text-gray-500 text-sm">/mo</span>
                    </div>
                    {billing === "yearly" && (
                      <p className="text-xs text-emerald-400 mt-0.5">₹{(price * 12).toLocaleString("en-IN")} billed yearly</p>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2.5 mb-5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300">{f}</span>
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-start gap-2 opacity-35">
                    <X className="h-3.5 w-3.5 text-gray-600 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-500 line-through">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading || plan.id === "free" || isCurrentPlan}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  isCurrentPlan
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                    : plan.id === "free"
                    ? "bg-gray-800 text-gray-400 cursor-default"
                    : `${plan.ctaClass} cursor-pointer`
                } disabled:opacity-60`}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : isCurrentPlan ? (
                  <><BadgeCheck className="h-4 w-4" /> Current Plan</>
                ) : plan.id === "free" ? (
                  "Free Forever"
                ) : (
                  `Get ${plan.name} →`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="mt-10 text-center">
        <p className="text-gray-500 text-xs mb-4">
          All prices are in Indian Rupees (INR) · Secure payment via Razorpay · Cancel anytime
        </p>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {["No hidden fees", "14-day money back", "Cancel anytime", "Secure & encrypted", "UPI / Cards / Net Banking"].map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-xs text-gray-400">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              {item}
            </div>
          ))}
        </div>

        {/* Razorpay badge */}
        <p className="text-gray-600 text-[10px] mt-4">
          🔒 Powered by Razorpay · PCI DSS Compliant · 100% Secure
        </p>
      </div>
    </div>
  );
}
