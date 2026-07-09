"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  FileCheck2,
  LogOut,
  MessageSquare,
  Search,
  UserPlus,
} from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationTipo } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/leads": "Leads",
  "/dashboard/conversas": "Conversas",
  "/dashboard/contratos": "Contratos",
  "/dashboard/aline": "Aline",
  "/dashboard/configuracoes": "Configurações",
  "/dashboard/configuracoes/usuarios": "Usuários",
  "/dashboard/perfil": "Meu Perfil",
};

const NOTIFICATION_ICONS: Record<NotificationTipo, typeof UserPlus> = {
  lead: UserPlus,
  mensagem: MessageSquare,
  contrato: FileCheck2,
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, unseenCount, markAllSeen } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleToggleNotif = () => {
    setNotifOpen((open) => {
      const next = !open;
      if (next) markAllSeen();
      return next;
    });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 ml-16 flex h-16 items-center gap-4 border-b border-white/5 bg-[#0f0f0f]/90 px-6 backdrop-blur">
      <h1 className="shrink-0 text-lg font-semibold text-white">{title}</h1>

      <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          type="search"
          placeholder="Buscar leads, contratos..."
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="relative">
          <button
            onClick={handleToggleNotif}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {unseenCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9a84c] px-1 text-[10px] font-semibold text-[#0f0f0f]">
                {unseenCount > 9 ? "9+" : unseenCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <button
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Fechar notificações"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 flex max-h-96 w-80 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white/80">
                    Notificações
                  </p>
                </div>
                <div className="flex flex-col overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="p-4 text-center text-sm text-white/40">
                      Nenhuma notificação.
                    </p>
                  )}
                  {notifications.map((item) => {
                    const Icon = NOTIFICATION_ICONS[item.tipo];
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setNotifOpen(false)}
                        className={cn(
                          "flex items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/5"
                        )}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="text-sm font-medium text-white">
                            {item.titulo}
                          </p>
                          <p className="truncate text-xs text-white/50">
                            {item.descricao}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {item.data
                              ? formatDistanceToNow(new Date(item.data), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })
                              : ""}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
