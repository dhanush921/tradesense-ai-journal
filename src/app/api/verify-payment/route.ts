import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      billing,
      amount,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    // Verify HMAC signature server-side (prevents payment fraud)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Payment signature invalid — possible fraud attempt" },
        { status: 400 }
      );
    }

    // Signature verified ✓
    // Firestore update is handled client-side after this response
    const planExpiry = new Date();
    if (billing === "yearly") {
      planExpiry.setFullYear(planExpiry.getFullYear() + 1);
    } else {
      planExpiry.setMonth(planExpiry.getMonth() + 1);
    }

    return NextResponse.json({
      success: true,
      plan,
      billing,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount,
      expiresAt: planExpiry.toISOString(),
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
