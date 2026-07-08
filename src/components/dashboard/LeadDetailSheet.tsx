"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Lead } from "@/types";
import { ESTAGIO_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface LeadDetailSheetProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ lead, onOpenChange }: LeadDetailSheetProps) {
  return (
    <Sheet open={lead !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        {lead && (
          <>
            <SheetHeader>
              <SheetTitle>{lead.nome}</SheetTitle>
              <SheetDescription>{ESTAGIO_LABELS[lead.estagio]}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase text-white/40">
                  WhatsApp
                </span>
                <span className="text-white">{lead.numero_whatsapp}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase text-white/40">
                  Origem
                </span>
                <Badge
                  variant={lead.instancia === "ads" ? "ads" : "indicacoes"}
                  className="w-fit"
                >
                  {lead.instancia}
                </Badge>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase text-white/40">
                  Última atualização
                </span>
                <span className="text-white">
                  {formatDistanceToNow(new Date(lead.atualizado_em), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
