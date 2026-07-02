"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import SearchPalette from "@/components/SearchPalette";
import { Search, Bell } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl + K Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#030712]">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top Header bar with global search triggers */}
        <header className="hidden md:flex h-14 items-center justify-between px-8 bg-[#030712] border-b border-gray-800/40 sticky top-0 z-20">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-[#090f1d] hover:bg-gray-800/40 border border-gray-800 text-gray-500 rounded-lg text-xs font-medium cursor-pointer transition-colors max-w-xs w-64 text-left"
          >
            <Search className="h-4 w-4" />
            <span className="flex-grow">Search (Ctrl + K)</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-gray-900 border border-gray-800 text-[10px] rounded text-gray-400">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-3">
            <button className="p-1.5 bg-[#090f1d] hover:bg-gray-800 border border-gray-800 rounded-lg text-gray-400 hover:text-white cursor-pointer relative">
              <Bell className="h-4.5 w-4.5" />
              {/* Optional notification dot */}
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-grow p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Search Dialog palette */}
      <SearchPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
