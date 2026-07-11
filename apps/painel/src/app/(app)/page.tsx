"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { ArrowUpRight, CalendarCheck, Users, MessageSquare, TrendingUp } from "lucide-react";

type Metrics = {
  total_clients: number;
  appointments_week: number;
  active_conversations: number;
  conversion_rate: number | null;
};

type Appointment = {
  id: string;
  client_name: string;
  scheduled_at: string;
  city: string | null;
  modality: string;
};

type ActivityItem = {
  type: "new_lead" | "appointment";
  occurred_at: string;
  client_name: string | null;
  client_phone: string;
};

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function todayPtBR() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function Home() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [metricsRes, apptsRes, activityRes] = await Promise.all([
        api.get<{ metrics: Metrics | null }>("/api/metrics/overview"),
        api.get<{ appointments: Appointment[] }>(
          `/api/appointments?start=${todayIso()}&end=${todayIso(7)}&status=scheduled`
        ),
        api.get<{ activity: ActivityItem[] }>("/api/metrics/recent-activity"),
      ]);
      setMetrics(metricsRes.metrics);
      setUpcoming(apptsRes.appointments.slice(0, 5));
      setActivity(activityRes.activity.slice(0, 5));
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setLoading(false);
    }
  }

  const firstName = user?.name?.split(" ")[0] ?? "Nutricionista";

  const stats = [
    { label: "Consultas na semana", value: metrics?.appointments_week ?? "—", icon: CalendarCheck },
    { label: "Pacientes ativos", value: metrics?.total_clients ?? "—", icon: Users },
    { label: "Conversas ativas", value: metrics?.active_conversations ?? "—", icon: MessageSquare },
    {
      label: "Taxa de conversão",
      value: metrics?.conversion_rate != null ? `${metrics.conversion_rate}%` : "—",
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="h-16 animate-pulse rounded-xl bg-muted/40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">{capitalize(todayPtBR())}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName} 🌱
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumo do seu atendimento hoje e da semana.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-soft p-5">
            <div className="flex items-center justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Próximas consultas */}
        <div className="card-soft xl:col-span-2 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">Próximas consultas</h2>
              <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
            </div>
            <Link
              href="/agenda"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Nenhuma consulta marcada nos próximos dias.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {upcoming.map((a) => {
                const d = new Date(a.scheduled_at);
                const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <div className="w-14 shrink-0">
                      <div className="text-sm font-medium text-primary">{time}</div>
                      <div className="text-[11px] text-muted-foreground">{day}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.client_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.modality === "online" ? "Online" : a.city ?? "Presencial"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Atividade recente */}
        <div className="card-soft p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Atividade recente</h2>
            <span className="text-xs text-muted-foreground">7 dias</span>
          </div>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma atividade recente.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {activity.map((item, i) => {
                const name = item.client_name ?? item.client_phone;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-3.5"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(item.occurred_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {item.type === "new_lead" ? "Novo lead iniciou conversa" : "Consulta agendada"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
