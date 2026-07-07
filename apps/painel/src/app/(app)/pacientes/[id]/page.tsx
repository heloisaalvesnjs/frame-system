"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, getToken, ApiError } from "@/lib/api";
import type { ClientDetail, Meal, MealItem, TacoFood } from "@/lib/meal-types";
import { calcMacros, getSubstitutions } from "@/lib/foods";
import { FoodSwapSheet, CategoryIcon } from "@/components/food-swap-sheet";
import { SectionGroup } from "@/components/section-group";
import {
  ArrowLeft,
  Phone,
  Target,
  CalendarClock,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
  Sparkles,
  ClipboardList,
  User,
  UtensilsCrossed,
  FileText,
  Ruler,
  Upload,
  Download,
  X,
} from "lucide-react";
import { categorize } from "@/lib/food-category";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function fmtNum(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = parseFloat(v);
  return isNaN(n) ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AnamnesisData = {
  queixa_principal?: string;
  historico_saude?: string;
  medicamentos?: string;
  alergias_intolerancias?: string;
  cirurgias_previas?: string;
  historico_familiar?: string;
  rotina_alimentar?: string;
  horas_sono?: string;
  qualidade_sono?: string;
  nivel_atividade_fisica?: string;
  consumo_agua?: string;
  consumo_alcool_fumo?: string;
  objetivo_detalhado?: string;
  observacoes_nutri?: string;
};

type Anamnesis = { id: string; data: AnamnesisData; updated_at: string; created_at: string } | null;

type WeightLog = {
  id: string;
  weight_kg: string | null;
  waist_cm: string | null;
  hip_cm: string | null;
  notes: string | null;
  logged_at: string;
};

type PatientDocument = {
  id: string;
  original_name: string;
  description: string | null;
  mimetype: string;
  size_bytes: number;
  created_at: string;
  filename: string;
};

type Tab = "plano" | "anamnese" | "medidas" | "exames";

const ANAMNESIS_FIELDS: { key: keyof AnamnesisData; label: string; rows?: number }[] = [
  { key: "queixa_principal",      label: "Queixa principal",          rows: 2 },
  { key: "historico_saude",       label: "Histórico de saúde",        rows: 3 },
  { key: "medicamentos",          label: "Medicamentos em uso",       rows: 2 },
  { key: "alergias_intolerancias",label: "Alergias e intolerâncias",  rows: 2 },
  { key: "cirurgias_previas",     label: "Cirurgias prévias",         rows: 2 },
  { key: "historico_familiar",    label: "Histórico familiar",        rows: 2 },
  { key: "rotina_alimentar",      label: "Rotina alimentar",          rows: 3 },
  { key: "horas_sono",            label: "Horas de sono" },
  { key: "qualidade_sono",        label: "Qualidade do sono" },
  { key: "nivel_atividade_fisica",label: "Nível de atividade física" },
  { key: "consumo_agua",          label: "Consumo de água" },
  { key: "consumo_alcool_fumo",   label: "Consumo de álcool/fumo" },
  { key: "objetivo_detalhado",    label: "Objetivo detalhado",        rows: 3 },
  { key: "observacoes_nutri",     label: "Observações da nutricionista", rows: 3 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PacienteDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("plano");

  // Acompanhamento
  const [goal, setGoal] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);

  // Plano alimentar
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [picker, setPicker] = useState<
    | { kind: "food"; mealId: string }
    | { kind: "sub"; mealId: string; itemIdx: number; baseFood: TacoFood | null }
    | null
  >(null);
  const [suggestFor, setSuggestFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TacoFood[]>([]);

  // Anamnese
  const [anamnesis, setAnamnesis] = useState<Anamnesis>(null);
  const [anamnesisForm, setAnamnesisForm] = useState<AnamnesisData>({});
  const [loadingAnamnesis, setLoadingAnamnesis] = useState(false);
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);

  // Medidas
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [newMeasure, setNewMeasure] = useState({ weight_kg: "", waist_cm: "", hip_cm: "", notes: "", logged_at: "" });
  const [savingMeasure, setSavingMeasure] = useState(false);

  // Exames
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docDescription, setDocDescription] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => { load(); }, [clientId]);

  // Carregar dados extras quando muda de aba
  useEffect(() => {
    if (activeTab === "anamnese" && !loadingAnamnesis && anamnesis === null) {
      loadAnamnesis();
    }
    if (activeTab === "medidas" && !loadingLogs && weightLogs.length === 0) {
      loadMedidas();
    }
    if (activeTab === "exames" && !loadingDocs && documents.length === 0) {
      loadDocuments();
    }
  }, [activeTab]);

  function notify(text: string, type: "ok" | "err" = "ok") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const d = await api.get<ClientDetail>(`/api/clients/${clientId}`);
      setData(d);
      setGoal(d.client.goal ?? "");
      setNotes(d.client.notes ?? "");
      setReturnDate(d.client.return_date ? d.client.return_date.slice(0, 10) : "");
      setMeals(d.meal_plan?.meals ?? []);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao carregar paciente", "err");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnamnesis() {
    setLoadingAnamnesis(true);
    try {
      const res = await api.get<{ anamnesis: Anamnesis }>(`/api/clients/${clientId}/anamnesis`);
      setAnamnesis(res.anamnesis);
      setAnamnesisForm(res.anamnesis?.data ?? {});
    } catch {
      // mantém null, formulário vazio = criação
    } finally {
      setLoadingAnamnesis(false);
    }
  }

  async function saveAnamnesis() {
    setSavingAnamnesis(true);
    try {
      const res = await api.put<{ anamnesis: Anamnesis }>(`/api/clients/${clientId}/anamnesis`, { data: anamnesisForm });
      setAnamnesis(res.anamnesis);
      notify("Anamnese salva.");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao salvar anamnese", "err");
    } finally {
      setSavingAnamnesis(false);
    }
  }

  async function loadMedidas() {
    setLoadingLogs(true);
    try {
      const res = await api.get<{ weightLogs: WeightLog[] }>(`/api/clients/${clientId}/tracking`);
      setWeightLogs(res.weightLogs ?? []);
    } catch {
      setWeightLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function saveMeasure() {
    const body: Record<string, number | string> = {};
    if (newMeasure.weight_kg) body.weight_kg = parseFloat(newMeasure.weight_kg);
    if (newMeasure.waist_cm)  body.waist_cm  = parseFloat(newMeasure.waist_cm);
    if (newMeasure.hip_cm)    body.hip_cm    = parseFloat(newMeasure.hip_cm);
    if (newMeasure.notes)     body.notes     = newMeasure.notes;
    if (newMeasure.logged_at) body.logged_at = newMeasure.logged_at;

    if (!body.weight_kg && !body.waist_cm && !body.hip_cm) {
      notify("Informe ao menos um dado numérico (peso, cintura ou quadril).", "err");
      return;
    }

    setSavingMeasure(true);
    try {
      const res = await api.post<{ log: WeightLog }>(`/api/clients/${clientId}/measurements`, body);
      setWeightLogs((prev) => [res.log, ...prev]);
      setNewMeasure({ weight_kg: "", waist_cm: "", hip_cm: "", notes: "", logged_at: "" });
      notify("Medida registrada.");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao registrar medida", "err");
    } finally {
      setSavingMeasure(false);
    }
  }

  async function loadDocuments() {
    setLoadingDocs(true);
    try {
      const res = await api.get<{ documents: PatientDocument[] }>(`/api/features/clients/${clientId}/documents`);
      setDocuments(res.documents ?? []);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function uploadDocument(file: File) {
    setUploadingDoc(true);
    const token = getToken();
    try {
      const form = new FormData();
      form.append("file", file);
      const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/features/clients/${clientId}/documents${docDescription ? `?description=${encodeURIComponent(docDescription)}` : ""}`;
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Erro no upload");
      }
      const json = await res.json();
      setDocuments((prev) => [json.document, ...prev]);
      setDocDescription("");
      notify("Exame enviado.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao enviar arquivo", "err");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function deleteDocument(id: string) {
    try {
      await api.delete(`/api/features/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      notify("Documento removido.");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover documento", "err");
    }
  }

  async function downloadDocument(doc: PatientDocument) {
    const token = getToken();
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/features/documents/${doc.id}/file`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { notify("Erro ao baixar arquivo", "err"); return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = doc.original_name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Plano alimentar handlers
  async function saveInfo() {
    setSavingInfo(true);
    try {
      await api.patch(`/api/clients/${clientId}`, { goal, notes, return_date: returnDate });
      notify("Informações salvas.");
      setEditingInfo(false);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao salvar", "err");
    } finally {
      setSavingInfo(false);
    }
  }

  function addMeal() { setMeals((m) => [...m, { id: uid(), name: "Nova refeição", time: "", items: [] }]); }
  function updateMeal(id: string, patch: Partial<Meal>) { setMeals((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x))); }
  function removeMeal(id: string) { setMeals((m) => m.filter((x) => x.id !== id)); }

  function addFoodToMeal(mealId: string, food: TacoFood, qty: number, unit: string) {
    const macros = calcMacros(food, qty, unit);
    const item: MealItem = { food_id: food.id, name: food.name, quantity: qty, unit, ...macros, substitutions: [] };
    setMeals((m) => m.map((x) => (x.id === mealId ? { ...x, items: [...x.items, item] } : x)));
  }
  function removeItem(mealId: string, idx: number) {
    setMeals((m) => m.map((x) => (x.id === mealId ? { ...x, items: x.items.filter((_, i) => i !== idx) } : x)));
  }
  function addSubToItem(mealId: string, itemIdx: number, food: TacoFood, qty: number) {
    setMeals((m) =>
      m.map((x) => {
        if (x.id !== mealId) return x;
        const items = x.items.map((it, i) => {
          if (i !== itemIdx) return it;
          if (it.substitutions.some((s) => s.food_id === food.id)) return it;
          return { ...it, substitutions: [...it.substitutions, { food_id: food.id, name: food.name, quantity: qty, unit: "g" }] };
        });
        return { ...x, items };
      })
    );
  }
  function removeSub(mealId: string, itemIdx: number, subFoodId: number) {
    setMeals((m) =>
      m.map((x) => {
        if (x.id !== mealId) return x;
        return { ...x, items: x.items.map((it, i) => i === itemIdx ? { ...it, substitutions: it.substitutions.filter((s) => s.food_id !== subFoodId) } : it) };
      })
    );
  }

  async function showSuggestions(mealId: string, itemIdx: number, foodId: number) {
    const key = `${mealId}:${itemIdx}`;
    if (suggestFor === key) { setSuggestFor(null); return; }
    setSuggestFor(key);
    try { setSuggestions(await getSubstitutions(foodId)); } catch { setSuggestions([]); }
  }

  async function savePlan() {
    setSavingPlan(true);
    try {
      await api.put(`/api/features/clients/${clientId}/meal-plan`, {
        title: data?.meal_plan?.title ?? "Plano Alimentar",
        meals,
        notes: data?.meal_plan?.notes ?? null,
      });
      notify("Plano alimentar salvo!");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao salvar plano", "err");
    } finally {
      setSavingPlan(false);
    }
  }

  const pickerBaseFood: TacoFood | null = picker?.kind === "sub" ? picker.baseFood : null;

  if (loading) return <div className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">Carregando paciente...</div>;
  if (!data) return <div className="mx-auto w-full max-w-5xl text-sm text-destructive">{message?.text}</div>;

  const { client, appointments, next_appointment } = data;
  const lastConsult = appointments.find((a) => a.status !== "cancelled" && new Date(a.scheduled_at) <= new Date());
  const totalKcal = meals.reduce((acc, m) => acc + m.items.reduce((a, i) => a + i.kcal, 0), 0);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "plano",    label: "Plano alimentar", icon: UtensilsCrossed },
    { id: "anamnese", label: "Anamnese",         icon: FileText },
    { id: "medidas",  label: "Medidas",           icon: Ruler },
    { id: "exames",   label: "Exames",            icon: Upload },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link href="/pacientes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para pacientes
      </Link>

      {message && (
        <div className={`rounded-md border px-3 py-2 text-sm ${message.type === "err" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-accent text-accent-foreground"}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="card-soft flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary shrink-0">
            {initials(client.name)}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{client.name ?? "Sem nome"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhone(client.phone)}</span>
              {goal && <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> {goal}</span>}
              {next_appointment && (
                <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />Retorno em {fmtDate(next_appointment.scheduled_at)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditingInfo(!editingInfo)}
            className="h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <Pencil className="mr-1.5 -mt-0.5 inline h-3.5 w-3.5" /> Editar
          </button>
          {activeTab === "plano" && (
            <button
              onClick={savePlan}
              disabled={savingPlan}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-70"
            >
              {savingPlan ? "Salvando..." : "Enviar plano"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Coluna principal — abas */}
        <div className="flex flex-col gap-4">
          {/* Tabs pill */}
          <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit flex-wrap">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === t.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ── Aba: Plano alimentar ── */}
          {activeTab === "plano" && (
            <SectionGroup
              icon={UtensilsCrossed}
              title="Plano alimentar"
              subtitle={totalKcal > 0 ? `Meta diária ≈ ${Math.round(totalKcal)} kcal` : "Monte as refeições do paciente"}
              right={
                <button
                  onClick={addMeal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova refeição
                </button>
              }
            >
              {meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma refeição ainda. Clique em &quot;Nova refeição&quot; para começar.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {meals.map((meal) => {
                    const kcal = meal.items.reduce((a, i) => a + i.kcal, 0);
                    return (
                      <div key={meal.id} className="rounded-2xl border border-border bg-surface-2/40">
                        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              value={meal.name}
                              onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
                              className="bg-transparent text-sm font-medium outline-none border-b border-transparent hover:border-border focus:border-primary min-w-0 flex-1"
                            />
                            <input
                              type="time"
                              value={meal.time}
                              onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
                              className="text-xs text-muted-foreground bg-transparent outline-none w-20"
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{kcal > 0 ? `${Math.round(kcal)} kcal` : "—"}</span>
                            <button
                              onClick={() => setPicker({ kind: "food", mealId: meal.id })}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-primary"
                            >
                              <Plus className="h-3 w-3" /> Alimento
                            </button>
                            <button
                              onClick={() => removeMeal(meal.id)}
                              className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {meal.items.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-muted-foreground">Sem alimentos.</p>
                        ) : (
                          <ul className="divide-y divide-border/60">
                            {meal.items.map((item, idx) => {
                              const key = `${meal.id}:${idx}`;
                              const itemAsBase: TacoFood = {
                                id: item.food_id, name: item.name, category: "",
                                kcal: item.kcal > 0 && item.quantity > 0 ? Math.round((item.kcal / item.quantity) * 100) : 100,
                                protein: 0, carbs: 0, fat: 0, fiber: 0,
                                typical_amount: item.quantity, typical_unit: item.unit, unit_weight_g: 1,
                              };
                              return (
                                <li key={idx} className="flex flex-col gap-1.5 px-4 py-2.5">
                                  <div className="flex items-center gap-3">
                                    {/* Ícone por categoria — mesmo componente do FoodSwapSheet */}
                                    <CategoryIcon food={{ name: item.name, category: "" }} size="sm" />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm">{item.name}</div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {item.quantity} {item.unit} · {Math.round(item.kcal)} kcal
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => showSuggestions(meal.id, idx, item.food_id)}
                                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-primary"
                                      >
                                        <Sparkles className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => setPicker({ kind: "sub", mealId: meal.id, itemIdx: idx, baseFood: itemAsBase })}
                                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-primary"
                                      >
                                        <Repeat2 className="h-3 w-3" /> Trocar
                                      </button>
                                      <button
                                        onClick={() => removeItem(meal.id, idx)}
                                        className="grid h-6 w-6 place-items-center text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {suggestFor === key && (
                                    <div className="flex flex-wrap gap-1.5 rounded-md border border-dashed border-border p-2 ml-5">
                                      {suggestions.length === 0 ? (
                                        <span className="text-xs text-muted-foreground">Sem sugestões.</span>
                                      ) : (
                                        suggestions.map((s) => (
                                          <button
                                            key={s.id}
                                            onClick={() => addSubToItem(meal.id, idx, s, s.typical_amount || 100)}
                                            className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                                          >
                                            + {s.name}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  )}

                                  {item.substitutions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 ml-5">
                                      <span className="text-xs text-muted-foreground">ou:</span>
                                      {item.substitutions.map((s) => (
                                        <span key={s.food_id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                          {s.name} ({s.quantity} {s.unit})
                                          <button onClick={() => removeSub(meal.id, idx, s.food_id)} className="hover:text-destructive">×</button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionGroup>
          )}

          {/* ── Aba: Anamnese ── */}
          {activeTab === "anamnese" && (
            <SectionGroup icon={FileText} title="Anamnese" subtitle={anamnesis ? `Última atualização: ${fmtDate(anamnesis.updated_at)}` : "Preencha para registrar o histórico do paciente"}>
              {loadingAnamnesis ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ANAMNESIS_FIELDS.map((field) => (
                      <div key={field.key} className={field.rows && field.rows > 1 ? "sm:col-span-2" : ""}>
                        <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                        {field.rows && field.rows > 1 ? (
                          <textarea
                            rows={field.rows}
                            value={anamnesisForm[field.key] ?? ""}
                            onChange={(e) => setAnamnesisForm((f) => ({ ...f, [field.key]: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={anamnesisForm[field.key] ?? ""}
                            onChange={(e) => setAnamnesisForm((f) => ({ ...f, [field.key]: e.target.value }))}
                            className="w-full h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={saveAnamnesis}
                      disabled={savingAnamnesis}
                      className="h-9 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-70"
                    >
                      {savingAnamnesis ? "Salvando..." : "Salvar anamnese"}
                    </button>
                  </div>
                </div>
              )}
            </SectionGroup>
          )}

          {/* ── Aba: Medidas ── */}
          {activeTab === "medidas" && (
            <SectionGroup icon={Ruler} title="Medidas e evolução" subtitle="Registre peso, cintura e quadril ao longo do tempo">
              {/* Formulário nova medida */}
              <div className="rounded-xl border border-border bg-surface-2/40 p-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Nova medida</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newMeasure.weight_kg}
                      onChange={(e) => setNewMeasure((m) => ({ ...m, weight_kg: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
                      placeholder="70.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newMeasure.waist_cm}
                      onChange={(e) => setNewMeasure((m) => ({ ...m, waist_cm: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Quadril (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newMeasure.hip_cm}
                      onChange={(e) => setNewMeasure((m) => ({ ...m, hip_cm: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
                      placeholder="95"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Data</label>
                    <input
                      type="date"
                      value={newMeasure.logged_at}
                      onChange={(e) => setNewMeasure((m) => ({ ...m, logged_at: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Observação</label>
                    <input
                      type="text"
                      value={newMeasure.notes}
                      onChange={(e) => setNewMeasure((m) => ({ ...m, notes: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
                      placeholder="Ex.: pós-consulta"
                    />
                  </div>
                  <button
                    onClick={saveMeasure}
                    disabled={savingMeasure}
                    className="h-9 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-70"
                  >
                    {savingMeasure ? "Salvando..." : "Registrar"}
                  </button>
                </div>
              </div>

              {/* Histórico */}
              {loadingLogs ? (
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              ) : weightLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma medida registrada ainda.</p>
              ) : (
                <div>
                  {/* Mini indicador de variação de peso */}
                  {weightLogs.length >= 2 && weightLogs[0].weight_kg && weightLogs[1].weight_kg && (() => {
                    const delta = parseFloat(weightLogs[0].weight_kg!) - parseFloat(weightLogs[1].weight_kg!);
                    const sign = delta > 0 ? "+" : "";
                    return (
                      <p className="text-xs text-muted-foreground mb-2">
                        Variação de peso desde a última medida:{" "}
                        <span className={delta < 0 ? "text-green-600" : delta > 0 ? "text-destructive" : ""}>
                          {sign}{delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                        </span>
                      </p>
                    );
                  })()}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Data</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Peso (kg)</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Cintura (cm)</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Quadril (cm)</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Obs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weightLogs.map((log, i) => (
                          <tr key={log.id} className={`border-b border-border/60 last:border-0 ${i === 0 ? "bg-primary/5" : ""}`}>
                            <td className="px-3 py-2 text-xs">{fmtDate(log.logged_at)}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmtNum(log.weight_kg)}</td>
                            <td className="px-3 py-2 text-right">{fmtNum(log.waist_cm)}</td>
                            <td className="px-3 py-2 text-right">{fmtNum(log.hip_cm)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{log.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionGroup>
          )}

          {/* ── Aba: Exames ── */}
          {activeTab === "exames" && (
            <SectionGroup icon={Upload} title="Exames e documentos" subtitle="Envie PDFs, imagens ou outros arquivos do paciente">
              {/* Upload */}
              <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Novo arquivo</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Descrição (opcional)</label>
                    <input
                      type="text"
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      placeholder="Ex.: Hemograma completo - jan/2026"
                      className="w-full h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                  <label className={`h-9 shrink-0 inline-flex items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium cursor-pointer hover:bg-muted transition-colors ${uploadingDoc ? "opacity-60 pointer-events-none" : ""}`}>
                    <Upload className="h-4 w-4" />
                    {uploadingDoc ? "Enviando..." : "Escolher arquivo"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploadingDoc}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDocument(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Lista */}
              {loadingDocs ? (
                <p className="text-sm text-muted-foreground">Carregando documentos...</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.original_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.description && <span>{doc.description} · </span>}
                          {fmtDate(doc.created_at)}
                          {" · "}
                          {(doc.size_bytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => downloadDocument(doc)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-primary shrink-0"
                        title="Baixar"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-destructive shrink-0"
                        title="Remover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionGroup>
          )}
        </div>

        {/* Sidebar direita — sempre visível */}
        <div className="flex flex-col gap-4">
          <SectionGroup icon={User} title="Acompanhamento">
            {editingInfo ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Objetivo</span>
                  <input value={goal} onChange={(e) => setGoal(e.target.value)} className="h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50" placeholder="Emagrecimento..." />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Data de retorno</span>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Observações</span>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none" />
                </label>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingInfo(false)} className="h-8 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                  <button onClick={saveInfo} disabled={savingInfo} className="h-8 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-70">
                    {savingInfo ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <InfoBox label="Objetivo" value={goal || "—"} />
                <InfoBox label="Retorno" value={returnDate ? fmtDate(returnDate) : "—"} />
                <InfoBox label="Consultas" value={`${data.appointments.filter((a) => a.status !== "cancelled").length}`} />
                <InfoBox label="Última" value={lastConsult ? fmtDate(lastConsult.scheduled_at) : "—"} />
                {notes && (
                  <div className="col-span-2 rounded-xl border border-border bg-surface-2/40 p-3">
                    <div className="text-xs text-muted-foreground">Observações</div>
                    <p className="mt-1 text-sm">{notes}</p>
                  </div>
                )}
              </dl>
            )}
          </SectionGroup>

          {appointments.length > 0 && (
            <SectionGroup icon={ClipboardList} title="Consultas">
              <ul className="flex flex-col gap-2 text-sm">
                {appointments.slice(0, 5).map((a) => (
                  <li key={a.id} className="rounded-lg border border-border bg-surface-2/40 px-3 py-2">
                    <div className="font-medium text-primary text-xs">{fmtDateTime(a.scheduled_at)}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{a.modality} · {a.status}</div>
                  </li>
                ))}
              </ul>
            </SectionGroup>
          )}
        </div>
      </div>

      <FoodSwapSheet
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        mode={picker?.kind === "sub" ? "sub" : "food"}
        baseFood={pickerBaseFood}
        onSelect={(food, qty) => {
          if (!picker) return;
          if (picker.kind === "food") addFoodToMeal(picker.mealId, food, qty, food.typical_unit || "g");
          else addSubToItem(picker.mealId, picker.itemIdx, food, qty);
        }}
      />
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium truncate">{value}</div>
    </div>
  );
}
