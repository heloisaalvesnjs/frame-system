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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  Calendar,
  Zap,
  BookOpen,
  DollarSign,
  Sparkles,
  Send,
  MapPin,
  Monitor,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Loader2,
  Plus,
  X,
  Trash2,
  Pencil,
  Check,
  Settings2,
} from "lucide-react";
import { SectionGroup } from "@/components/section-group";
import { LocationBadge } from "@/components/location-badge";
import { LOCATION_PALETTE, normalizeLocationColor } from "@/lib/location-palette";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function linesToArray(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ─── Calendário ───────────────────────────────────────────────────────────────

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

// ─── Small pieces ─────────────────────────────────────────────────────────────

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
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

function TagInput({
  value,
  onChange,
  accent,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: "primary" | "destructive";
  placeholder?: string;
}) {
  const tags = value.split("\n").map((l) => l.trim()).filter(Boolean);
  const [input, setInput] = useState("");
  const cls =
    accent === "primary"
      ? "bg-primary/15 text-primary"
      : "bg-destructive/15 text-destructive";

  function add() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed].join("\n"));
    }
    setInput("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag).join("\n"));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2/60 p-2 min-h-[44px]">
      {tags.map((t) => (
        <span
          key={t}
          className={"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs " + cls}
        >
          {t}
          <button
            onClick={() => remove(t)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(); }
        }}
        placeholder={placeholder ?? "digite e enter"}
        className="min-w-[100px] flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground/60"
      />
      <Plus className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}

function Bubble({
  side,
  name,
  children,
}: {
  side: "me" | "them";
  name?: string;
  children: React.ReactNode;
}) {
  const isMe = side === "me";
  return (
    <div className={"flex " + (isMe ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm " +
          (isMe
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border border-border bg-surface-2/60")
        }
      >
        {name && !isMe && (
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-primary">
            {name}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="card-soft flex flex-col items-center gap-4 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Essa aba está em construção. Em breve você vai poder configurar por aqui.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-tab: Identidade ──────────────────────────────────────────────────────

function IdentidadeTab() {
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5">
        {message && (
          <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
            {message}
          </div>
        )}

        <Group title="Identidade" icon={<User className="h-4 w-4" />}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da assistente">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              />
            </Field>
            <Field label="Tom de voz">
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="acolhedor, direto, animado..."
                className="h-10 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              />
            </Field>
          </div>
        </Group>

        <Group title="Mensagens" icon={<Sparkles className="h-4 w-4" />}>
          <div className="grid gap-4">
            <Field label="Saudação">
              <textarea
                rows={2}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </Field>
            <Field label="Despedida">
              <textarea
                rows={2}
                value={farewell}
                onChange={(e) => setFarewell(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Frases preferidas">
                <TagInput value={preferidas} onChange={setPreferidas} accent="primary" placeholder="Bacana" />
              </Field>
              <Field label="Frases proibidas">
                <TagInput value={proibidas} onChange={setProibidas} accent="destructive" placeholder="barato" />
              </Field>
            </div>
          </div>
        </Group>

        <Group title="Comportamento" icon={<Zap className="h-4 w-4" />}>
          <div className="grid gap-3">
            <ToggleRow
              title="Atender 24 horas"
              description="Se desligado, respeita os horários definidos em Disponibilidade."
              checked={ai24h}
              onCheckedChange={setAi24h}
            />
            <ToggleRow
              title="Pausar a IA completamente"
              description="Nenhuma mensagem é respondida automaticamente enquanto estiver pausada."
              checked={aiPaused}
              onCheckedChange={setAiPaused}
            />
            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </Group>
      </div>

      {/* Painel de chat de teste fixo */}
      <div>
        <div className="mb-3 flex items-end justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Testar ao vivo</h2>
            <p className="text-xs text-muted-foreground">Converse com a assistente</p>
          </div>
          <button
            onClick={resetTest}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reiniciar
          </button>
        </div>
        <div className="card-soft flex h-[520px] flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-auto p-4 text-sm">
            {chatHistory.length === 0 && (
              <Bubble side="them" name={name || "IA"}>
                Oi! Mande uma mensagem como se fosse um paciente, por exemplo &quot;oi&quot;.
              </Bubble>
            )}
            {chatHistory.map((m, i) => (
              <Bubble key={i} side={m.role === "user" ? "me" : "them"} name={m.role === "assistant" ? (name || "IA") : undefined}>
                {m.content}
              </Bubble>
            ))}
            {chatLoading && (
              <Bubble side="them" name={name || "IA"}>
                <span className="text-muted-foreground">Digitando...</span>
              </Bubble>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendTestMessage(); }}
              placeholder="Escreva uma mensagem..."
              className="h-10 flex-1 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={sendTestMessage}
              disabled={chatLoading}
              className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dialog: Gerenciar Locais ─────────────────────────────────────────────────

type LocationFormData = {
  name: string;
  city: string;
  address: string;
  modality: "presencial" | "online" | "ambos";
  color: string;
};

const EMPTY_LOCATION_FORM: LocationFormData = {
  name: "",
  city: "",
  address: "",
  modality: "presencial",
  color: LOCATION_PALETTE[0].hex,
};

function LocationManagerDialog({
  locations,
  onClose,
  onChanged,
}: {
  locations: Location[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<LocationFormData>(EMPTY_LOCATION_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(loc: Location) {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      city: loc.city ?? "",
      address: loc.address ?? "",
      modality: loc.modality,
      color: loc.color,
    });
    setError(null);
    setConfirmDeleteId(null);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_LOCATION_FORM);
    setError(null);
    setConfirmDeleteId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        modality: form.modality,
        color: form.color,
      };
      if (editingId) {
        await api.put(`/api/locations/${editingId}`, body);
      } else {
        await api.post("/api/locations", body);
      }
      onChanged();
      setEditingId(null);
      setForm(EMPTY_LOCATION_FORM);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar local");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/locations/${id}`);
      onChanged();
      setConfirmDeleteId(null);
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_LOCATION_FORM);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover local");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">Gerenciar locais de atendimento</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {/* Lista de locais existentes */}
          {locations.length > 0 && (
            <div className="mb-5 flex flex-col gap-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className={
                    "flex items-center gap-3 rounded-xl border p-3 transition " +
                    (editingId === loc.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-surface-2/40")
                  }
                >
                  <span className="size-3 flex-shrink-0 rounded-full" style={{ backgroundColor: normalizeLocationColor(loc.color) }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{loc.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[loc.city, loc.modality].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(loc)}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    {confirmDeleteId === loc.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(loc.id)}
                          disabled={saving}
                          className="h-7 rounded-lg border border-destructive/50 bg-destructive/10 px-2 text-[11px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="h-7 rounded-lg border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(loc.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulário novo/editar */}
          <div className="rounded-xl border border-border bg-surface-2/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {editingId ? "Editar local" : "Novo local"}
              </h4>
              {editingId && (
                <button onClick={startNew} className="text-xs text-muted-foreground hover:text-foreground">
                  + Novo
                </button>
              )}
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Nome *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Clínica Centro"
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Cidade</span>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ex: Vitória"
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Modalidade</span>
                  <select
                    value={form.modality}
                    onChange={(e) => setForm({ ...form, modality: e.target.value as LocationFormData["modality"] })}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="online">Online</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Endereço</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ex: Av. Paulista, 1000"
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Cor</span>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_PALETTE.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      onClick={() => setForm({ ...form, color: p.hex })}
                      className={
                        "relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition " +
                        (form.color === p.hex ? "border-foreground" : "border-transparent hover:border-foreground/40")
                      }
                      style={{ backgroundColor: p.hex }}
                    >
                      {form.color === p.hex && (
                        <Check className="size-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="mt-1 flex justify-end gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={startNew}
                    className="h-10 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancelar edição
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar local"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
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
  const [showLocationManager, setShowLocationManager] = useState(false);

  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  const [dayDialog, setDayDialog] = useState<string | null>(null);
  const [dialogCity, setDialogCity] = useState("");
  const [dialogStart, setDialogStart] = useState("");
  const [dialogEnd, setDialogEnd] = useState("");
  const [dialogSlot, setDialogSlot] = useState("");
  const [dialogBreakStart, setDialogBreakStart] = useState("");
  const [dialogBreakEnd, setDialogBreakEnd] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function reloadLocations() {
    try {
      const locRes = await api.get<{ locations: Location[] }>("/api/locations");
      setLocations(locRes.locations);
    } catch {
      // silencioso — loadAll já trata o erro principal
    }
  }

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
    const existing = overrides.get(key);
    setDayDialog(key);
    setDialogCity(existing?.location_id ?? "");
    setDialogStart(existing?.start_time?.slice(0, 5) ?? "");
    setDialogEnd(existing?.end_time?.slice(0, 5) ?? "");
    setDialogSlot(String(existing?.slot_duration ?? ""));
    setDialogBreakStart(existing?.break_start?.slice(0, 5) ?? "");
    setDialogBreakEnd(existing?.break_end?.slice(0, 5) ?? "");
  }

  async function saveDayCity() {
    if (!dayDialog || !dialogCity) return;
    try {
      const loc = locations.find((l) => l.id === dialogCity);
      // Pausa só vale se os dois campos estiverem preenchidos
      const breakOk = dialogBreakStart && dialogBreakEnd;
      await api.post("/api/availability/date-locations", {
        date: dayDialog, location_id: dialogCity,
        start_time: dialogStart || null,
        end_time: dialogEnd || null,
        slot_duration: dialogSlot ? Number(dialogSlot) : null,
        break_start: breakOk ? dialogBreakStart : null,
        break_end: breakOk ? dialogBreakEnd : null,
      });
      if (blocked.has(dayDialog)) {
        await api.delete(`/api/availability/blocked/${dayDialog}`).catch(() => {});
        setBlocked((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
      }
      setOverrides((prev) => {
        const n = new Map(prev);
        n.set(dayDialog, {
          id: dayDialog, date: dayDialog, location_id: dialogCity,
          location_name: loc?.name ?? null, modality: loc?.modality ?? null, color: loc?.color ?? null,
          start_time: dialogStart || null, end_time: dialogEnd || null,
          slot_duration: dialogSlot ? Number(dialogSlot) : null,
          break_start: dialogBreakStart && dialogBreakEnd ? dialogBreakStart : null,
          break_end: dialogBreakStart && dialogBreakEnd ? dialogBreakEnd : null,
        });
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
    setOverrides((prev) => { const n = new Map(prev); n.delete(dayDialog!); return n; });
    setBlocked((prev) => { const n = new Map(prev); n.delete(dayDialog!); return n; });
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
    <div className="flex flex-col gap-6">
      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      {/* Toggle segmentado Presencial/Online */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border p-1 text-sm">
          <button
            onClick={() => setInnerTab("presencial")}
            className={
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 transition " +
              (innerTab === "presencial"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <MapPin className="size-3.5" /> Presencial
          </button>
          <button
            onClick={() => setInnerTab("online")}
            className={
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 transition " +
              (innerTab === "online"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <Monitor className="size-3.5" /> Online
          </button>
        </div>
        {innerTab === "presencial" && (
          <div className="flex flex-wrap items-center gap-3">
            {locations.map((l) => (
              <LocationBadge key={l.id} color={l.color} name={l.name} />
            ))}
            <button
              onClick={() => setShowLocationManager(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Settings2 className="size-3" />
              {locations.length === 0 ? "Cadastrar local" : "Gerenciar locais"}
            </button>
          </div>
        )}
      </div>

      {/* Aviso de empty state para locais */}
      {innerTab === "presencial" && locations.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-2/30 px-5 py-8 text-center">
          <MapPin className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Nenhum local cadastrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre pelo menos um local de atendimento para usar o calendário presencial.
          </p>
          <button
            onClick={() => setShowLocationManager(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            <Plus className="size-4" /> Cadastrar local
          </button>
        </div>
      )}

      {innerTab === "presencial" ? (
        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Calendário presencial</h2>
              <p className="text-xs text-muted-foreground">
                {MONTHS[viewM].charAt(0).toUpperCase() + MONTHS[viewM].slice(1)} {viewY} · clique num dia para escolher local e horário
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={nextMonth}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="card-soft overflow-hidden p-3">
            <div className="grid grid-cols-7 gap-2 pb-2 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              {WEEKDAYS_SHORT.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
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
                    className={
                      "flex h-24 flex-col items-start gap-1.5 rounded-xl border p-2 text-left transition " +
                      (isPast ? "opacity-40 " : "") +
                      (isBlocked
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border bg-surface-2/40 hover:border-primary/40 hover:bg-surface-2/70")
                    }
                  >
                    <span className="text-xs font-medium">{d}</span>
                    {ov && <LocationBadge color={ov.color ?? "#2E7D32"} name={ov.location_name ?? ""} />}
                    {ov && ov.start_time && ov.end_time && (
                      <span className="text-[10px] text-muted-foreground">
                        {ov.start_time.slice(0, 5)}–{ov.end_time.slice(0, 5)}
                      </span>
                    )}
                    {isBlocked && <span className="text-[10px] font-medium text-destructive">Fechado</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        online && (
          <SectionGroup
            icon={Monitor}
            title="Atendimento online"
            description="Dias da semana e horário em que você atende online — independente do presencial."
          >
            <div className="p-4 flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Atendo online</p>
                  <p className="text-xs text-muted-foreground">Se desligado, a IA não oferece consulta online.</p>
                </div>
                <button
                  onClick={() => setOnline({ ...online, online_enabled: !online.online_enabled })}
                  className={
                    "relative h-6 w-11 rounded-full transition " +
                    (online.online_enabled ? "bg-primary" : "bg-muted")
                  }
                >
                  <span
                    className={
                      "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all " +
                      (online.online_enabled ? "left-[22px]" : "left-0.5")
                    }
                  />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS_FULL.map((w, wd) => {
                    const on = online.online_weekdays.includes(wd);
                    return (
                      <button
                        key={wd}
                        disabled={!online.online_enabled}
                        onClick={() => toggleWeekday(wd)}
                        className={
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 " +
                          (on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary")
                        }
                      >
                        {WEEKDAYS_SHORT[wd]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Início</Label>
                  <Input type="time" value={online.online_start} disabled={!online.online_enabled} onChange={(e) => setOnline({ ...online, online_start: e.target.value })} className="w-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Fim</Label>
                  <Input type="time" value={online.online_end} disabled={!online.online_enabled} onChange={(e) => setOnline({ ...online, online_end: e.target.value })} className="w-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Duração (min)</Label>
                  <Input type="number" min={15} step={5} value={online.online_slot_duration} disabled={!online.online_enabled} onChange={(e) => setOnline({ ...online, online_slot_duration: Number(e.target.value) })} className="w-24" />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveOnline}
                  disabled={savingOnline}
                  className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  {savingOnline ? "Salvando..." : "Salvar online"}
                </button>
              </div>
            </div>
          </SectionGroup>
        )
      )}

      {/* Dialog de gerenciar locais */}
      {showLocationManager && (
        <LocationManagerDialog
          locations={locations}
          onClose={() => setShowLocationManager(false)}
          onChanged={() => { reloadLocations(); }}
        />
      )}

      {/* Dialog de dia — overlay customizado */}
      {dayDialog && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setDayDialog(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground capitalize">
                  {MONTHS[Number(dayDialog.split("-")[1]) - 1]} {dayDialog.split("-")[0]}
                </div>
                <h3 className="text-lg font-semibold">{formatFull(dayDialog)}</h3>
              </div>
              <button
                onClick={() => setDayDialog(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {dialogBlocked && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <CalendarOff className="size-4" /> Este dia está marcado como sem atendimento.
                </div>
              )}
              {dialogOverride && !dialogBlocked && (
                <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                  Atendimento presencial em <strong>{dialogOverride.location_name}</strong>.
                </div>
              )}

              <div>
                <div className="mb-2 text-xs text-muted-foreground">Local de atendimento</div>
                <div className="flex flex-wrap gap-2">
                  {locations.map((l) => {
                    const selected = dialogCity === l.id;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setDialogCity(selected ? "" : l.id)}
                        className={
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                          (selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")
                        }
                      >
                        <MapPin className="size-3.5" />
                        {l.name}
                        {selected && <Check className="size-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Início</Label>
                  <Input type="time" value={dialogStart} onChange={(e) => setDialogStart(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Fim</Label>
                  <Input type="time" value={dialogEnd} onChange={(e) => setDialogEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs text-muted-foreground">Pausa (almoço) — opcional</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Início da pausa</Label>
                    <Input type="time" value={dialogBreakStart} onChange={(e) => setDialogBreakStart(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Fim da pausa</Label>
                    <Input type="time" value={dialogBreakEnd} onChange={(e) => setDialogBreakEnd(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Duração da consulta em min (opcional)</Label>
                <Input type="number" min={15} step={5} value={dialogSlot} onChange={(e) => setDialogSlot(e.target.value)} placeholder="30" className="w-28" />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={blockDay}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <CalendarOff className="inline mr-1 h-3 w-3" /> Não atendo neste dia
              </button>
              <div className="flex items-center gap-2">
                {(dialogOverride || dialogBlocked) && (
                  <button
                    onClick={clearDay}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remover deste dia
                  </button>
                )}
                <button
                  onClick={saveDayCity}
                  disabled={!dialogCity}
                  className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-tab: Integrações ─────────────────────────────────────────────────────

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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Group title="WhatsApp Business" icon={<Zap className="h-4 w-4" />}>
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M20 3.5A11.9 11.9 0 0 0 2.5 20L2 22l2-.5A11.9 11.9 0 1 0 20 3.5Zm-8 18.1a9.7 9.7 0 0 1-4.9-1.3l-.3-.2-3 .8.8-2.9-.2-.3A9.7 9.7 0 1 1 12 21.6Z" />
            </svg>
          </div>
          <div className="flex-1">
            {loading ? (
              <p className="text-sm text-muted-foreground">Verificando conexão...</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      {wa?.status === "connected" ? "Número conectado" : "WhatsApp"}
                    </div>
                    {wa?.phone && (
                      <div className="text-xs text-muted-foreground">{wa.phone}</div>
                    )}
                  </div>
                  {statusInfo && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                      <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="h-9 rounded-lg border border-border px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                    Reconectar
                  </button>
                  <button className="h-9 rounded-lg border border-destructive/60 px-3 text-xs text-destructive">
                    Desconectar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Group>

      <Group title="Google Calendar" icon={<Calendar className="h-4 w-4" />}>
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Não conectado</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sincronize consultas automaticamente com seu Google Calendar.
            </p>
            <button className="mt-4 h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-110">
              Conectar
            </button>
          </div>
        </div>
      </Group>
    </div>
  );
}

// ─── Sub-tab: Conhecimento ────────────────────────────────────────────────────

function ConhecimentoTab() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<{ content: string | null }>("/api/assistants/manual-content")
      .then((r) => setContent(r.content ?? ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/api/assistants/interview", { manual: content });
      setMessage("Conteúdo salvo! A assistente já usa no próximo atendimento.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPdf(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? window.localStorage.getItem("frame_token") : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/assistants/upload-pdf`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro no upload");
      setMessage(`PDF processado! Preview: ${json.preview ?? ""}`);
      const r = await api.get<{ content: string | null }>("/api/assistants/manual-content");
      setContent(r.content ?? "");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  }

  async function removePdf() {
    setMessage(null);
    try {
      await api.delete("/api/assistants/pdf");
      setContent("");
      setMessage("PDF removido.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao remover PDF");
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="flex flex-col gap-5">
      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      <Group title="Sobre o consultório" icon={<BookOpen className="h-4 w-4" />}>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Escreva tudo que a assistente precisa saber: especialidades, diferenciais, protocolo, público, FAQ, preços, condições de pagamento, etc.
          </p>
          <textarea
            rows={14}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ex: Sou nutricionista clínica com foco em emagrecimento saudável. Atendo presencialmente em Vila Velha e online. Minha consulta custa R$ 250 e dura 50 minutos..."
            className="w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </Group>

      <Group title="Upload de PDF" icon={<BookOpen className="h-4 w-4" />}>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Envie um PDF com informações do consultório — o texto será extraído e usado pela assistente.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-10 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {uploading ? "Processando..." : "Selecionar PDF"}
            </button>
            {content && (
              <button
                onClick={removePdf}
                className="inline-flex items-center gap-1 text-xs text-destructive hover:opacity-80"
              >
                <Trash2 className="h-3 w-3" /> Remover PDF atual
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPdf(file);
              e.target.value = "";
            }}
          />
        </div>
      </Group>
    </div>
  );
}

// ─── Sub-tab: Serviços e preços ───────────────────────────────────────────────

type Service = {
  id: string;
  name: string;
  category: string;
  modality: "online" | "presencial" | "ambos";
  price: string | null;
  description: string | null;
  is_active: boolean;
};

type ServiceForm = {
  name: string;
  category: string;
  modality: "online" | "presencial" | "ambos";
  price: string;
  description: string;
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  category: "Consulta",
  modality: "presencial",
  price: "",
  description: "",
};

const MODALITY_LABEL: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
  ambos: "Online e presencial",
};

function ServicosTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // service id or "new"
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<{ services: Service[] }>("/api/services");
      setServices(r.services);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditing("new");
  }

  function startEdit(s: Service) {
    setForm({
      name: s.name,
      category: s.category,
      modality: s.modality,
      price: s.price ?? "",
      description: s.description ?? "",
    });
    setEditing(s.id);
  }

  function setF<K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveForm() {
    if (!form.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || "Consulta",
        modality: form.modality,
        price: form.price.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (editing === "new") {
        await api.post("/api/services", payload);
      } else {
        await api.put(`/api/services/${editing}`, payload);
      }
      await load();
      setEditing(null);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar serviço");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/services/${id}`);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao remover serviço");
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando serviços...</div>;

  return (
    <div className="flex flex-col gap-5">
      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      <Group title="Serviços e preços" icon={<DollarSign className="h-4 w-4" />}>
        <div className="flex flex-col gap-3">
          {services.length === 0 && editing !== "new" && (
            <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
          )}

          {services.map((s) =>
            editing === s.id ? (
              <ServiceFormCard
                key={s.id}
                form={form}
                setF={setF}
                saving={saving}
                onSave={saveForm}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div
                key={s.id}
                className="flex items-start justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {MODALITY_LABEL[s.modality]}
                    {s.price ? ` · R$ ${s.price}` : ""}
                    {s.description ? ` · ${s.description}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(s)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          )}

          {editing === "new" && (
            <ServiceFormCard
              form={form}
              setF={setF}
              saving={saving}
              onSave={saveForm}
              onCancel={() => setEditing(null)}
            />
          )}

          {editing === null && (
            <button
              onClick={startNew}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-border px-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
            >
              <Plus className="h-4 w-4" /> Adicionar serviço
            </button>
          )}
        </div>
      </Group>
    </div>
  );
}

function ServiceFormCard({
  form,
  setF,
  saving,
  onSave,
  onCancel,
}: {
  form: ServiceForm;
  setF: <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome do serviço *">
          <input
            value={form.name}
            onChange={(e) => setF("name", e.target.value)}
            placeholder="Ex: Consulta inicial"
            className="h-10 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
          />
        </Field>
        <Field label="Preço (ex: 250,00)">
          <input
            value={form.price}
            onChange={(e) => setF("price", e.target.value)}
            placeholder="250,00"
            className="h-10 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
          />
        </Field>
        <Field label="Modalidade">
          <select
            value={form.modality}
            onChange={(e) => setF("modality", e.target.value as ServiceForm["modality"])}
            className="h-10 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
          >
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
            <option value="ambos">Online e presencial</option>
          </select>
        </Field>
        <Field label="Categoria">
          <input
            value={form.category}
            onChange={(e) => setF("category", e.target.value)}
            placeholder="Consulta"
            className="h-10 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Descrição (opcional)">
            <input
              value={form.description}
              onChange={(e) => setF("description", e.target.value)}
              placeholder="Breve descrição do serviço"
              className="h-10 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="h-10 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? "Salvando..." : "Salvar serviço"}
        </button>
      </div>
    </div>
  );
}

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS = [
  { id: "identidade", label: "Identidade", icon: User },
  { id: "disponibilidade", label: "Disponibilidade", icon: Calendar },
  { id: "integracoes", label: "Integrações", icon: Zap },
  { id: "conhecimento", label: "Conhecimento", icon: BookOpen },
  { id: "servicos", label: "Serviços e preços", icon: DollarSign },
] as const;

type TabValue = typeof TABS[number]["id"];
const TAB_IDS = TABS.map((t) => t.id);

// ─── Page principal ──────────────────────────────────────────────────────────

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
  const activeTab: TabValue = TAB_IDS.includes(tabParam as TabValue) ? (tabParam as TabValue) : "identidade";

  function handleTabChange(value: TabValue) {
    router.replace(`/assistente?tab=${value}`, { scroll: false });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assistente (IA)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure o atendimento, disponibilidade e integrações.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> ativa
        </span>
      </div>

      {/* Tabs em pill */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition " +
                (active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground")
              }
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      <div>
        {activeTab === "identidade" && <IdentidadeTab />}
        {activeTab === "disponibilidade" && <DisponibilidadeTab />}
        {activeTab === "integracoes" && <IntegracoesTab />}
        {activeTab === "conhecimento" && <ConhecimentoTab />}
        {activeTab === "servicos" && <ServicosTab />}
      </div>
    </div>
  );
}
