"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useRecentMessages } from "@/hooks/useDashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

export function RecentActivity() {
  const { messages, isLoading } = useRecentMessages();

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      <h2 className="mb-3 text-sm font-semibold text-white/80">
        Atividade recente
      </h2>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}

        {!isLoading &&
          messages.map((message, i) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="flex items-start gap-3"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback>{initials(message.lead_nome)}</AvatarFallback>
              </Avatar>

              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {message.lead_nome}
                  </p>
                  <Badge
                    variant={message.instancia === "ads" ? "ads" : "indicacoes"}
                  >
                    {message.instancia}
                  </Badge>
                </div>
                <p className="text-xs text-white/50">
                  {truncate(message.conteudo, 60)}
                </p>
                <p className="text-[11px] text-white/30">
                  {formatDistanceToNow(new Date(message.enviado_em), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
