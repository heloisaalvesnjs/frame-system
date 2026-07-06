"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type {
  AvailabilityDay,
  BlockedDate,
  DateLocationOverride,
  Location,
  OnlineAvailability,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  MonitorIcon,
  CalendarOffIcon,
} from "lucide-react";

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function shortDate(s: string) {
  return s.slice(0, 10);
}

export default function DisponibilidadePage() {
  const [tab, setTab] = useState<"presencial" | "online">("presencial");
  const [locations, setLocations] = useState<Location[]>([]);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [blocked, setBlocked] = useState<Map<string, string | null>>(new Map());
  const [overrides, setOverrides] = useState<Map<string, DateLocationOverride>>(new Map());
  const [online, setOnline] = useState<OnlineAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  const [dayDialog, setDayDialog] = useState<string | null>(null);
  const [dialogCity, setDialogCity] = useState<string>("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [locRes, availRes, blockedRes, overridesRes] = await Promise.all([
        api.get<{ locations: Location[] }>("/api/locations"),
        api.get<{ availability: AvailabilityDay[] }>("/api/availability"),
        api.get<{ blocked: BlockedDate[] }>("/api/availability/blocked"),
        api.get<{ overrides: DateLocationOverride[] }>("/api/availability/date-locations"),
      ]);
      setLocations(locRes.locations);
      setDays(availRes.availability);
      setBlocked(new Map(blockedRes.blocked.map((b) => [shortDate(b.blocked_date), b.reason])));
      setOverrides(
        new Map(overridesRes.overrides.map((o) => [shortDate(o.date), { ...o, date: shortDate(o.date) }]))
      );
      // Config online é opcional: endpoint pode ainda não estar deployado (janela
      // de deploy). Não pode derrubar o resto da tela — cai num default local.
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

  // ── Calendário ──────────────────────────────────────────────────────────
  const grid = useMemo(() => {
    const firstDow = new Date(viewY, viewM, 1).getDay();
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewY, viewM]);

  function prevMonth() {
    if (viewM === 0) { setViewY(viewY - 1); setViewM(11); }
    else setViewM(viewM - 1);
  }
  function nextMonth() {
    if (viewM === 11) { setViewY(viewY + 1); setViewM(0); }
    else setViewM(viewM + 1);
  }

  function openDay(d: number) {
    const key = iso(viewY, viewM, d);
    setDayDialog(key);
    setDialogCity(overrides.get(key)?.location_id ?? "");
  }

  async function saveDayCity() {
    if (!dayDialog || !dialogCity) return;
    try {
      const loc = locations.find((l) => l.id === dialogCity);
      await api.post("/api/availability/date-locations", { date: dayDialog, location_id: dialogCity });
      // Se estava bloqueado, desbloqueia (definir local implica atender)
      if (blocked.has(dayDialog)) {
        await api.delete(`/api/availability/blocked/${dayDialog}`).catch(() => {});
        setBlocked((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
      }
      setOverrides((prev) => {
        const n = new Map(prev);
        n.set(dayDialog, {
          id: dayDialog, date: dayDialog, location_id: dialogCity,
          location_name: loc?.name ?? null, modality: loc?.modality ?? null, color: loc?.color ?? null,
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
      // Remove override se existir (dia sem atendimento não tem cidade)
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
    if (overrides.has(dayDialog)) {
      await api.delete(`/api/availability/date-locations/${dayDialog}`).catch(() => {});
    }
    if (blocked.has(dayDialog)) {
      await api.delete(`/api/availability/blocked/${dayDialog}`).catch(() => {});
    }
    setOverrides((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
    setBlocked((prev) => { const n = new Map(prev); n.delete(dayDialog); return n; });
    setDayDialog(null);
  }

  // ── Online ──────────────────────────────────────────────────────────────
  const [savingOnline, setSavingOnline] = useState(false);
  function toggleWeekday(wd: number) {
    if (!online) return;
    const has = online.online_weekdays.includes(wd);
    setOnline({
      ...online,
      online_weekdays: has
        ? online.online_weekdays.filter((d) => d !== wd)
        : [...online.online_weekdays, wd].sort(),
    });
  }
  async function saveOnline() {
    if (!online) return;
    setSavingOnline(true);
    setMessage(null);
    try {
      await api.put("/api/nutritionists/online-availability", online);
      setMessage("Atendimento online salvo! A IA já oferece esses dias e horários.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar online");
    } finally {
      setSavingOnline(false);
    }
  }

  // ── Horário presencial (grade semanal) ─────────────────────────────────
  const [savingDays, setSavingDays] = useState(false);
  function updateDay(dow: number, patch: Partial<AvailabilityDay>) {
    setDays((prev) => prev.map((d) => (d.day_of_week === dow ? { ...d, ...patch } : d)));
  }
  async function saveDays() {
    setSavingDays(true);
    try {
      await api.put("/api/availability", { availability: days });
      setMessage("Horários presenciais salvos.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar horários");
    } finally {
      setSavingDays(false);
    }
  }

  if (loading) {
    return <div className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">Carregando...</div>;
  }

  const dialogOverride = dayDialog ? overrides.get(dayDialog) : null;
  const dialogBlocked = dayDialog ? blocked.has(dayDialog) : false;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Disponibilidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Onde e quando você atende — a IA só oferece o que estiver liberado aqui.
        </p>
      </div>

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      {/* Segmented control */}
      <div className="inline-flex w-fit rounded-lg border border-border bg-muted/40 p-1">
        <button
          onClick={() => setTab("presencial")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "presencial" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <MapPinIcon className="size-4" /> Presencial
        </button>
        <button
          onClick={() => setTab("online")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "online" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <MonitorIcon className="size-4" /> Online
        </button>
      </div>

      {tab === "presencial" ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Calendário presencial</CardTitle>
                  <CardDescription>
                    Clique num dia para escolher a cidade que você atende ou marcar como fechado.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS_SHORT.map((w) => (
                  <div key={w} className="pb-2 text-xs font-medium text-muted-foreground">{w}</div>
                ))}
                {grid.map((d, i) => {
                  if (d === null) return <div key={i} />;
                  const key = iso(viewY, viewM, d);
                  const ov = overrides.get(key);
                  const isBlocked = blocked.has(key);
                  const isPast =
                    new Date(viewY, viewM, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  return (
                    <button
                      key={i}
                      onClick={() => openDay(d)}
                      className={`flex min-h-16 flex-col items-start gap-1 rounded-md border p-1.5 text-left transition-colors hover:border-primary ${
                        isPast ? "opacity-40" : ""
                      } ${isBlocked ? "border-destructive/40 bg-destructive/5" : "border-border"}`}
                    >
                      <span className="text-xs font-medium">{d}</span>
                      {ov && (
                        <span
                          className="line-clamp-2 w-full rounded px-1 py-0.5 text-[10px] font-medium leading-tight"
                          style={{
                            backgroundColor: (ov.color ?? "#2E7D32") + "22",
                            color: ov.color ?? "#2E7D32",
                          }}
                        >
                          {ov.location_name}
                        </span>
                      )}
                      {isBlocked && (
                        <span className="text-[10px] font-medium text-destructive">Fechado</span>
                      )}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horário presencial por dia da semana</CardTitle>
              <CardDescription>
                Os horários usados nas datas que você marcou no calendário acima.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y divide-border">
                {days.map((day) => (
                  <div key={day.day_of_week} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex w-32 items-center gap-2">
                      <Switch
                        checked={day.is_active}
                        onCheckedChange={(c) => updateDay(day.day_of_week, { is_active: c })}
                      />
                      <span className="text-sm font-medium">{day.label}</span>
                    </div>
                    <Input type="time" value={day.start_time} disabled={!day.is_active}
                      onChange={(e) => updateDay(day.day_of_week, { start_time: e.target.value })} className="w-28" />
                    <span className="text-sm text-muted-foreground">até</span>
                    <Input type="time" value={day.end_time} disabled={!day.is_active}
                      onChange={(e) => updateDay(day.day_of_week, { end_time: e.target.value })} className="w-28" />
                    <div className="flex items-center gap-2">
                      <Input type="number" min={15} step={5} value={day.slot_duration} disabled={!day.is_active}
                        onChange={(e) => updateDay(day.day_of_week, { slot_duration: Number(e.target.value) })} className="w-20" />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={saveDays} disabled={savingDays}>
                {savingDays ? "Salvando..." : "Salvar horários"}
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : (
        online && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MonitorIcon className="size-4 text-primary" />
                Atendimento online
              </CardTitle>
              <CardDescription>
                Dias da semana e horário em que você atende online — independente do presencial.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Atendo online</p>
                  <p className="text-sm text-muted-foreground">Se desligado, a IA não oferece consulta online.</p>
                </div>
                <Switch
                  checked={online.online_enabled}
                  onCheckedChange={(c) => setOnline({ ...online, online_enabled: c })}
                />
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
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {WEEKDAYS_SHORT[wd]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="on-start">Início</Label>
                  <Input id="on-start" type="time" value={online.online_start} disabled={!online.online_enabled}
                    onChange={(e) => setOnline({ ...online, online_start: e.target.value })} className="w-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="on-end">Fim</Label>
                  <Input id="on-end" type="time" value={online.online_end} disabled={!online.online_enabled}
                    onChange={(e) => setOnline({ ...online, online_end: e.target.value })} className="w-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="on-dur">Duração (min)</Label>
                  <Input id="on-dur" type="number" min={15} step={5} value={online.online_slot_duration}
                    disabled={!online.online_enabled}
                    onChange={(e) => setOnline({ ...online, online_slot_duration: Number(e.target.value) })} className="w-24" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={saveOnline} disabled={savingOnline}>
                {savingOnline ? "Salvando..." : "Salvar online"}
              </Button>
            </CardFooter>
          </Card>
        )
      )}

      {/* Dialog do dia */}
      <Dialog open={!!dayDialog} onOpenChange={(o) => !o && setDayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dayDialog && formatFull(dayDialog)}
            </DialogTitle>
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
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o local" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}{l.city ? ` — ${l.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={blockDay} className="text-destructive">
              <CalendarOffIcon /> Não atendo neste dia
            </Button>
            <div className="flex gap-2">
              {(dialogOverride || dialogBlocked) && (
                <Button variant="ghost" onClick={clearDay}>Limpar</Button>
              )}
              <Button onClick={saveDayCity} disabled={!dialogCity}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatFull(isoStr: string) {
  const [y, m, d] = isoStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}
