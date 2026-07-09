"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { useSession } from "@/hooks/useSession";
import type { Perfil } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import useSWR from "swr";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; roles: Perfil[] }[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "advogado"],
  },
  {
    href: "/dashboard/leads",
    label: "Leads",
    icon: Users,
    roles: ["admin", "advogado", "secretaria", "estagio"],
  },
  {
    href: "/dashboard/conversas",
    label: "Conversas",
    icon: MessageSquare,
    roles: ["admin", "advogado", "secretaria", "estagio"],
  },
  {
    href: "/dashboard/contratos",
    label: "Contratos",
    icon: FileText,
    roles: ["admin", "advogado"],
  },
  {
    href: "/dashboard/aline",
    label: "Aline",
    icon: Sparkles,
    roles: ["admin", "advogado"],
  },
  {
    href: "/dashboard/configuracoes",
    label: "Configurações",
    icon: Settings,
    roles: ["admin"],
  },
];

function initials(name: string | null | undefined): string {
  const parts = String(name || "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();

  // Check if there are errors in the followup queue
  const { data: errorItems } = useSWR(
    user?.perfil === "admin" ? "/api/followup/fila?status=erro" : null,
    (url) => fetch(url).then((r) => r.json()).catch(() => []),
    { refreshInterval: 15000 }
  );
  const hasError = Array.isArray(errorItems) && errorItems.length > 0;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const visibleItems = user
    ? NAV_ITEMS.filter((item) => item.roles.includes(user.perfil))
    : [];

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "group fixed inset-y-0 left-0 z-40 flex w-16 flex-col overflow-hidden",
          "border-r border-white/5 bg-[#111111] transition-all duration-200 ease-out hover:w-60"
        )}
      >
        <div className="flex h-16 shrink-0 items-center px-4">
          <span className="text-xl font-bold tracking-tight text-[#c9a84c]">
            PH
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#c9a84c]/10 text-[#c9a84c]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.href === "/dashboard/configuracoes" && hasError && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 flex-1">
                      {item.label}
                    </span>
                    {item.href === "/dashboard/configuracoes" && hasError && (
                      <span className="hidden group-hover:inline-block rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                        erro
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-white/5 px-2 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/perfil"
                className={cn(
                  "flex items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-white/5",
                  pathname === "/dashboard/perfil" && "bg-[#c9a84c]/10"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>
                    {user ? initials(user.nome) : "..."}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate whitespace-nowrap text-sm text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  {user?.nome ?? "Carregando..."}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Meu perfil</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-red-400"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  Sair
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
