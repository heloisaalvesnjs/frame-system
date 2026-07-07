"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Search, Phone, Target, MessageCircle, Calendar, X } from "lucide-react";

type ClientRow = {
  id: string;
  name: string | null;
  phone: string;
  goal: string | null;
  appointment_count: number;
  completed_count: number;
  last_contact: string | null;
};

type StatusType = "ativo" | "lead";

const statusStyles: Record<StatusType, string> = {
  ativo: "bg-primary/15 text-primary",
  lead: "bg-food-fat/20 text-food-fat",
};

function deriveStatus(c: ClientRow): StatusType {
  return c.appointment_count > 0 ? "ativo" : "lead";
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days !== 1 ? "s" : ""}`;
}

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

// ── Dialog novo paciente ──────────────────────────────────────────────────────
function NewPatientDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/clients", { name: name.trim() || null, phone: phone.trim() });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar paciente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Novo paciente</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Nome (opcional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              placeholder="Nome do paciente"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">WhatsApp *</span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              placeholder="5527999990000"
            />
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-70"
            >
              {saving ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PacientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load(q: string) {
    setLoading(true);
    try {
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await api.get<{ clients: ClientRow[] }>(`/api/clients${query}`);
      setClients(res.clients);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${clients.length} ${clients.length === 1 ? "pessoa" : "pessoas"} em acompanhamento.`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="h-10 w-72 rounded-lg border border-border bg-surface-2/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110 whitespace-nowrap"
          >
            + Novo paciente
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Paciente</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Objetivo</th>
              <th className="hidden px-5 py-3 font-medium lg:table-cell">Consultas</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Último contato</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {!loading && clients.map((c) => {
              const status = deriveStatus(c);
              return (
                <tr
                  key={c.id}
                  className="group cursor-pointer border-b border-border/60 transition hover:bg-surface-2/30 last:border-b-0"
                  onClick={() => router.push(`/pacientes/${c.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary shrink-0">
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.name ?? "Sem nome"}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {formatPhone(c.phone)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 md:table-cell">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[160px]">{c.goal ?? "—"}</span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 text-sm lg:table-cell">
                    {c.completed_count}/{c.appointment_count}
                  </td>
                  <td className="hidden px-5 py-3.5 text-sm text-muted-foreground sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {formatRelative(c.last_contact)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-xs text-primary opacity-0 transition group-hover:opacity-100">
                      Abrir →
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Calendar className="h-6 w-6" />
            Nenhum paciente encontrado.
          </div>
        )}

        {loading && (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        )}
      </div>

      {showNew && (
        <NewPatientDialog onClose={() => setShowNew(false)} onCreated={() => load(search)} />
      )}
    </div>
  );
}
