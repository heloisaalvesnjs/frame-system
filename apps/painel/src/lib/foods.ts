import { api } from "@/lib/api";
import type { TacoFood } from "@/lib/meal-types";

export const UNITS = ["g", "ml", "unidade", "fatia", "colher de sopa", "colher de chá", "xícara", "porção"];

const UNIT_WEIGHTS: Record<string, number> = {
  g: 1, ml: 1, "colher de sopa": 15, "colher de chá": 5,
  "xícara": 200, fatia: 30, "porção": 100, unidade: 100,
};

// Réplica do calcMacros do backend (data/taco.ts) — evita roundtrip por item.
export function calcMacros(food: TacoFood, qty: number, unit: string) {
  const g =
    unit === "unidade" || unit === "fatia" || unit === "porção"
      ? qty * food.unit_weight_g
      : qty * (UNIT_WEIGHTS[unit] ?? 1);
  const f = g / 100;
  const r = (n: number) => Math.round(n * f * 10) / 10;
  return { kcal: r(food.kcal), protein: r(food.protein), carbs: r(food.carbs), fat: r(food.fat) };
}

export async function searchFoods(q: string): Promise<TacoFood[]> {
  if (!q.trim()) return [];
  const res = await api.get<{ foods: TacoFood[] }>(`/api/foods/search?q=${encodeURIComponent(q)}&limit=10`);
  return res.foods;
}

export async function getSubstitutions(foodId: number): Promise<TacoFood[]> {
  const res = await api.get<{ substitutions: TacoFood[] }>(`/api/foods/${foodId}/substitutions?limit=6`);
  return res.substitutions;
}
