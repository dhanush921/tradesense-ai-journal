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
} from "recharts";

interface DashboardChartProps {
  data: any[];
}

export default function DashboardChart({ data }: DashboardChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(val) => `$${val.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
            }}
            labelClassName="text-gray-400 font-semibold"
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorEquity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
