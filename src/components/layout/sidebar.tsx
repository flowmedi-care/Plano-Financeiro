"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

const STORAGE_KEY = "sidebar-collapsed";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cartao/importar", label: "Importar fatura", icon: CreditCard },
  { href: "/cartao/transacoes", label: "Transações", icon: Wallet },
  { href: "/planejamento", label: "Planejamento", icon: Wallet },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2 py-4" : "justify-between gap-2 p-4"
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-white">Plano Financeiro</h1>
            <p className="mt-1 truncate text-xs text-sidebar-foreground/70">{userEmail}</p>
          </div>
        ) : (
          <span className="text-sm font-bold text-white" title="Plano Financeiro">
            PF
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="shrink-0 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {mounted && collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                "flex items-center rounded-lg py-2 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{link.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
              collapsed ? "justify-center px-2" : "justify-start"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>Sair</span> : null}
          </Button>
        </form>
      </div>
    </aside>
  );
}
