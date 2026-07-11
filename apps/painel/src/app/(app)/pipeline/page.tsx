"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ChevronLeft, ChevronRight, Phone, Target, XCircle, RotateCcw } from "lucide-react";

type Opportunity = {
  id: string;
  name: string | null;
  phone: string;
  goal: string | null;
  stage: string | null;
  source: string | null;
  stage_updated_at: string | null;
  created_at: string;
};

// Estágios reais do funil (clients.stage no backend). A ordem aqui é a ordem
// das colunas e dos botões ◀ ▶. "perdido" fica fora do fluxo linear.
const STAGES = [
  {
    id: "novo_contato",
    label: "Novo lead",
    color: "#7ECEF4",
    hint: "Chamou no WhatsApp — a IA responde e qualifica",
  },
  {
    id: "em_atendimento",
    label: "Em atendimento",
    color: "#B0A4E3",
    hint: "Conversa em andamento com a IA ou com você",
  },
  {
    id: "qualificado",
    label: "Qualificado",
    color: "#F5C842",
    hint: "Demonstrou interesse real — follow-up de lead ativo",
  },
  {
    id: "avaliando",
    label: "Avaliando",
    color: "#F4A460",
    hint: "Recebeu planos/preços e está decidindo",
  },
  {
    id: "agendamento_pendente",
    label: "Agendamento pendente",
    color: "#F48FB1",
    hint: "Aceitou marcar — escolhendo data e horário",
  },
  {
    id: "consulta_marcada",
    label: "Consulta marcada",
    color: "#61D836",
    hint: "Lembrete de consulta e pós-consulta automáticos",
  },
] as const;

const LOST = {
  id: "perdido",
  label: "Perdido",
  color: "#90A4AE",
  hint: "Sem resposta — alvo do reengajamento automático",
};

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return phone;
}

function timeInStage(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days !== 1 ? "s" : ""}`;
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function PipelinePage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ opportunities: Opportunity[] }>(
        "/api/clients/opportunities?include_lost=true"
      );
      setItems(res.opportunities);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar pipeline");
    } finally {
      setLoading(false);
    }
  }

  async function moveTo(client: Opportunity, stage: string) {
    setMoving(client.id);
    try {
      await api.patch(`/api/clients/${client.id}/stage`, { stage });
      setItems((prev) =>
        prev.map((c) =>
          c.id === client.id ? { ...c, stage, stage_updated_at: new Date().toISOString() } : c
        )
      );
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao mover paciente");
    } finally {
      setMoving(null);
    }
  }

  const stageOf = (c: Opportunity) => c.stage ?? "novo_contato";
  const byStage = (stageId: string) => items.filter((c) => stageOf(c) === stageId);
  const lost = byStage("perdido");

  function Card({ client }: { client: Opportunity }) {
    const stage = stageOf(client);
    const idx = STAGES.findIndex((s) => s.id === stage);
    const isLost = stage === "perdido";
    const busy = moving === client.id;
    return (
      <div className="card-soft flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{client.name || "Sem nome"}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="size-3" /> {formatPhone(client.phone)}
            </p>
          </div>
        </div>
        {client.goal && (
          <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
            <Target className="mt-0.5 size-3 shrink-0" />
            <span className="line-clamp-2">{client.goal}</span>
          </p>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-[10px] text-muted-foreground">
            {timeInStage(client.stage_updated_at) ?? ""}
          </span>
          <div className="flex items-center gap-1">
            {isLost ? (
              <button
                disabled={busy}
                onClick={() => moveTo(client, "novo_contato")}
                title="Recuperar (volta pra Novo lead)"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40"
              >
                <RotateCcw className="size-3" /> Recuperar
              </button>
            ) : (
              <>
                <button
                  disabled={busy || idx <= 0}
                  onClick={() => moveTo(client, STAGES[idx - 1].id)}
                  title="Etapa anterior"
                  className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  disabled={busy || idx === STAGES.length - 1}
                  onClick={() => moveTo(client, STAGES[idx + 1].id)}
                  title="Próxima etapa"
                  className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="size-3.5" />
                </button>
                <button
                  disabled={busy}
                  onClick={() => moveTo(client, "perdido")}
                  title="Marcar como perdido"
                  className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-destructive/50 hover:text-destructive disabled:opacity-30"
                >
                  <XCircle className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Andamento de cada paciente no funil — a IA usa a etapa como etiqueta pra saber quem
          recebe follow-up, lembrete de consulta, pós-consulta e reengajamento.
        </p>
      </div>

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando pipeline...</div>
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4" style={{ minWidth: "1080px" }}>
              {STAGES.map((s) => {
                const cards = byStage(s.id);
                return (
                  <div key={s.id} className="flex w-[240px] shrink-0 flex-col gap-3">
                    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-sm font-semibold">{s.label}</span>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: s.color + "26", color: s.color }}
                        >
                          {cards.length}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{s.hint}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {cards.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground/60">
                          Ninguém nesta etapa
                        </div>
                      )}
                      {cards.map((c) => <Card key={c.id} client={c} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Perdidos — fora do fluxo, alvo do reengajamento */}
          <div className="rounded-xl border border-border bg-surface-2/30 p-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: LOST.color }} />
              <span className="text-sm font-semibold">{LOST.label}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: LOST.color + "26", color: LOST.color }}
              >
                {lost.length}
              </span>
              <span className="text-[11px] text-muted-foreground">— {LOST.hint}</span>
            </div>
            {lost.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {lost.map((c) => <Card key={c.id} client={c} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
