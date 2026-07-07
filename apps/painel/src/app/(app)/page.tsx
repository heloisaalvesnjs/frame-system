"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/section-group";
import {
  CalendarCheckIcon,
  UsersIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  UserPlusIcon,
  CalendarPlusIcon,
} from "lucide-react";

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
  scheduled_at?: string;
  status?: string;
};

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Home() {
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
      setActivity(activityRes.activity.slice(0, 6));
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      label: "Pacientes ativos",
      value: metrics?.total_clients ?? "—",
      icon: UsersIcon,
    },
    {
      label: "Consultas na semana",
      value: metrics?.appointments_week ?? "—",
      icon: CalendarCheckIcon,
    },
    {
      label: "Conversas ativas",
      value: metrics?.active_conversations ?? "—",
      icon: MessageSquareIcon,
    },
    {
      label: "Taxa de conversão",
      value: metrics?.conversion_rate != null ? `${metrics.conversion_rate}%` : "—",
      icon: TrendingUpIcon,
    },
  ];

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando visão geral...</div>;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Visão geral"
        description="Resumo do seu atendimento hoje e da semana."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <s.icon className="size-4" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Próximas consultas</h2>
            <span className="text-xs text-muted-foreground">Próximos 7 dias</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
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
                    <div className="w-16 shrink-0">
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

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Atividade recente</h2>
            <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
          </div>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma atividade recente.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {activity.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {item.type === "new_lead" ? (
                      <UserPlusIcon className="size-4" />
                    ) : (
                      <CalendarPlusIcon className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {item.client_name ?? item.client_phone}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "new_lead" ? "Novo lead iniciou conversa" : "Consulta agendada"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(item.occurred_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
