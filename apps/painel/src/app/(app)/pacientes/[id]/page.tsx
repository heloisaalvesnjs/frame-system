"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { ClientDetail, Meal, MealItem, TacoFood } from "@/lib/meal-types";
import { STAGE_LABEL } from "@/lib/meal-types";
import { calcMacros, getSubstitutions } from "@/lib/foods";
import { FoodSwapSheet } from "@/components/food-swap-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionGroup, PageHeader } from "@/components/section-group";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  UtensilsCrossedIcon,
  RepeatIcon,
  CalendarCheckIcon,
  SparklesIcon,
  ClipboardListIcon,
  UserIcon,
} from "lucide-react";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

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

  const [meals, setMeals] = useState<Meal[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);

  // FoodSwapSheet state
  const [picker, setPicker] = useState<
    | { kind: "food"; mealId: string }
    | { kind: "sub"; mealId: string; itemIdx: number; baseFood: TacoFood | null }
    | null
  >(null);

  // Sugestões inline por item
  const [suggestFor, setSuggestFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TacoFood[]>([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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
      await api.patch(`/api/clients/${clientId}`, {
        goal, notes, return_date: returnDate,
      });
      setMessage("Informações salvas.");
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
  function removeMeal(id: string) {
    setMeals((m) => m.filter((x) => x.id !== id));
  }
  function addFoodToMeal(mealId: string, food: TacoFood, qty: number, unit: string) {
    const macros = calcMacros(food, qty, unit);
    const item: MealItem = {
      food_id: food.id, name: food.name, quantity: qty, unit, ...macros, substitutions: [],
    };
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
          return {
            ...it,
            substitutions: [
              ...it.substitutions,
              { food_id: food.id, name: food.name, quantity: qty, unit: "g" },
            ],
          };
        });
        return { ...x, items };
      })
    );
  }
  function removeSub(mealId: string, itemIdx: number, subFoodId: number) {
    setMeals((m) =>
      m.map((x) => {
        if (x.id !== mealId) return x;
        const items = x.items.map((it, i) =>
          i === itemIdx ? { ...it, substitutions: it.substitutions.filter((s) => s.food_id !== subFoodId) } : it
        );
        return { ...x, items };
      })
    );
  }

  async function showSuggestions(mealId: string, itemIdx: number, foodId: number) {
    const key = `${mealId}:${itemIdx}`;
    if (suggestFor === key) { setSuggestFor(null); return; }
    setSuggestFor(key);
    try {
      setSuggestions(await getSubstitutions(foodId));
    } catch {
      setSuggestions([]);
    }
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

  // Resolve the baseFood for sub mode from meals state
  const pickerBaseFood: TacoFood | null =
    picker?.kind === "sub" ? picker.baseFood : null;

  if (loading) {
    return <div className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">Carregando paciente...</div>;
  }
  if (!data) {
    return <div className="mx-auto w-full max-w-4xl text-sm text-destructive">{message}</div>;
  }

  const { client, appointments, next_appointment } = data;
  const lastConsult = appointments.find(
    (a) => a.status !== "cancelled" && new Date(a.scheduled_at) <= new Date()
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <button
        onClick={() => router.push("/pacientes")}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Voltar para pacientes
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={client.name ?? "Sem nome"}
          description={formatPhone(client.phone)}
        />
        {client.stage && (
          <Badge variant="outline">{STAGE_LABEL[client.stage] ?? client.stage}</Badge>
        )}
      </div>

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      {/* Consultas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarCheckIcon className="size-4 text-primary" /> Próxima consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {next_appointment ? (
              <div className="text-sm">
                <p className="font-medium">{fmtDateTime(next_appointment.scheduled_at)}</p>
                <p className="text-muted-foreground capitalize">{next_appointment.modality}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma consulta marcada.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Última consulta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {lastConsult ? fmtDateTime(lastConsult.scheduled_at) : <span className="text-muted-foreground">Nenhuma ainda.</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acompanhamento */}
      <SectionGroup
        icon={UserIcon}
        title="Acompanhamento"
        description="Objetivo, data de retorno e observações do paciente."
      >
        <div className="p-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal">Objetivo</Label>
              <Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Emagrecimento, hipertrofia..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="return">Data de retorno</Label>
              <Input id="return" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveInfo} disabled={savingInfo}>{savingInfo ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </SectionGroup>

      {/* Plano alimentar */}
      <SectionGroup
        icon={UtensilsCrossedIcon}
        title="Plano alimentar"
        description="Monte as refeições e, em cada alimento, adicione as trocas equivalentes."
      >
        <div className="p-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={addMeal}>
              <PlusIcon /> Refeição
            </Button>
          </div>

          {meals.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma refeição ainda. Clique em &quot;Refeição&quot; para começar o plano.
            </p>
          )}
          {meals.map((meal) => (
            <div key={meal.id} className="rounded-lg border border-border">
              <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                <Input
                  value={meal.name}
                  onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
                  className="h-8 w-48 font-medium"
                />
                <Input
                  type="time"
                  value={meal.time}
                  onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
                  className="h-8 w-28"
                />
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setPicker({ kind: "food", mealId: meal.id })}>
                    <PlusIcon /> Alimento
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => removeMeal(meal.id)} aria-label="Remover refeição">
                    <Trash2Icon className="text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-border">
                {meal.items.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Sem alimentos nesta refeição.</p>
                )}
                {meal.items.map((item, idx) => {
                  const key = `${meal.id}:${idx}`;
                  // Reconstruct a minimal TacoFood-like object for sub mode
                  const itemAsBase: TacoFood = {
                    id: item.food_id,
                    name: item.name,
                    category: "",
                    kcal: item.kcal > 0 && item.quantity > 0
                      ? Math.round((item.kcal / item.quantity) * 100)
                      : 100,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fiber: 0,
                    typical_amount: item.quantity,
                    typical_unit: item.unit,
                    unit_weight_g: 1,
                  };
                  return (
                    <div key={idx} className="flex flex-col gap-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm">
                          <span className="font-medium">{item.name}</span>{" "}
                          <span className="text-muted-foreground">
                            — {item.quantity} {item.unit} · {item.kcal} kcal
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => showSuggestions(meal.id, idx, item.food_id)}
                          >
                            <SparklesIcon /> Sugerir
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() =>
                              setPicker({ kind: "sub", mealId: meal.id, itemIdx: idx, baseFood: itemAsBase })
                            }
                          >
                            <RepeatIcon /> Troca
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => removeItem(meal.id, idx)} aria-label="Remover alimento">
                            <Trash2Icon className="text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {suggestFor === key && (
                        <div className="flex flex-wrap gap-1.5 rounded-md border border-dashed border-border p-2">
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
                        <div className="flex flex-wrap gap-1.5 pl-1">
                          <span className="text-xs text-muted-foreground">ou trocar por:</span>
                          {item.substitutions.map((s) => (
                            <span
                              key={s.food_id}
                              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                            >
                              {s.name} ({s.quantity} {s.unit})
                              <button onClick={() => removeSub(meal.id, idx, s.food_id)} aria-label="Remover troca" className="hover:text-destructive">
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {meals.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={savePlan} disabled={savingPlan}>
                {savingPlan ? "Salvando..." : "Salvar plano alimentar"}
              </Button>
            </div>
          )}
        </div>
      </SectionGroup>

      {/* Histórico de consultas */}
      {appointments.length > 0 && (
        <SectionGroup
          icon={ClipboardListIcon}
          title="Histórico de consultas"
        >
          <div className="flex flex-col divide-y divide-border">
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 text-sm first:pt-3 last:pb-3">
                <span>{fmtDateTime(a.scheduled_at)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground capitalize">{a.modality}</span>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </SectionGroup>
      )}

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

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return phone;
}
