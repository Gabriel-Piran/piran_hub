"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLeadsChart } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const SERIES = [
  { key: "recebidos", label: "Recebidos", color: "#c9a84c" },
  { key: "qualificados", label: "Qualificados", color: "#6b7280" },
  { key: "contratos", label: "Contratos", color: "#374151" },
] as const;

export function LeadsChart() {
  const { chart, isLoading } = useLeadsChart(7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-white/80">
        Leads dos últimos 7 dias
      </h2>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="data"
                stroke="rgba(255,255,255,0.4)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f0f0f",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
              />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={series.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
