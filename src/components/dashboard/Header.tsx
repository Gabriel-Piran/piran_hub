"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Search } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/leads": "Leads",
  "/dashboard/conversas": "Conversas",
  "/dashboard/contratos": "Contratos",
  "/dashboard/configuracoes": "Configurações",
  "/dashboard/configuracoes/usuarios": "Usuários",
  "/dashboard/perfil": "Meu Perfil",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#c9a84c] text-[10px] font-semibold text-[#0f0f0f]">
            3
          </span>
        </button>

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
