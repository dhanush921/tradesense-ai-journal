"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  PlusSquare,
  BarChart3,
  BrainCircuit,
  Eye,
  Target,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Compass,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Trade Journal", href: "/journal", icon: BookOpen },
    { name: "New Entry", href: "/trade-entry", icon: PlusSquare },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Psychology", href: "/psychology", icon: BrainCircuit },
    { name: "Watchlist", href: "/watchlist", icon: Eye },
    { name: "Goals", href: "/goals", icon: Target },
    { name: "AI Coach", href: "/ai-coach", icon: MessageSquare },
    { name: "Reports & Import", href: "/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Brand logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 shadow-md shadow-blue-500/10">
            <span className="text-sm font-bold text-white tracking-wider">TS</span>
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              TradeSense AI
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">
              Journal SaaS
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/10 to-emerald-500/5 text-blue-400 border-l-2 border-blue-500"
                    : "text-gray-400 hover:bg-gray-800/40 hover:text-gray-200"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile footer */}
      <div className="space-y-3 border-t border-gray-800/60 pt-4">
        <div className="flex items-center gap-3 px-2">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "Avatar"}
              className="h-9 w-9 rounded-full object-cover border border-gray-700"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-gray-700 to-gray-800 text-gray-300">
              <UserIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-200">
              {user?.displayName || "Trader"}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#070b18]/90 border-r border-gray-800/80 backdrop-blur-md z-30">
        {navContent}
      </aside>

      {/* Mobile Top Navbar */}
      <header className="flex md:hidden items-center justify-between h-14 px-4 bg-[#070b18]/95 border-b border-gray-800/80 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5">
            <span className="text-xs font-bold text-white">TS</span>
          </div>
          <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            TradeSense AI
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-gray-400 hover:text-white p-1 cursor-pointer"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar Drawer */}
          <aside className="relative flex w-64 max-w-xs flex-col bg-[#070b18] border-r border-gray-800 h-full animate-slide-in shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
