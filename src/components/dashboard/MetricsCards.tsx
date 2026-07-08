"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

import { useMetrics } from "@/hooks/useDashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricsCards() {
  const { metrics, isLoading, isError } = useMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="items-start gap-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, i) => {
        const isPositive = (metric.variacao ?? 0) >= 0;
        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/50">{metric.titulo}</p>
                  {isError && (
                    <AlertTriangle
                      className="h-3.5 w-3.5 text-amber-400"
                      aria-label="Dados de exemplo"
                    />
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-semibold text-white">
                    {metric.valor}
                  </span>
                  {metric.variacao !== undefined && metric.variacao !== 0 && (
                    <span
                      className={
                        "flex items-center gap-1 text-xs font-medium " +
                        (isPositive ? "text-emerald-400" : "text-red-400")
                      }
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {Math.abs(metric.variacao)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
