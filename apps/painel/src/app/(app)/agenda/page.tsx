"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  X,
  CircleDollarSign,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { LOCATION_PALETTE } from "@/lib/location-palette";
import { LocationBadge } from "@/components/location-badge";

type Appointment = {
  id: string;
  client_name: string;
  client_phone: string;
  scheduled_at: string;
  city: string | null;
  location_name: string | null;
  location_id: string | null;
  modality: string;
  status: string;
  notes: string | null;
  payment_status: "pending" | "paid" | null;
};

const WEEK_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Derivar uma cor consistente para qualquer cidade/local usando a paleta curada
function locationColor(name: string | null): string {
  if (!name) return LOCATION_PALETTE[9].hex; // slate para online ou vazio
  const idx = Math.abs(
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  ) % LOCATION_PALETTE.length;
  return LOCATION_PALETTE[idx].hex;
}

function displayName(a: Appointment): string {
  if (a.modality === "online") return "Online";
  return a.location_name ?? a.city ?? "Presencial";
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseLocalDate(iso: string): Date {
  // Evita timezone offset: 2026-07-07T10:00:00.000Z → new Date aqui seria UTC
  const parts = iso.split("T")[0].split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// --- Dialog de nova consulta ---
type NewApptForm = {
  client_name: string;
  client_phone: string;
  date: string;
  time: string;
  modality: "presencial" | "online";
  location_id: string;
  notes: string;
};

function NewApptDialog({
  defaultDate,
  locations,
  onClose,
  onCreated,
}: {
  defaultDate: string;
  locations: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<NewApptForm>({
    client_name: "",
    client_phone: "",
    date: defaultDate,
    time: "09:00",
    modality: "presencial",
    location_id: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof NewApptForm>(key: K, value: NewApptForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.client_phone.trim()) {
      setError("Telefone é obrigatório");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const scheduled_at = `${form.date}T${form.time}:00`;
      await api.post("/api/appointments/manual", {
        client_name: form.client_name.trim() || undefined,
        client_phone: form.client_phone.trim(),
        scheduled_at,
        modality: form.modality,
        location_id: form.location_id || undefined,
        notes: form.notes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar consulta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card-soft w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Nova consulta</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Nome do paciente</span>
            <input
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              placeholder="Opcional"
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Telefone *</span>
            <input
              value={form.client_phone}
              onChange={(e) => set("client_phone", e.target.value)}
              placeholder="27 99999-9999"
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Data</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Horário</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Modalidade</span>
            <select
              value={form.modality}
              onChange={(e) => set("modality", e.target.value as "presencial" | "online")}
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </label>

          {form.modality === "presencial" && locations.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Local</span>
              <select
                value={form.location_id}
                onChange={(e) => set("location_id", e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              >
                <option value="">Selecionar local</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Observações</span>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Criando..." : "Criar consulta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Dialog de edição de consulta existente ---
function EditApptDialog({
  appt,
  locations,
  onClose,
  onSaved,
}: {
  appt: Appointment;
  locations: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const dt = new Date(appt.scheduled_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [form, setForm] = useState({
    client_name: appt.client_name ?? "",
    client_phone: appt.client_phone ?? "",
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    modality: (appt.modality === "online" ? "online" : "presencial") as "presencial" | "online",
    location_id: appt.location_id ?? "",
    notes: appt.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(appt.payment_status);
  const [togglingPayment, setTogglingPayment] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function togglePayment() {
    const next = paymentStatus === "paid" ? "pending" : "paid";
    setTogglingPayment(true);
    setError(null);
    try {
      await api.put(`/api/appointments/${appt.id}`, { payment_status: next });
      setPaymentStatus(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar pagamento");
    } finally {
      setTogglingPayment(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/appointments/${appt.id}`, {
        client_name: form.client_name.trim() || undefined,
        client_phone: form.client_phone.trim() || undefined,
        scheduled_at: `${form.date}T${form.time}:00`,
        modality: form.modality,
        location_id: form.modality === "presencial" ? (form.location_id || null) : null,
        notes: form.notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar consulta");
    } finally {
      setSaving(false);
    }
  }

  async function cancelAppt() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/appointments/${appt.id}/status`, { status: "cancelled" });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cancelar consulta");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAppt() {
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/appointments/${appt.id}`);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao excluir consulta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card-soft w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Editar consulta</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {paymentStatus && (
          <button
            onClick={togglePayment}
            disabled={togglingPayment}
            className={[
              "mb-5 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition disabled:opacity-50",
              paymentStatus === "pending"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                : "border-primary/40 bg-primary/10 text-primary",
            ].join(" ")}
          >
            <span className="flex items-center gap-2 font-medium">
              <CircleDollarSign className="h-3.5 w-3.5" />
              {paymentStatus === "pending" ? "Pagamento pendente" : "Pago"}
            </span>
            <span className="underline">
              {togglingPayment ? "..." : paymentStatus === "pending" ? "Marcar como pago" : "Marcar como pendente"}
            </span>
          </button>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Nome do paciente</span>
            <input
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Telefone</span>
            <input
              value={form.client_phone}
              onChange={(e) => set("client_phone", e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Data</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Horário</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Modalidade</span>
            <select
              value={form.modality}
              onChange={(e) => set("modality", e.target.value as "presencial" | "online")}
              className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </label>

          {form.modality === "presencial" && locations.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Local</span>
              <select
                value={form.location_id}
                onChange={(e) => set("location_id", e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              >
                <option value="">Selecionar local</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Observações</span>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
            />
          </label>
        </div>

        {confirmDelete ? (
          <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">Excluir apaga a consulta definitivamente. Confirma?</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={deleteAppt}
                disabled={saving}
                className="h-8 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {saving ? "Excluindo..." : "Sim, excluir"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={saving}
                className="h-8 rounded-lg border border-border px-3 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="h-9 rounded-lg border border-destructive/50 px-3 text-xs text-destructive disabled:opacity-50"
              >
                Excluir
              </button>
              {appt.status !== "cancelled" && (
                <button
                  onClick={cancelAppt}
                  disabled={saving}
                  className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Cancelar consulta
                </button>
              )}
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Dialog do dia: lista de consultas + atalho pra criar nova ---
function DayDialog({
  date,
  appts,
  locations,
  onClose,
  onChanged,
}: {
  date: string;
  appts: Appointment[];
  locations: { id: string; name: string }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);
  const [year, month, day] = date.split("-").map(Number);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card-soft w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold">
              {day} de {MONTH_NAMES[month - 1]}, {year}
            </h2>
            <p className="text-xs text-muted-foreground">{appts.length} consulta(s)</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {appts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma consulta neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {appts
              .slice()
              .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
              .map((a) => {
                const label = displayName(a);
                const color = a.modality === "online" ? "#7ECEF4" : locationColor(label);
                const hour = new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => setEditing(a)}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary/40",
                        a.status === "cancelled" ? "border-border/60 opacity-50" : "border-border bg-surface-2/40",
                      ].join(" ")}
                    >
                      <div className="flex w-14 shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                        <Clock className="h-3 w-3" /> {hour}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{a.client_name ?? "Paciente"}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <LocationBadge color={color} name={label} />
                          {a.payment_status === "pending" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                              <CircleDollarSign className="h-2.5 w-2.5" /> Pendente
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

        <button
          onClick={() => setCreating(true)}
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Nova consulta neste dia
        </button>
      </div>

      {editing && (
        <EditApptDialog
          appt={editing}
          locations={locations}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged(); }}
        />
      )}
      {creating && (
        <NewApptDialog
          defaultDate={date}
          locations={locations}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); onChanged(); }}
        />
      )}
    </div>
  );
}

// --- Linha de consulta na coluna lateral ---
function ApptRow({
  a,
  withDay = false,
}: {
  a: Appointment & { day?: number };
  withDay?: boolean;
}) {
  const label = displayName(a);
  const color = a.modality === "online" ? "#7ECEF4" : locationColor(label);
  const dt = new Date(a.scheduled_at);
  const hour = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dayNum = dt.getDate();
  const monthShort = MONTH_NAMES[dt.getMonth()].slice(0, 3);

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="flex w-14 shrink-0 flex-col text-primary">
        {withDay && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {monthShort} {dayNum}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-sm font-semibold">
          <Clock className="h-3 w-3" /> {hour}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{a.client_name}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <LocationBadge color={color} name={label} />
        </div>
      </div>
    </li>
  );
}

// --- Página principal ---
export default function AgendaPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [filterCity, setFilterCity] = useState<string>("todas");
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [dayDialog, setDayDialog] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const firstDay = isoDate(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const lastDay = isoDate(year, month, daysInMonth);
      const res = await api.get<{ appointments: Appointment[] }>(
        `/api/appointments?start=${firstDay}&end=${lastDay}`
      );
      setAppointments(res.appointments);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get<{ locations: { id: string; name: string }[] }>("/api/locations")
      .then((r) => setLocations(r.locations ?? []))
      .catch(() => {});
  }, []);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDay = today.getFullYear() === year && today.getMonth() === month
    ? today.getDate()
    : null;

  function apptDay(a: Appointment): number {
    return new Date(a.scheduled_at).getDate();
  }

  // Cidades/locais presentes nos dados reais
  const allLocations = Array.from(
    new Set(appointments.map((a) => displayName(a)))
  ).sort();

  const filteredAppts = filterCity === "todas"
    ? appointments
    : appointments.filter((a) => displayName(a) === filterCity);

  const todaysAppts = filteredAppts.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d.getFullYear() === today.getFullYear()
      && d.getMonth() === today.getMonth()
      && d.getDate() === today.getDate();
  });

  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekAppts = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d >= weekStart && d < weekEnd;
  });

  const upcoming = filteredAppts.filter((a) => {
    const d = new Date(a.scheduled_at);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return d >= todayStart;
  }).slice(0, 6);

  const defaultDate = isoDate(year, month, todayDay ?? 1);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {showNewAppt && (
        <NewApptDialog
          defaultDate={defaultDate}
          locations={locations}
          onClose={() => setShowNewAppt(false)}
          onCreated={() => { setShowNewAppt(false); load(); }}
        />
      )}

      {dayDialog && (
        <DayDialog
          date={dayDialog}
          appts={appointments.filter((a) => {
            const d = new Date(a.scheduled_at);
            return isoDate(d.getFullYear(), d.getMonth(), d.getDate()) === dayDialog;
          })}
          locations={locations}
          onClose={() => setDayDialog(null)}
          onChanged={() => { load(); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Calendário das consultas presenciais e online.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allLocations.length > 1 && (
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-xs text-muted-foreground outline-none hover:text-foreground"
            >
              <option value="todas">Todas as cidades</option>
              {allLocations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowNewAppt(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Nova consulta
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        <div className="card-soft p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Hoje</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight">
              {loading ? "—" : todaysAppts.length}
            </span>
            <span className="text-xs text-muted-foreground">consultas</span>
          </div>
        </div>
        <div className="card-soft p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Semana</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight">
              {loading ? "—" : weekAppts.length}
            </span>
            <span className="text-xs text-muted-foreground">consultas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Calendário */}
        <div className="card-soft xl:col-span-2 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">
                {MONTH_NAMES[month]}, {year}
              </h2>
              <p className="text-xs text-muted-foreground">Visão mensal</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="h-8 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] uppercase tracking-widest text-muted-foreground/70">
            {WEEK_LABELS.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="h-20 rounded-lg" />;
              const dayAppts = filteredAppts.filter((a) => apptDay(a) === d);
              const isToday = d === todayDay;
              return (
                <button
                  key={i}
                  onClick={() => setDayDialog(isoDate(year, month, d))}
                  className={[
                    "flex h-20 flex-col gap-1 rounded-lg border p-1.5 text-left transition",
                    isToday
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-surface-2/40 hover:border-primary/40",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "text-[11px] font-medium",
                      isToday ? "text-primary" : "text-foreground/80",
                    ].join(" ")}
                  >
                    {d}
                  </div>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayAppts.slice(0, 2).map((a, idx) => {
                      const label = displayName(a);
                      const color = a.modality === "online" ? "#7ECEF4" : locationColor(label);
                      const hour = new Date(a.scheduled_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit", minute: "2-digit",
                      });
                      return (
                        <LocationBadge
                          key={idx}
                          color={color}
                          name={`${hour} ${(a.client_name ?? "Paciente").split(" ")[0]}`}
                        />
                      );
                    })}
                    {dayAppts.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayAppts.length - 2}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legenda dinâmica */}
          {allLocations.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="text-[11px] text-muted-foreground">Local:</span>
              {allLocations.map((loc) => {
                const color = loc === "Online" ? "#7ECEF4" : locationColor(loc);
                return <LocationBadge key={loc} color={color} name={loc} />;
              })}
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-6">
          <div className="card-soft p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Hoje</h2>
              <span className="text-xs text-muted-foreground">
                {today.getDate()} de {MONTH_NAMES[today.getMonth()]}
              </span>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
            ) : todaysAppts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhuma consulta hoje.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {todaysAppts.map((a) => (
                  <ApptRow key={a.id} a={a} />
                ))}
              </ul>
            )}
          </div>

          <div className="card-soft p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Próximos dias</h2>
              <span className="text-xs text-muted-foreground">{upcoming.length}</span>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
            ) : upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhuma consulta próxima.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {upcoming.map((a) => (
                  <ApptRow key={a.id} a={a} withDay />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
