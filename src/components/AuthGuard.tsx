"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublicRoute = isAuthRoute || pathname === "/";

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicRoute && !redirected.current) {
      redirected.current = true;
      router.replace("/login");
    } else if (user && isAuthRoute && !redirected.current) {
      redirected.current = true;
      router.replace("/dashboard");
    }
  }, [user, loading, pathname, router, isAuthRoute, isPublicRoute]);

  // Show minimal spinner ONLY for protected routes while Firebase resolves
  if (loading && !isPublicRoute) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030712]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Auth / public routes: render immediately
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected route but user not resolved yet: show children (already guarded by loading above)
  return <>{children}</>;
};
