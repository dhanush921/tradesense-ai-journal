"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = ["/login", "/signup", "/forgot-password"].includes(pathname);

  useEffect(() => {
    if (!loading) {
      if (!user && !isAuthRoute) {
        router.push("/login");
      } else if (user && isAuthRoute) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, pathname, router, isAuthRoute]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#030712] text-gray-100">
        <div className="relative flex items-center justify-center">
          {/* Pulsing ring */}
          <div className="absolute h-16 w-16 animate-pulse rounded-full border-2 border-blue-500/20" />
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-gray-400">Loading TradeSense AI...</p>
      </div>
    );
  }

  // If unauthorized and trying to access private page, hide flash content
  if (!user && !isAuthRoute) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030712]" />
    );
  }

  // If authorized and trying to access auth pages, hide flash content
  if (user && isAuthRoute) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030712]" />
    );
  }

  return <>{children}</>;
};
