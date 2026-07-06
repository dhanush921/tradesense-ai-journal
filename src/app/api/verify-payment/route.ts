import { NextResponse } from "next/server";
import crypto from "crypto";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      plan,
      billing,
      amount,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    // Verify HMAC signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Payment signature mismatch — possible fraud attempt" }, { status: 400 });
    }

    // Payment is verified ✓ — update user plan in Firestore
    const planExpiry = new Date();
    if (billing === "yearly") {
      planExpiry.setFullYear(planExpiry.getFullYear() + 1);
    } else {
      planExpiry.setMonth(planExpiry.getMonth() + 1);
    }

    const settingsRef = doc(db, "settings", userId);
    const settingsSnap = await getDoc(settingsRef);

    const planData = {
      plan,
      planBilling: billing,
      planActivatedAt: new Date().toISOString(),
      planExpiresAt: planExpiry.toISOString(),
      lastPaymentId: razorpay_payment_id,
      lastOrderId: razorpay_order_id,
      lastPaymentAmount: amount,
    };

    if (settingsSnap.exists()) {
      await updateDoc(settingsRef, planData);
    } else {
      await setDoc(settingsRef, { userId, ...planData });
    }

    // Log the payment in a separate payments collection
    await setDoc(doc(db, "payments", razorpay_payment_id), {
      userId,
      plan,
      billing,
      amount,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      status: "captured",
      paidAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, plan, billing, expiresAt: planExpiry.toISOString() });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}
