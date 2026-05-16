"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  percent?: number;
  color: "blue" | "purple" | "amber" | "green" | "red";
}

const colorMap = {
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   bar: "bg-blue-500" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-500" },
  amber:  { bg: "bg-amber-500/10",  text: "text-amber-400",  bar: "bg-amber-500" },
  green:  { bg: "bg-green-500/10",  text: "text-green-400",  bar: "bg-green-500" },
  red:    { bg: "bg-red-500/10",    text: "text-red-400",    bar: "bg-red-500" },
};

export function MetricCard({ title, value, subtitle, icon, percent, color }: MetricCardProps) {
  const c = colorMap[color];
  const pct = Math.min(100, Math.max(0, percent ?? 0));

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={cn("p-2 rounded-lg", c.bg, c.text)}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {percent !== undefined && (
        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", c.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}
    </motion.div>
  );
}
