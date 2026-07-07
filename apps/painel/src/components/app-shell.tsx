"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, LayoutDashboard, MessageSquare, CalendarDays, Users, Sparkles, Repeat, Settings, LogOut } from "lucide-react";
import { clearSession } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";

type NavItem = { to: string; label: string; icon: React.ReactNode };

const overview: NavItem[] = [
  { to: "/", label: "Visão geral", icon: <LayoutDashboard className="h-4 w-4" /> },
];
const operation: NavItem[] = [
  { to: "/atendimento", label: "Atendimento", icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/agenda", label: "Agenda", icon: <CalendarDays className="h-4 w-4" /> },
  { to: "/pacientes", label: "Pacientes", icon: <Users className="h-4 w-4" /> },
];
const intelligence: NavItem[] = [
  { to: "/assistente", label: "Assistente (IA)", icon: <Sparkles className="h-4 w-4" /> },
  { to: "/automacoes", label: "Automações", icon: <Repeat className="h-4 w-4" /> },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  function isActive(to: string) {
    return to === "/" ? pathname === "/" : pathname.startsWith(to);
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  function NavLink({ item }: { item: NavItem }) {
    return (
      <Link
        href={item.to}
        className={[
          "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
          isActive(item.to)
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        ].join(" ")}
      >
        <span className={isActive(item.to) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}>
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  }

  const userName = user?.name ?? "Nutricionista";
  const userInitials = initials(userName);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-surface-2/40 px-3 py-6">
          <div className="mb-6 flex items-center gap-3 px-2">
            <Image src="/logo.png" alt="Frame System" width={28} height={26} className="shrink-0" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Frame System</div>
              <div className="text-[11px] text-muted-foreground">Painel do nutricionista</div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-1">
              {overview.map((i) => <NavLink key={i.to} item={i} />)}
            </div>
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Operação
              </div>
              {operation.map((i) => <NavLink key={i.to} item={i} />)}
            </div>
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Inteligência
              </div>
              {intelligence.map((i) => <NavLink key={i.to} item={i} />)}
            </div>
          </nav>

          <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
            <Link
              href="/configuracoes"
              className={[
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                isActive("/configuracoes")
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              ].join(" ")}
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>

            <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-secondary/60 px-3 py-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium">{userName}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {user?.specialty ?? "Nutricionista"}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar paciente, consulta, alimento..."
                className="h-9 w-full rounded-lg border border-border bg-surface-2/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push("/pacientes");
                }}
              />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
            </button>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
