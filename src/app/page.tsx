"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for Firebase auth to resolve, then redirect appropriately
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Render nothing visible — redirect happens immediately after auth resolves
  // A dark background prevents any flash of unstyled content
  return <div className="min-h-screen bg-[#030712]" />;
}
