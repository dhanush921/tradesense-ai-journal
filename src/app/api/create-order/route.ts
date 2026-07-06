import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const PLAN_PRICES: Record<string, { monthly: number; yearly: number; name: string }> = {
  basic:   { monthly: 29900,  yearly: 298800,  name: "TradeSense Basic"   },
  pro:     { monthly: 79900,  yearly: 718800,  name: "TradeSense Pro"     },
  premium: { monthly: 199900, yearly: 1798800, name: "TradeSense Premium" },
};

export async function POST(request: Request) {
  try {
    const { plan, billing, userId, userEmail } = await request.json();

    if (!plan || !billing || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const amount = billing === "yearly" ? planInfo.yearly : planInfo.monthly;

    const order = await razorpay.orders.create({
      amount,           // in paise (₹1 = 100 paise)
      currency: "INR",
      receipt: `receipt_${userId}_${plan}_${Date.now()}`,
      notes: {
        userId,
        userEmail: userEmail || "",
        plan,
        billing,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: planInfo.name,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
