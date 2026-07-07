"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BellRing, MessageCircleHeart, RotateCcw, Repeat, Zap } from "lucide-react";

type AutomationConfig = {
  auto_reminder_enabled: boolean;
  auto_reminder_hours_before: number;
  auto_reminder_message: string | null;
  auto_feedback_enabled: boolean;
  auto_feedback_delay_hours: number;
  auto_feedback_message: string | null;
  auto_return_enabled: boolean;
  auto_return_days: number;
  auto_return_message: string | null;
  followup_enabled: boolean;
  followup_delay_hours: number;
  followup_message_1: string | null;
  followup_message_2: string | null;
};

const DEFAULTS: AutomationConfig = {
  auto_reminder_enabled: false,
  auto_reminder_hours_before: 24,
  auto_reminder_message: "Oi! Passando pra lembrar da sua consulta amanhã às {hora}. Te espero! 😊",
  auto_feedback_enabled: false,
  auto_feedback_delay_hours: 2,
  auto_feedback_message: "Oi! Como foi a consulta de hoje? Ficou alguma dúvida?",
  auto_return_enabled: false,
  auto_return_days: 30,
  auto_return_message: "Oi! Faz {dias} dias da sua última consulta — bora marcar o retorno?",
  followup_enabled: true,
  followup_delay_hours: 4,
  followup_message_1: "Oi! Ainda tem interesse em começar o acompanhamento?",
  followup_message_2: "Só passando pra saber se ficou alguma dúvida sobre os planos.",
};

// ─── Primitivos locais ────────────────────────────────────────────────────────

function Group({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary">
          {icon}
        </div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="card-soft p-5">{children}</div>
    </section>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onCheckedChange(!checked)}
        className={
          "relative h-6 w-11 rounded-full transition " +
          (checked ? "bg-primary" : "bg-muted")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all " +
            (checked ? "left-[22px]" : "left-0.5")
          }
        />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomacoesPage() {
  const [cfg, setCfg] = useState<AutomationConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { assistant } = await api.get<{ assistant: Partial<AutomationConfig> | null }>(
        "/api/assistants"
      );
      if (assistant) {
        setCfg((prev) => ({ ...prev, ...stripNulls(assistant) }));
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar automações");
    } finally {
      setLoading(false);
    }
  }

  function stripNulls(a: Partial<AutomationConfig>): Partial<AutomationConfig> {
    const out: Partial<AutomationConfig> = {};
    (Object.keys(a) as (keyof AutomationConfig)[]).forEach((k) => {
      if (a[k] !== null && a[k] !== undefined) (out as Record<string, unknown>)[k] = a[k];
    });
    return out;
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/api/assistants", cfg);
      setMessage("Salvo! As automações já valem no próximo atendimento.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar automações");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof AutomationConfig>(key: K, value: AutomationConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando automações...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mensagens que a assistente envia sozinha, sem você precisar lembrar.
          </p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Zap className="h-4 w-4" />
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      {/* Lembrete de consulta */}
      <Group title="Lembrete de consulta" icon={<BellRing className="h-4 w-4" />}>
        <div className="flex flex-col gap-4">
          <ToggleRow
            title="Enviar lembrete automático"
            description="Dispara antes do horário marcado da consulta."
            checked={cfg.auto_reminder_enabled}
            onCheckedChange={(c) => update("auto_reminder_enabled", c)}
          />
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Horas antes</span>
              <Input
                type="number"
                min={1}
                max={72}
                disabled={!cfg.auto_reminder_enabled}
                value={cfg.auto_reminder_hours_before}
                onChange={(e) => update("auto_reminder_hours_before", Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Mensagem</span>
              <Textarea
                rows={2}
                disabled={!cfg.auto_reminder_enabled}
                value={cfg.auto_reminder_message ?? ""}
                onChange={(e) => update("auto_reminder_message", e.target.value)}
              />
            </label>
          </div>
        </div>
      </Group>

      {/* Pós-consulta */}
      <Group title="Pós-consulta" icon={<MessageCircleHeart className="h-4 w-4" />}>
        <div className="flex flex-col gap-4">
          <ToggleRow
            title="Enviar mensagem pós-consulta"
            description="Dispara depois do horário marcado da consulta."
            checked={cfg.auto_feedback_enabled}
            onCheckedChange={(c) => update("auto_feedback_enabled", c)}
          />
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Horas depois</span>
              <Input
                type="number"
                min={1}
                max={72}
                disabled={!cfg.auto_feedback_enabled}
                value={cfg.auto_feedback_delay_hours}
                onChange={(e) => update("auto_feedback_delay_hours", Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Mensagem</span>
              <Textarea
                rows={2}
                disabled={!cfg.auto_feedback_enabled}
                value={cfg.auto_feedback_message ?? ""}
                onChange={(e) => update("auto_feedback_message", e.target.value)}
              />
            </label>
          </div>
        </div>
      </Group>

      {/* Retorno */}
      <Group title="Retorno" icon={<RotateCcw className="h-4 w-4" />}>
        <div className="flex flex-col gap-4">
          <ToggleRow
            title="Enviar convite de retorno"
            description="Dispara quando o paciente não tem consulta futura marcada."
            checked={cfg.auto_return_enabled}
            onCheckedChange={(c) => update("auto_return_enabled", c)}
          />
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Dias sem consulta</span>
              <Input
                type="number"
                min={1}
                max={365}
                disabled={!cfg.auto_return_enabled}
                value={cfg.auto_return_days}
                onChange={(e) => update("auto_return_days", Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Mensagem</span>
              <Textarea
                rows={2}
                disabled={!cfg.auto_return_enabled}
                value={cfg.auto_return_message ?? ""}
                onChange={(e) => update("auto_return_message", e.target.value)}
              />
            </label>
          </div>
        </div>
      </Group>

      {/* Reengajamento */}
      <Group title="Reengajamento de leads" icon={<Repeat className="h-4 w-4" />}>
        <div className="flex flex-col gap-4">
          <ToggleRow
            title="Tentar reengajar automaticamente"
            description="Manda até 2 mensagens de resgate se o lead parar de responder."
            checked={cfg.followup_enabled}
            onCheckedChange={(c) => update("followup_enabled", c)}
          />
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Horas sem resposta</span>
              <Input
                type="number"
                min={1}
                max={48}
                disabled={!cfg.followup_enabled}
                value={cfg.followup_delay_hours}
                onChange={(e) => update("followup_delay_hours", Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">1ª mensagem de resgate</span>
              <Textarea
                rows={2}
                disabled={!cfg.followup_enabled}
                value={cfg.followup_message_1 ?? ""}
                onChange={(e) => update("followup_message_1", e.target.value)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">2ª mensagem de resgate</span>
            <Textarea
              rows={2}
              disabled={!cfg.followup_enabled}
              value={cfg.followup_message_2 ?? ""}
              onChange={(e) => update("followup_message_2", e.target.value)}
            />
          </label>
        </div>
      </Group>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar automações"}
        </button>
      </div>
    </div>
  );
}
