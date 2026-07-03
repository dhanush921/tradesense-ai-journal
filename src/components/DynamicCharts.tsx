"use client";

/**
 * DynamicCharts.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * All recharts components are re-exported from a single lazy-loaded boundary.
 * Import from this file instead of "recharts" directly in page components so
 * the entire ~500 KB recharts bundle is code-split into one shared chunk that
 * is only downloaded when a chart actually needs to render.
 *
 * Usage:
 *   import dynamic from "next/dynamic";
 *   const { AreaChart, ... } = ... ← handled for you below via named exports
 *
 * Because recharts exports are classes/functions (not default exports) we use
 * a thin wrapper approach: each chart type is its own dynamic() call so
 * Next.js tree-shakes unused chart types per-page.
 */

import dynamic from "next/dynamic";
import React from "react";

// Skeleton placeholder shown while the chart bundle is downloading
export const ChartSkeleton = ({ height = 256 }: { height?: number }) => (
  <div
    className="w-full animate-pulse rounded-lg bg-gray-800/30"
    style={{ height }}
  />
);

const opts = {
  ssr: false,
  loading: () => <ChartSkeleton />,
};

export const AreaChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.AreaChart })),
  opts
);
export const BarChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.BarChart })),
  opts
);
export const LineChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.LineChart })),
  opts
);
export const PieChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.PieChart })),
  opts
);

// Non-chart helpers — these are tiny so we re-export directly (no dynamic needed)
export {
  Area,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
