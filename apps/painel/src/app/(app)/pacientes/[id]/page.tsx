"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { ClientDetail, Meal, MealItem, TacoFood } from "@/lib/meal-types";
import { STAGE_LABEL } from "@/lib/meal-types";
import { calcMacros, getSubstitutions } from "@/lib/foods";
import { FoodSwapSheet } from "@/components/food-swap-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { categorize, CATEGORY_STYLE } from "@/lib/food-category";

// ─── groupToken from food-category ───────────────────────────────────────────

const GROUP_DOT: Record<string, string> = {
  carboidrato: "bg-food-carb",
  proteina: "bg-food-protein",
  gordura: "bg-food-fat",
  fruta: "bg-food-fruit",
  vegetal: "bg-food-veg",
  laticinios: "bg-food-dairy",
};

function foodDot(name: string): string {
  const low = name.toLowerCase();
  if (/arroz|macarr|pão|batata|aveia|mandioca|milho|cereal|biscoito|granola|tapioca|cuscuz|farinha|broa/.test(low)) return "bg-food-carb";
  if (/frango|carne|peixe|atum|ovo|proteína|peito|bife|salmão|tilápia|camarão|feijão|lentilha/.test(low)) return "bg-food-protein";
  if (/azeite|óleo|manteiga|creme|abacate|castanha|amendoim|noze/.test(low)) return "bg-food-fat";
  if (/maçã|banana|uva|manga|mamão|morango|laranja|limão|abacaxi|melão|melancia|pêssego/.test(low)) return "bg-food-fruit";
  if (/alface|tomate|cenoura|brócolis|couve|espinafre|pepino|abobrinha|chuchu|beterraba/.test(low)) return "bg-food-veg";
  if (/leite|iogurte|queijo|requeijão/.test(low)) return "bg-food-dairy";
  return "bg-muted-foreground/40";
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PacienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [goal, setGoal] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);

  const [picker, setPicker] = useState<
    | { kind: "food"; mealId: string }
    | { kind: "sub"; mealId: string; itemIdx: number; baseFood: TacoFood | null }
    | null
  >(null);

  const [suggestFor, setSuggestFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TacoFood[]>([]);

  useEffect(() => { load(); }, [clientId]);

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
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar paciente");
    } finally {
      setLoading(false);
    }
  }

  async function saveInfo() {
    setSavingInfo(true);
    setMessage(null);
    try {
      await api.patch(`/api/clients/${clientId}`, { goal, notes, return_date: returnDate });
      setMessage("Informações salvas.");
      setEditingInfo(false);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSavingInfo(false);
    }
  }

  function addMeal() {
    setMeals((m) => [...m, { id: uid(), name: "Nova refeição", time: "", items: [] }]);
  }
  function updateMeal(id: string, patch: Partial<Meal>) {
    setMeals((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
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
    setMessage(null);
    try {
      await api.put(`/api/features/clients/${clientId}/meal-plan`, {
        title: data?.meal_plan?.title ?? "Plano Alimentar",
        meals,
        notes: data?.meal_plan?.notes ?? null,
      });
      setMessage("Plano alimentar salvo!");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar plano");
    } finally {
      setSavingPlan(false);
    }
  }

  const pickerBaseFood: TacoFood | null = picker?.kind === "sub" ? picker.baseFood : null;

  if (loading) {
    return <div className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">Carregando paciente...</div>;
  }
  if (!data) {
    return <div className="mx-auto w-full max-w-5xl text-sm text-destructive">{message}</div>;
  }

  const { client, appointments, next_appointment } = data;
  const lastConsult = appointments.find(
    (a) => a.status !== "cancelled" && new Date(a.scheduled_at) <= new Date()
  );
  const totalKcal = meals.reduce(
    (acc, m) => acc + m.items.reduce((a, i) => a + i.kcal, 0), 0
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para pacientes
      </Link>

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      {/* Header card */}
      <div className="card-soft flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary shrink-0">
            {initials(client.name)}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{client.name ?? "Sem nome"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {formatPhone(client.phone)}
              </span>
              {goal && (
                <span className="inline-flex items-center gap-1">
                  <Target className="h-3 w-3" /> {goal}
                </span>
              )}
              {next_appointment && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Retorno em {fmtDate(next_appointment.scheduled_at)}
                </span>
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
          <button
            onClick={savePlan}
            disabled={savingPlan}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-70"
          >
            {savingPlan ? "Salvando..." : "Enviar plano"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Plano alimentar */}
        <div className="flex flex-col gap-4">
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
              <p className="text-sm text-muted-foreground">
                Nenhuma refeição ainda. Clique em &quot;Nova refeição&quot; para começar.
              </p>
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
                          <span className="text-xs text-muted-foreground">
                            {kcal > 0 ? `${Math.round(kcal)} kcal` : "—"}
                          </span>
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
                            const dot = foodDot(item.name);
                            const itemAsBase: TacoFood = {
                              id: item.food_id, name: item.name, category: "",
                              kcal: item.kcal > 0 && item.quantity > 0 ? Math.round((item.kcal / item.quantity) * 100) : 100,
                              protein: 0, carbs: 0, fat: 0, fiber: 0,
                              typical_amount: item.quantity, typical_unit: item.unit, unit_weight_g: 1,
                            };
                            return (
                              <li key={idx} className="flex flex-col gap-1.5 px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
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
                                      <span
                                        key={s.food_id}
                                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                                      >
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
        </div>

        {/* Sidebar direita */}
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
                <InfoBox label="Consultas" value={`${data.appointments.filter(a => a.status !== "cancelled").length}`} />
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
          if (picker.kind === "food") {
            addFoodToMeal(picker.mealId, food, qty, food.typical_unit || "g");
          } else {
            addSubToItem(picker.mealId, picker.itemIdx, food, qty);
          }
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
