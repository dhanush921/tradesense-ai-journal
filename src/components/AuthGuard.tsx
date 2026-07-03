"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  // Treat root "/" as an auth route so it never triggers the loading spinner
  const isPublicRoute = isAuthRoute || pathname === "/";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user && !isPublicRoute) {
      router.replace("/login");
    } else if (user && isAuthRoute) {
      router.replace("/dashboard");
    }
  }, [user, loading, mounted, pathname, router, isAuthRoute, isPublicRoute]);

  // Before hydration: render plain dark shell — no spinner, no flicker
  if (!mounted) {
    return <div className="min-h-screen bg-[#030712]" />;
  }

  // Show spinner ONLY for protected routes while Firebase resolves auth state
  if (loading && !isPublicRoute) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#030712]">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 animate-pulse rounded-full border-2 border-blue-500/20" />
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-gray-400">
          Loading TradeSense AI...
        </p>
      </div>
    );
  }

  // Auth routes: render immediately — login/signup should never be blocked
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Root "/" redirect page: render immediately
  if (pathname === "/") {
    return <>{children}</>;
  }

  // Protected route but not yet authenticated: blank while redirecting
  if (!user && !isPublicRoute) {
    return <div className="min-h-screen bg-[#030712]" />;
  }

  return <>{children}</>;
};
