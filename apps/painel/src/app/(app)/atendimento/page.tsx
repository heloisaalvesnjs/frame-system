"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Sparkles,
  MoreHorizontal,
  Check,
  CheckCheck,
  Bot,
  UserRound,
  Circle,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

// --- Tipos baseados no backend real ---
type ConvStatus = "active" | "human_takeover" | "resolved";

type Conversation = {
  id: string;
  client_phone: string;
  client_name: string | null;
  client_id: string | null;
  client_goal: string | null;
  client_since: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: ConvStatus;
  outcome: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sent_at: string;
  pending_send: boolean;
};

// --- Utilitários ---
function initials(name: string | null, phone: string): string {
  if (!name) return phone.slice(-2);
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function displayName(c: Conversation): string {
  return c.client_name ?? c.client_phone;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ontem";
  return `${days}d`;
}

// Filtros de conversa
type Filter = "Todas" | "IA" | "Você" | "Urgentes";
const FILTERS: Filter[] = ["Todas", "IA", "Você", "Urgentes"];

function matchFilter(c: Conversation, f: Filter): boolean {
  if (f === "Todas") return true;
  if (f === "IA") return c.status === "active";
  if (f === "Você") return c.status === "human_takeover";
  if (f === "Urgentes") return c.status === "human_takeover";
  return true;
}

// Ações rápidas (preenchem o campo, não chamam API)
const QUICK_ACTIONS = [
  "Confirmar consulta",
  "Enviar plano",
  "Pedir exame",
  "Reagendar",
];

// --- Componente principal ---
export default function AtendimentoPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("Todas");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);

  // Carrega lista de conversas
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.get<{ conversations: Conversation[] }>("/api/conversations");
      setConversations(res.conversations);
      // Seleciona a primeira por padrão se nenhuma ativa
      if (!activeId && res.conversations.length > 0) {
        setActiveId(res.conversations[0].id);
      }
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setLoadingList(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega thread ao mudar de conversa ativa
  useEffect(() => {
    if (!activeId) return;
    setLoadingThread(true);
    setMessages([]);
    api.get<{ conversation: Conversation; messages: Message[] }>(
      `/api/conversations/${activeId}/messages`
    )
      .then((res) => {
        setMessages(res.messages);
        // Sincroniza status da conversa na lista
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, ...res.conversation } : c))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingThread(false));
  }, [activeId]);

  // Scroll para o fim da thread quando mensagens mudam
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const isHumanTakeover = activeConv?.status === "human_takeover";

  // Filtro e busca na lista
  const visible = conversations.filter((c) => {
    if (!matchFilter(c, filter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return displayName(c).toLowerCase().includes(q) || c.client_phone.includes(q);
    }
    return true;
  });

  async function handleTakeover() {
    if (!activeId) return;
    try {
      await api.post(`/api/conversations/${activeId}/takeover`);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, status: "human_takeover" } : c))
      );
    } catch { /* silencioso */ }
  }

  async function handleResume() {
    if (!activeId) return;
    try {
      await api.post(`/api/conversations/${activeId}/resume`);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, status: "active" } : c))
      );
    } catch { /* silencioso */ }
  }

  async function handleSend() {
    if (!activeId || !draft.trim() || !isHumanTakeover) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await api.post<{ ok: boolean; message: Message }>(
        `/api/conversations/${activeId}/messages`,
        { content: draft.trim() }
      );
      setMessages((prev) => [...prev, res.message]);
      setDraft("");
      // Atualiza preview na lista
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, last_message: draft.trim(), last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Atendimento</h1>
            <p className="text-sm text-muted-foreground">
              Inbox das conversas do WhatsApp, ao vivo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
            <Circle className="h-2 w-2 fill-current" /> WhatsApp
          </span>
        </div>
      </div>

      {/* Layout 3 colunas */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr_280px]">

        {/* Lista de conversas */}
        <aside className="card-soft flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="h-9 w-full rounded-lg border border-border bg-surface-2/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
              />
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto text-[11px]">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    "shrink-0 rounded-full border px-2.5 py-1 transition",
                    filter === f
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loadingList ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Nenhuma conversa.
            </div>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {visible.map((c) => {
                const isActive = c.id === activeId;
                const ini = initials(c.client_name, c.client_phone);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={[
                        "flex w-full items-start gap-3 px-3 py-3 text-left transition",
                        isActive ? "bg-primary/10" : "hover:bg-surface-2/60",
                      ].join(" ")}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {ini}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {displayName(c)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {relativeTime(c.last_message_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {c.last_message ?? "Sem mensagens"}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            {c.status === "human_takeover" ? (
                              <>
                                <UserRound className="h-3 w-3" /> Você
                              </>
                            ) : (
                              <>
                                <Bot className="h-3 w-3" /> IA
                              </>
                            )}
                          </span>
                          {c.status === "resolved" && (
                            <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              encerrada
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Thread */}
        <section className="card-soft flex min-h-0 flex-col overflow-hidden">
          {!activeConv ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Selecione uma conversa.
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {initials(activeConv.client_name, activeConv.client_phone)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{displayName(activeConv)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {activeConv.client_phone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Banner handoff */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {isHumanTakeover ? (
                    <span>Você está no controle desta conversa.</span>
                  ) : (
                    <span>Assistente respondendo automaticamente por você.</span>
                  )}
                </div>
                <button
                  onClick={isHumanTakeover ? handleResume : handleTakeover}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    !isHumanTakeover
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {isHumanTakeover ? "Devolver para IA" : "Assumir conversa"}
                </button>
              </div>

              {/* Mensagens */}
              <div
                ref={threadRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5"
              >
                {loadingThread ? (
                  <div className="flex items-center justify-center pt-8 text-sm text-muted-foreground">
                    Carregando mensagens...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center pt-8 text-sm text-muted-foreground">
                    Nenhuma mensagem nesta conversa.
                  </div>
                ) : (
                  <>
                    <div className="mx-auto w-fit rounded-full bg-surface-2/60 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Histórico
                    </div>
                    {messages.map((m, i) => {
                      const isAssistant = m.role === "assistant";
                      const time = new Date(m.sent_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit", minute: "2-digit",
                      });
                      return (
                        <div
                          key={m.id}
                          className={["flex", isAssistant ? "justify-end" : "justify-start"].join(" ")}
                        >
                          <div
                            className={[
                              "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                              isAssistant
                                ? "bg-primary/15 text-foreground"
                                : "bg-surface-2/80 text-foreground",
                            ].join(" ")}
                          >
                            {isAssistant && (
                              <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
                                <Sparkles className="h-3 w-3" /> Assistente
                              </div>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                              {time}
                              {isAssistant &&
                                (i === messages.length - 1 ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <CheckCheck className="h-3 w-3" />
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-border p-3">
                {sendError && (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                    {sendError}
                    <button onClick={() => setSendError(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-2/60 p-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={
                      isHumanTakeover
                        ? "Escreva uma mensagem (Enter para enviar)"
                        : "IA está respondendo... assuma para digitar."
                    }
                    disabled={!isHumanTakeover || sending}
                    className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!isHumanTakeover || !draft.trim() || sending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending ? "..." : "Enviar"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {QUICK_ACTIONS.map((s) => (
                    <button
                      key={s}
                      disabled={!isHumanTakeover}
                      onClick={() => setDraft((d) => (d ? d + " " + s : s))}
                      className="rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Painel direito — contexto do paciente */}
        <aside className="card-soft hidden min-h-0 flex-col overflow-y-auto p-5 xl:flex">
          {!activeConv ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              —
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                  {initials(activeConv.client_name, activeConv.client_phone)}
                </div>
                <div className="mt-3 text-sm font-semibold">{displayName(activeConv)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {activeConv.client_phone}
                </div>
                {activeConv.client_id && (
                  <a
                    href={`/pacientes/${activeConv.client_id}`}
                    className="mt-3 inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Ver ficha completa
                  </a>
                )}
              </div>

              {activeConv.client_goal && (
                <div className="mt-5 space-y-4 text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                      Objetivo
                    </div>
                    <div className="mt-0.5 font-medium">{activeConv.client_goal}</div>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground/70">
                  Status da conversa
                </div>
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    activeConv.status === "human_takeover"
                      ? "bg-primary/15 text-primary"
                      : activeConv.status === "resolved"
                      ? "bg-surface-2 text-muted-foreground"
                      : "bg-primary/10 text-primary",
                  ].join(" ")}
                >
                  {activeConv.status === "human_takeover"
                    ? "Você está atendendo"
                    : activeConv.status === "resolved"
                    ? "Encerrada"
                    : "IA respondendo"}
                </span>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
