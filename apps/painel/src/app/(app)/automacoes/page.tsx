"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SectionGroup, PageHeader } from "@/components/section-group";
import { BellRingIcon, MessageCircleHeartIcon, RotateCcwIcon, RepeatIcon } from "lucide-react";

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader
        title="Automações"
        description="Mensagens que a assistente envia sozinha, sem você precisar lembrar."
      />

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      <SectionGroup
        icon={BellRingIcon}
        title="Lembrete de consulta"
        description="Envia uma mensagem antes da consulta pra reduzir faltas."
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Enviar lembrete automático</p>
              <p className="text-sm text-muted-foreground">
                Dispara antes do horário marcado da consulta.
              </p>
            </div>
            <Switch
              checked={cfg.auto_reminder_enabled}
              onCheckedChange={(c) => update("auto_reminder_enabled", c)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminder-hours">Horas antes</Label>
              <Input
                id="reminder-hours"
                type="number"
                min={1}
                max={72}
                disabled={!cfg.auto_reminder_enabled}
                value={cfg.auto_reminder_hours_before}
                onChange={(e) => update("auto_reminder_hours_before", Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminder-msg">Mensagem</Label>
              <Textarea
                id="reminder-msg"
                rows={2}
                disabled={!cfg.auto_reminder_enabled}
                value={cfg.auto_reminder_message ?? ""}
                onChange={(e) => update("auto_reminder_message", e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionGroup>

      <SectionGroup
        icon={MessageCircleHeartIcon}
        title="Pós-consulta"
        description="Pergunta como foi a consulta logo depois que ela acontece."
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Enviar mensagem pós-consulta</p>
              <p className="text-sm text-muted-foreground">
                Dispara depois do horário marcado da consulta.
              </p>
            </div>
            <Switch
              checked={cfg.auto_feedback_enabled}
              onCheckedChange={(c) => update("auto_feedback_enabled", c)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-hours">Horas depois</Label>
              <Input
                id="feedback-hours"
                type="number"
                min={1}
                max={72}
                disabled={!cfg.auto_feedback_enabled}
                value={cfg.auto_feedback_delay_hours}
                onChange={(e) => update("auto_feedback_delay_hours", Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-msg">Mensagem</Label>
              <Textarea
                id="feedback-msg"
                rows={2}
                disabled={!cfg.auto_feedback_enabled}
                value={cfg.auto_feedback_message ?? ""}
                onChange={(e) => update("auto_feedback_message", e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionGroup>

      <SectionGroup
        icon={RotateCcwIcon}
        title="Retorno"
        description="Convida o paciente a marcar retorno depois de um tempo sem consulta."
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Enviar convite de retorno</p>
              <p className="text-sm text-muted-foreground">
                Dispara quando o paciente não tem consulta futura marcada.
              </p>
            </div>
            <Switch
              checked={cfg.auto_return_enabled}
              onCheckedChange={(c) => update("auto_return_enabled", c)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="return-days">Dias sem consulta</Label>
              <Input
                id="return-days"
                type="number"
                min={1}
                max={365}
                disabled={!cfg.auto_return_enabled}
                value={cfg.auto_return_days}
                onChange={(e) => update("auto_return_days", Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="return-msg">Mensagem</Label>
              <Textarea
                id="return-msg"
                rows={2}
                disabled={!cfg.auto_return_enabled}
                value={cfg.auto_return_message ?? ""}
                onChange={(e) => update("auto_return_message", e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionGroup>

      <SectionGroup
        icon={RepeatIcon}
        title="Reengajamento de leads"
        description="Quando um lead some no meio da conversa, sem responder."
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Tentar reengajar automaticamente</p>
              <p className="text-sm text-muted-foreground">
                Manda até 2 mensagens de resgate se o lead parar de responder.
              </p>
            </div>
            <Switch
              checked={cfg.followup_enabled}
              onCheckedChange={(c) => update("followup_enabled", c)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="followup-hours">Horas sem resposta</Label>
              <Input
                id="followup-hours"
                type="number"
                min={1}
                max={48}
                disabled={!cfg.followup_enabled}
                value={cfg.followup_delay_hours}
                onChange={(e) => update("followup_delay_hours", Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="followup-msg-1">1ª mensagem de resgate</Label>
              <Textarea
                id="followup-msg-1"
                rows={2}
                disabled={!cfg.followup_enabled}
                value={cfg.followup_message_1 ?? ""}
                onChange={(e) => update("followup_message_1", e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="followup-msg-2">2ª mensagem de resgate</Label>
            <Textarea
              id="followup-msg-2"
              rows={2}
              disabled={!cfg.followup_enabled}
              value={cfg.followup_message_2 ?? ""}
              onChange={(e) => update("followup_message_2", e.target.value)}
            />
          </div>
        </div>
      </SectionGroup>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar automações"}
        </Button>
      </div>
    </div>
  );
}
