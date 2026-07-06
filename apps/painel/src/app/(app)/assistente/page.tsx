"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Assistant } from "@/lib/assistant-types";
import type {
  BlockedDate,
  DateLocationOverride,
  Location,
  OnlineAvailability,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BotIcon,
  SendIcon,
  SparklesIcon,
  MapPinIcon,
  MonitorIcon,
  CalendarOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  RefreshCcwIcon,
  Loader2Icon,
  BookOpenIcon,
  PackageIcon,
  PlugIcon,
} from "lucide-react";
import { SectionGroup, PageHeader } from "@/components/section-group";
import { LocationBadge } from "@/components/location-badge";
import { PagePlaceholder } from "@/components/page-placeholder";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

type WhatsappStatus = {
  status: string;
  phone?: string | null;
  connected_at?: string | null;
};

const STATUS_LABEL: Record<string, { label: string; dotClass: string }> = {
  connected: { label: "Conectado", dotClass: "bg-primary" },
  connecting: { label: "Conectando...", dotClass: "bg-amber-500" },
  disconnected: { label: "Desconectado", dotClass: "bg-destructive" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function linesToArray(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ─── Calendário helpers ──────────────────────────────────────────────────────

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function shortDate(s: string) { return s.slice(0, 10); }
function formatFull(isoStr: string) {
  const [y, m, d] = isoStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Sub-tab: Identidade ──────────────────────────────────────────────────────

function IdentidadeTab() {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tone, setTone] = useState("");
  const [greeting, setGreeting] = useState("");
  const [farewell, setFarewell] = useState("");
  const [preferidas, setPreferidas] = useState("");
  const [proibidas, setProibidas] = useState("");
  const [ai24h, setAi24h] = useState(true);
  const [aiPaused, setAiPaused] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  async function load() {
    setLoading(true);
    try {
      const { assistant: a } = await api.get<{ assistant: Assistant | null }>("/api/assistants");
      if (a) {
        setAssistant(a);
        setName(a.name ?? "");
        setTone(a.tone ?? "");
        setGreeting(a.greeting_message ?? "");
        setFarewell(a.farewell_message ?? "");
        setPreferidas((a.frases_preferidas ?? []).join("\n"));
        setProibidas((a.frases_proibidas ?? []).join("\n"));
        setAi24h(a.ai_24h ?? true);
        setAiPaused(a.ai_paused ?? false);
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar assistente");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/api/assistants", {
        name, tone,
        greeting_message: greeting,
        farewell_message: farewell,
        frases_preferidas: linesToArray(preferidas),
        frases_proibidas: linesToArray(proibidas),
        ai_24h: ai24h,
        ai_paused: aiPaused,
      });
      setMessage("Salvo! A assistente já usa isso na próxima mensagem.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestMessage() {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await api.post<{ response: string }>("/api/assistants/test", {
        message: userMsg.content,
        history: chatHistory,
      });
      setChatHistory([...nextHistory, { role: "assistant", content: res.response }]);
    } catch (err) {
      setChatHistory([
        ...nextHistory,
        { role: "assistant", content: err instanceof ApiError ? `Erro: ${err.message}` : "Erro ao testar" },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function resetTest() {
    await api.post("/api/assistants/test", { message: "", reset: true });
    setChatHistory([]);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando assistente...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      <SectionGroup
        icon={BotIcon}
        title="Identidade"
        description="Nome, tom de voz e as mensagens de abertura e fechamento."
      >
        <div className="p-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assistant-name">Nome da assistente</Label>
              <Input id="assistant-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assistant-tone">Tom de voz</Label>
              <Input
                id="assistant-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="acolhedor, direto, animado..."
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assistant-greeting">Mensagem de boas-vindas</Label>
            <Textarea id="assistant-greeting" rows={3} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assistant-farewell">Mensagem de despedida</Label>
            <Textarea id="assistant-farewell" rows={2} value={farewell} onChange={(e) => setFarewell(e.target.value)} />
          </div>
        </div>
      </SectionGroup>

      <SectionGroup title="Jeito de falar" description="Uma frase por linha.">
        <div className="p-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferidas">Frases que sempre usa</Label>
            <Textarea
              id="preferidas"
              rows={5}
              value={preferidas}
              onChange={(e) => setPreferidas(e.target.value)}
              placeholder={"Bacana\nQue ótimo\nPerfeito"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proibidas">Frases proibidas</Label>
            <Textarea
              id="proibidas"
              rows={5}
              value={proibidas}
              onChange={(e) => setProibidas(e.target.value)}
              placeholder={"barato\ndieta relâmpago"}
            />
          </div>
        </div>
      </SectionGroup>

      <SectionGroup title="Ligar e desligar">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Atender 24 horas</p>
              <p className="text-sm text-muted-foreground">
                Se desligado, respeita os horários definidos em Disponibilidade.
              </p>
            </div>
            <Switch checked={ai24h} onCheckedChange={setAi24h} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Pausar a IA completamente</p>
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem é respondida automaticamente enquanto estiver pausada.
              </p>
            </div>
            <Switch checked={aiPaused} onCheckedChange={setAiPaused} />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </SectionGroup>

      <SectionGroup
        icon={SparklesIcon}
        title="Testar atendimento"
        description="Converse com a IA usando as configurações atuais — não afeta pacientes reais."
      >
        <div className="p-4 flex flex-col gap-3">
          <div className="flex h-72 flex-col gap-3 overflow-y-auto rounded-md border border-border bg-muted/40 p-3">
            {chatHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Mande uma mensagem como se fosse um paciente, por exemplo &quot;oi&quot;.
              </p>
            )}
            {chatHistory.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-card text-card-foreground border border-border"
                }`}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div className="self-start rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                Digitando...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendTestMessage(); }}
              placeholder="Digite como um paciente..."
            />
            <Button onClick={sendTestMessage} disabled={chatLoading}>
              <SendIcon />
            </Button>
            <Button variant="outline" onClick={resetTest}>
              Reiniciar
            </Button>
          </div>
        </div>
      </SectionGroup>
    </div>
  );
}

// ─── Sub-tab: Disponibilidade ─────────────────────────────────────────────────

function DisponibilidadeTab() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [blocked, setBlocked] = useState<Map<string, string | null>>(new Map());
  const [overrides, setOverrides] = useState<Map<string, DateLocationOverride>>(new Map());
  const [online, setOnline] = useState<OnlineAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<"presencial" | "online">("presencial");

  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  const [dayDialog, setDayDialog] = useState<string | null>(null);
  const [dialogCity, setDialogCity] = useState("");
  const [dialogStart, setDialogStart] = useState("");
  const [dialogEnd, setDialogEnd] = useState("");
  const [dialogSlot, setDialogSlot] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [locRes, blockedRes, overridesRes] = await Promise.all([
        api.get<{ locations: Location[] }>("/api/locations"),
        api.get<{ blocked: BlockedDate[] }>("/api/availability/blocked"),
        api.get<{ overrides: DateLocationOverride[] }>("/api/availability/date-locations"),
      ]);
      setLocations(locRes.locations);
      setBlocked(new Map(blockedRes.blocked.map((b) => [shortDate(b.blocked_date), b.reason])));
      setOverrides(
        new Map(overridesRes.overrides.map((o) => [shortDate(o.date), { ...o, date: shortDate(o.date) }]))
      );
      try {
        setOnline(await api.get<OnlineAvailability>("/api/nutritionists/online-availability"));
      } catch {
        setOnline({
          online_enabled: true, online_weekdays: [1, 2, 3, 4, 5],
          online_start: "08:00", online_end: "18:00", online_slot_duration: 30,
          online_break_start: null, online_break_end: null,
        });
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar disponibilidade");
    } finally {
      setLoading(false);
    }
  }

  const grid = (() => {
    const firstDow = new Date(viewY, viewM, 1).getDay();
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  function prevMonth() {
    if (viewM === 0) { setViewY(viewY - 1); setViewM(11); } else setViewM(viewM - 1);
  }
  function nextMonth() {
    if (viewM === 11) { setViewY(viewY + 1); setViewM(0); } else setViewM(viewM + 1);
  }

  function openDay(d: number) {
    const key = isoDate(viewY, viewM, d);
    const existing = overrides.get(key) as (DateLocationOverride & { start_time?: string | null; end_time?: string | null; slot_duration?: number | null }) | undefined;
    setDayDialog(key);
    setDialogCity(existing?.location_id ?? "");
    setDialogStart(existing?.start_time ?? "");
    setDialogEnd(existing?.end_time ?? "");
    setDialogSlot(String(existing?.slot_duration ?? ""));
  }

  async function saveDayCity() {
    if (!dayDialog || !dialogCity) return;
    try {
      const loc = locations.find((l) => l.id === dialogCity);
      await api.post("/api/availability/date-locations", {
        date: dayDialog, location_id: dialogCity,
        start_time: dialogStart || null,
        end_time: dialogEnd || null,
        slot_duration: dialogSlot ? Number(dialogSlot) : null,
      });
      if (blocked.has(dayDialog)) {
        await api.delete(`/api/availability/blocked/${dayDialog}`).catch(() => {});
        setBlocked((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
      }
      setOverrides((prev) => {
        const n = new Map(prev);
        n.set(dayDialog, { id: dayDialog, date: dayDialog, location_id: dialogCity, location_name: loc?.name ?? null, modality: loc?.modality ?? null, color: loc?.color ?? null });
        return n;
      });
      setDayDialog(null);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar local do dia");
    }
  }

  async function blockDay() {
    if (!dayDialog) return;
    try {
      await api.post("/api/availability/blocked", { blocked_date: dayDialog });
      setBlocked((prev) => { const n = new Map(prev); n.set(dayDialog, null); return n; });
      if (overrides.has(dayDialog)) {
        await api.delete(`/api/availability/date-locations/${dayDialog}`).catch(() => {});
        setOverrides((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
      }
      setDayDialog(null);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao bloquear dia");
    }
  }

  async function clearDay() {
    if (!dayDialog) return;
    if (overrides.has(dayDialog)) await api.delete(`/api/availability/date-locations/${dayDialog}`).catch(() => {});
    if (blocked.has(dayDialog)) await api.delete(`/api/availability/blocked/${dayDialog}`).catch(() => {});
    setOverrides((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
    setBlocked((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
    setDayDialog(null);
  }

  const [savingOnline, setSavingOnline] = useState(false);
  function toggleWeekday(wd: number) {
    if (!online) return;
    const has = online.online_weekdays.includes(wd);
    setOnline({ ...online, online_weekdays: has ? online.online_weekdays.filter((d) => d !== wd) : [...online.online_weekdays, wd].sort() });
  }
  async function saveOnline() {
    if (!online) return;
    setSavingOnline(true);
    try {
      await api.put("/api/nutritionists/online-availability", online);
      setMessage("Atendimento online salvo!");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar online");
    } finally {
      setSavingOnline(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando disponibilidade...</div>;

  const dialogOverride = dayDialog ? overrides.get(dayDialog) : null;
  const dialogBlocked = dayDialog ? blocked.has(dayDialog) : false;

  return (
    <div className="flex flex-col gap-8">
      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      <div className="inline-flex w-fit rounded-lg border border-border bg-muted/40 p-1">
        <button
          onClick={() => setInnerTab("presencial")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            innerTab === "presencial" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <MapPinIcon className="size-4" /> Presencial
        </button>
        <button
          onClick={() => setInnerTab("online")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            innerTab === "online" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <MonitorIcon className="size-4" /> Online
        </button>
      </div>

      {innerTab === "presencial" ? (
        <SectionGroup
          icon={MapPinIcon}
          title="Calendário presencial"
          description="Clique num dia para escolher o local e horário, ou marcar como fechado."
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Button size="icon-sm" variant="outline" onClick={prevMonth} aria-label="Mês anterior">
                <ChevronLeftIcon />
              </Button>
              <span className="w-36 text-center text-sm font-medium capitalize">
                {MONTHS[viewM]} {viewY}
              </span>
              <Button size="icon-sm" variant="outline" onClick={nextMonth} aria-label="Próximo mês">
                <ChevronRightIcon />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS_SHORT.map((w) => (
                <div key={w} className="pb-2 text-xs font-medium text-muted-foreground">{w}</div>
              ))}
              {grid.map((d, i) => {
                if (d === null) return <div key={i} />;
                const key = isoDate(viewY, viewM, d);
                const ov = overrides.get(key);
                const isBlocked = blocked.has(key);
                const isPast = new Date(viewY, viewM, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <button
                    key={i}
                    onClick={() => openDay(d)}
                    className={`flex min-h-16 flex-col items-start gap-1 rounded-md border p-1.5 text-left transition-colors hover:border-primary ${isPast ? "opacity-40" : ""} ${isBlocked ? "border-destructive/40 bg-destructive/5" : "border-border"}`}
                  >
                    <span className="text-xs font-medium">{d}</span>
                    {ov && <LocationBadge color={ov.color ?? "#2E7D32"} name={ov.location_name ?? ""} />}
                    {isBlocked && <span className="text-[10px] font-medium text-destructive">Fechado</span>}
                  </button>
                );
              })}
            </div>
            {locations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3">
                {locations.map((l) => (
                  <div key={l.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionGroup>
      ) : (
        online && (
          <SectionGroup
            icon={MonitorIcon}
            title="Atendimento online"
            description="Dias da semana e horário em que você atende online — independente do presencial."
          >
            <div className="p-4 flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Atendo online</p>
                  <p className="text-sm text-muted-foreground">Se desligado, a IA não oferece consulta online.</p>
                </div>
                <Switch checked={online.online_enabled} onCheckedChange={(c) => setOnline({ ...online, online_enabled: c })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS_FULL.map((w, wd) => {
                    const on = online.online_weekdays.includes(wd);
                    return (
                      <button key={wd} disabled={!online.online_enabled} onClick={() => toggleWeekday(wd)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}
                      >
                        {WEEKDAYS_SHORT[wd]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dis-on-start">Início</Label>
                  <Input id="dis-on-start" type="time" value={online.online_start} disabled={!online.online_enabled} onChange={(e) => setOnline({ ...online, online_start: e.target.value })} className="w-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dis-on-end">Fim</Label>
                  <Input id="dis-on-end" type="time" value={online.online_end} disabled={!online.online_enabled} onChange={(e) => setOnline({ ...online, online_end: e.target.value })} className="w-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dis-on-dur">Duração (min)</Label>
                  <Input id="dis-on-dur" type="number" min={15} step={5} value={online.online_slot_duration} disabled={!online.online_enabled} onChange={(e) => setOnline({ ...online, online_slot_duration: Number(e.target.value) })} className="w-24" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveOnline} disabled={savingOnline}>
                  {savingOnline ? "Salvando..." : "Salvar online"}
                </Button>
              </div>
            </div>
          </SectionGroup>
        )
      )}

      <Dialog open={!!dayDialog} onOpenChange={(o) => !o && setDayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dayDialog && formatFull(dayDialog)}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {dialogBlocked && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <CalendarOffIcon className="size-4" /> Este dia está marcado como sem atendimento.
              </div>
            )}
            {dialogOverride && !dialogBlocked && (
              <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                Atendimento presencial em <strong>{dialogOverride.location_name}</strong>.
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Atender presencialmente em</Label>
              <Select value={dialogCity} onValueChange={setDialogCity}>
                <SelectTrigger><SelectValue placeholder="Escolha o local" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dlg2-start">Início (opcional)</Label>
                <Input id="dlg2-start" type="time" value={dialogStart} onChange={(e) => setDialogStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dlg2-end">Fim (opcional)</Label>
                <Input id="dlg2-end" type="time" value={dialogEnd} onChange={(e) => setDialogEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dlg2-slot">Duração da consulta em min (opcional)</Label>
              <Input id="dlg2-slot" type="number" min={15} step={5} value={dialogSlot} onChange={(e) => setDialogSlot(e.target.value)} placeholder="30" className="w-28" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={blockDay} className="text-destructive">
              <CalendarOffIcon /> Não atendo neste dia
            </Button>
            <div className="flex gap-2">
              {(dialogOverride || dialogBlocked) && <Button variant="ghost" onClick={clearDay}>Limpar</Button>}
              <Button onClick={saveDayCity} disabled={!dialogCity}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-tab: Integrações ────────────────────────────────────────────────────

function IntegracoesTab() {
  const [wa, setWa] = useState<WhatsappStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<WhatsappStatus>("/api/whatsapp/status");
      setWa(res);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const statusInfo = wa ? STATUS_LABEL[wa.status] ?? STATUS_LABEL.disconnected : null;

  return (
    <div className="flex flex-col gap-8">
      <SectionGroup
        icon={MessageCircleIcon}
        title="WhatsApp"
        description="Número usado pela IA para conversar com os pacientes."
      >
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Verificando conexão...</p>
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1.5">
                  <span className={`size-1.5 rounded-full ${statusInfo?.dotClass ?? "bg-muted-foreground"}`} />
                  {statusInfo?.label ?? "Desconhecido"}
                </Badge>
                {wa?.phone && <span className="text-sm text-muted-foreground">{wa.phone}</span>}
              </div>
            )}
          </div>
          <Button size="icon-sm" variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2Icon className="animate-spin" /> : <RefreshCcwIcon />}
          </Button>
        </div>
      </SectionGroup>

      <SectionGroup title="Como funciona por trás" variant="muted">
        <div className="p-4 flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">n8n</strong> — recebe cada mensagem, decide
            se é dúvida, agendamento ou algo pra você, e já lê tudo que está configurado aqui
            no painel (planos, disponibilidade, base de conhecimento) em tempo real.
          </p>
          <p>
            <strong className="text-foreground">Claude (IA)</strong> — o modelo que gera as
            respostas da assistente.
          </p>
          <p>
            <strong className="text-foreground">Google Calendar</strong> e{" "}
            <strong className="text-foreground">Asaas (PIX)</strong> — configuráveis em breve
            nesta tela.
          </p>
        </div>
      </SectionGroup>
    </div>
  );
}

// ─── Page principal ──────────────────────────────────────────────────────────

const TAB_VALUES = ["identidade", "disponibilidade", "integracoes", "conhecimento", "servicos"] as const;
type TabValue = typeof TAB_VALUES[number];

export default function AssistentePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando...</div>}>
      <AssistentePageInner />
    </Suspense>
  );
}

function AssistentePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabValue | null;
  const activeTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : "identidade";

  function handleTabChange(value: string) {
    router.replace(`/assistente?tab=${value}`, { scroll: false });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Assistente (IA)"
        description="Configure o atendimento, disponibilidade e integrações da sua IA."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="identidade">
            <BotIcon className="size-4 mr-1.5" />
            Identidade
          </TabsTrigger>
          <TabsTrigger value="disponibilidade">
            <MapPinIcon className="size-4 mr-1.5" />
            Disponibilidade
          </TabsTrigger>
          <TabsTrigger value="integracoes">
            <PlugIcon className="size-4 mr-1.5" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="conhecimento">
            <BookOpenIcon className="size-4 mr-1.5" />
            Conhecimento
          </TabsTrigger>
          <TabsTrigger value="servicos">
            <PackageIcon className="size-4 mr-1.5" />
            Serviços e Preços
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-6">
          <IdentidadeTab />
        </TabsContent>

        <TabsContent value="disponibilidade" className="mt-6">
          <DisponibilidadeTab />
        </TabsContent>

        <TabsContent value="integracoes" className="mt-6">
          <IntegracoesTab />
        </TabsContent>

        <TabsContent value="conhecimento" className="mt-6">
          <PagePlaceholder
            title="Base de conhecimento"
            description="Aqui você vai poder carregar PDFs, textos e perguntas frequentes que a IA usará nos atendimentos."
            icon={<BookOpenIcon className="size-4" />}
            points={[
              "Upload de PDF de planos alimentares e protocolos",
              "Perguntas e respostas frequentes dos seus pacientes",
              "Textos de referência para a IA citar durante o atendimento",
            ]}
          />
        </TabsContent>

        <TabsContent value="servicos" className="mt-6">
          <PagePlaceholder
            title="Serviços e Preços"
            description="Configure os serviços que você oferece e os valores — a IA informará os pacientes automaticamente."
            icon={<PackageIcon className="size-4" />}
            points={[
              "Consulta presencial e online com valores individuais",
              "Pacotes de acompanhamento",
              "A IA menciona os valores corretos sem precisar de script",
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
