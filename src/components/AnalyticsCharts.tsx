"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export function EquityCurveChart({ data }: { data: any[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} tickFormatter={(val) => `$${val}`} />
          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Area type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DrawdownCurveChart({ data }: { data: any[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} tickFormatter={(val) => `${val}%`} />
          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDD)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WinLossPieChart({ data }: { data: any[] }) {
  return (
    <div className="h-48 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StrategyBarChart({ data }: { data: any[] }) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Bar dataKey="profit" fill="#818cf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekdayBarChart({ data }: { data: any[] }) {
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Bar dataKey="profit" fill="#fbbf24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AssetBarChart({ data }: { data: any[] }) {
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
