"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AvailabilityDay, BlockedDate, DateLocationOverride, Location } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarOffIcon, MapPinIcon, Trash2Icon, PlusIcon } from "lucide-react";

// A API pode devolver DATE como "YYYY-MM-DD" puro ou timestamp ISO completo
// (driver do Postgres) — normaliza pra sempre usar só a data, sem shift de fuso.
function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DisponibilidadePage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [overrides, setOverrides] = useState<DateLocationOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDays, setSavingDays] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [blockDate, setBlockDate] = useState(todayIso());
  const [blockReason, setBlockReason] = useState("");
  const [overrideDate, setOverrideDate] = useState(todayIso());
  const [overrideLocation, setOverrideLocation] = useState<string>("");

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
      setBlocked(blockedRes.blocked.map((b) => ({ ...b, blocked_date: shortDate(b.blocked_date) })));
      setOverrides(overridesRes.overrides.map((o) => ({ ...o, date: shortDate(o.date) })));
      if (locRes.locations.length > 0 && !overrideLocation) {
        setOverrideLocation(locRes.locations[0].id);
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar disponibilidade");
    } finally {
      setLoading(false);
    }
  }

  function updateDay(dayOfWeek: number, patch: Partial<AvailabilityDay>) {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d))
    );
  }

  async function saveDays() {
    setSavingDays(true);
    setMessage(null);
    try {
      await api.put("/api/availability", { availability: days });
      setMessage("Horários salvos! Já valem no próximo atendimento da IA.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar horários");
    } finally {
      setSavingDays(false);
    }
  }

  async function addBlockedDate() {
    try {
      const { blocked: row } = await api.post<{ blocked: BlockedDate }>(
        "/api/availability/blocked",
        { blocked_date: blockDate, reason: blockReason || undefined }
      );
      const normalized = { ...row, blocked_date: shortDate(row.blocked_date) };
      setBlocked((prev) => {
        const withoutDup = prev.filter((b) => b.blocked_date !== normalized.blocked_date);
        return [...withoutDup, normalized].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date));
      });
      setBlockReason("");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao bloquear data");
    }
  }

  async function removeBlockedDate(date: string) {
    await api.delete(`/api/availability/blocked/${date}`);
    setBlocked((prev) => prev.filter((b) => b.blocked_date !== date));
  }

  async function addOverride() {
    if (!overrideLocation) return;
    try {
      const location = locations.find((l) => l.id === overrideLocation);
      const { override } = await api.post<{ override: { id: string; date: string; location_id: string } }>(
        "/api/availability/date-locations",
        { date: overrideDate, location_id: overrideLocation }
      );
      const normalizedDate = shortDate(override.date);
      setOverrides((prev) => {
        const withoutDup = prev.filter((o) => o.date !== normalizedDate);
        return [
          ...withoutDup,
          {
            id: override.id,
            date: normalizedDate,
            location_id: override.location_id,
            location_name: location?.name ?? null,
            modality: location?.modality ?? null,
            color: location?.color ?? null,
          },
        ].sort((a, b) => a.date.localeCompare(b.date));
      });
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao definir cidade do dia");
    }
  }

  async function removeOverride(date: string) {
    await api.delete(`/api/availability/date-locations/${date}`);
    setOverrides((prev) => prev.filter((o) => o.date !== date));
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">
        Carregando disponibilidade...
      </div>
    );
  }

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

      {locations.length === 0 && (
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Você ainda não tem locais de atendimento cadastrados. Cadastre em Configurações
          antes de definir a cidade de cada dia.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinIcon className="size-4 text-primary" />
            Cidade de cada dia
          </CardTitle>
          <CardDescription>
            Defina qual local você atende em uma data específica — é isso que a IA oferece
            para marcar consulta. Cadastre quantas datas quiser, em qualquer local.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="override-date">Data</Label>
              <Input
                id="override-date"
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Local</Label>
              <Select value={overrideLocation} onValueChange={setOverrideLocation}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                      {l.city ? ` — ${l.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addOverride} disabled={!overrideLocation}>
              <PlusIcon />
              Definir
            </Button>
          </div>

          {overrides.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((o) => (
                  <TableRow key={o.date}>
                    <TableCell className="font-medium">{formatDate(o.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={o.color ? { borderColor: o.color, color: o.color } : undefined}
                      >
                        {o.location_name ?? "Sem local"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeOverride(o.date)}
                        aria-label="Remover"
                      >
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma data com local definido ainda.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarOffIcon className="size-4 text-destructive" />
            Dias sem atendimento
          </CardTitle>
          <CardDescription>
            &quot;Não vou atender neste dia&quot; — bloqueia a data inteira, mesmo que já tenha local definido.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-date">Data</Label>
              <Input
                id="block-date"
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-reason">Motivo (opcional)</Label>
              <Input
                id="block-reason"
                placeholder="Ex: viagem, feriado..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-56"
              />
            </div>
            <Button variant="outline" onClick={addBlockedDate}>
              <PlusIcon />
              Bloquear dia
            </Button>
          </div>

          {blocked.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocked.map((b) => (
                  <TableRow key={b.blocked_date}>
                    <TableCell className="font-medium">{formatDate(b.blocked_date)}</TableCell>
                    <TableCell className="text-muted-foreground">{b.reason ?? "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeBlockedDate(b.blocked_date)}
                        aria-label="Remover bloqueio"
                      >
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum dia bloqueado no momento.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horário padrão por dia da semana</CardTitle>
          <CardDescription>
            Base geral de horários (duração da consulta e pausa). A cidade de cada dia é
            definida acima — este bloco só cuida do horário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-border">
            {days.map((day) => (
              <div
                key={day.day_of_week}
                className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex w-36 items-center gap-2">
                  <Switch
                    checked={day.is_active}
                    onCheckedChange={(checked) => updateDay(day.day_of_week, { is_active: checked })}
                  />
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={day.start_time}
                    disabled={!day.is_active}
                    onChange={(e) => updateDay(day.day_of_week, { start_time: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={day.end_time}
                    disabled={!day.is_active}
                    onChange={(e) => updateDay(day.day_of_week, { end_time: e.target.value })}
                    className="w-28"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Consulta de</span>
                  <Input
                    type="number"
                    min={15}
                    step={5}
                    value={day.slot_duration}
                    disabled={!day.is_active}
                    onChange={(e) =>
                      updateDay(day.day_of_week, { slot_duration: Number(e.target.value) })
                    }
                    className="w-20"
                  />
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
    </div>
  );
}

function formatDate(iso: string) {
  // A API pode retornar DATE como "YYYY-MM-DD" puro ou como timestamp ISO
  // completo (driver do Postgres serializando para Date) — usamos só os
  // 10 primeiros caracteres pra sempre pegar a data local, sem shift de fuso.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
