"use client";

import { useEffect, useState, useCallback } from "react";
import type { TacoFood } from "@/lib/meal-types";
import { searchFoods, getSubstitutions } from "@/lib/foods";
import { categorize, CATEGORY_STYLE, type FoodCategory } from "@/lib/food-category";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, ArrowLeftIcon } from "lucide-react";

type SortMode = "default" | "az" | "menor_g" | "maior_g";

// Ponto colorido por grupo alimentar — mesmo mapeamento de pacientes/[id]/page.tsx
const FOOD_DOT_CLASS: Record<string, string> = {
  carboidrato: "bg-food-carb",
  proteina: "bg-food-protein",
  gordura: "bg-food-fat",
  fruta: "bg-food-fruit",
  vegetal: "bg-food-veg",
  laticinios: "bg-food-dairy",
};

function foodDotClass(food: TacoFood): string {
  const cat = categorize(food);
  return FOOD_DOT_CLASS[cat] ?? "bg-muted-foreground/40";
}

function FoodDot({ food, size = "md" }: { food: TacoFood; size?: "sm" | "md" | "lg" }) {
  const dotClass = foodDotClass(food);
  const sizeMap = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };
  return <span className={`rounded-full shrink-0 ${sizeMap[size]} ${dotClass}`} />;
}

function CategoryPill({
  category,
  active,
  onClick,
}: {
  category: FoodCategory;
  active: boolean;
  onClick: () => void;
}) {
  const style = CATEGORY_STYLE[category];
  const dotClass = FOOD_DOT_CLASS[category] ?? "bg-muted-foreground/40";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "border-border bg-muted text-foreground" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {style.label}
    </button>
  );
}

// ─── SearchView ───────────────────────────────────────────────────────────────
function SearchView({
  onSelect,
}: {
  onSelect: (food: TacoFood) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TacoFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FoodCategory | null>(null);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      setResults(await searchFoods(query));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(q), 250);
    return () => clearTimeout(t);
  }, [q, doSearch]);

  const displayed = activeCategory
    ? results.filter((f) => categorize(f) === activeCategory)
    : results;

  const categories = Object.keys(CATEGORY_STYLE) as FoodCategory[];

  return (
    <div className="flex flex-col gap-4 overflow-hidden">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="o que você quer trocar? (arroz, banana, frango...)"
          className="pl-9"
        />
      </div>

      {results.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Categorias
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const hasResults = results.some((f) => categorize(f) === cat);
              if (!hasResults) return null;
              return (
                <CategoryPill
                  key={cat}
                  category={cat}
                  active={activeCategory === cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl border border-border">
        {loading && (
          <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
        )}
        {!loading && q && results.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Nenhum alimento encontrado.</p>
        )}
        {!loading && !q && (
          <p className="p-4 text-sm text-muted-foreground">
            Digite acima para buscar na tabela TACO.
          </p>
        )}
        {displayed.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelect(f)}
            className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-muted/60 transition-colors"
          >
            <FoodDot food={f} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.kcal} kcal/100g</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SwapView ─────────────────────────────────────────────────────────────────
function SwapView({
  baseFood,
  onConfirm,
  onBack,
}: {
  baseFood: TacoFood;
  onConfirm: (food: TacoFood, qty: number) => void;
  onBack: () => void;
}) {
  const [userQty, setUserQty] = useState(baseFood.typical_amount || 100);
  const [substitutions, setSubstitutions] = useState<TacoFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("default");

  const baseKcalFor = Math.round((baseFood.kcal / 100) * userQty);

  useEffect(() => {
    getSubstitutions(baseFood.id)
      .then(setSubstitutions)
      .catch(() => setSubstitutions([]))
      .finally(() => setLoading(false));
  }, [baseFood.id]);

  const sorted = [...substitutions].sort((a, b) => {
    if (sort === "az") return a.name.localeCompare(b.name, "pt-BR");
    const gA = calcSwapGrams(userQty, baseFood.kcal, a.kcal);
    const gB = calcSwapGrams(userQty, baseFood.kcal, b.kcal);
    if (sort === "menor_g") return gA - gB;
    if (sort === "maior_g") return gB - gA;
    return 0;
  });

  return (
    <div className="flex flex-col gap-4 overflow-hidden">
      {/* Card do alimento selecionado */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
        <FoodDot food={baseFood} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{baseFood.name}</p>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {baseKcalFor} kcal
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {Math.round((baseFood.protein / 100) * userQty * 10) / 10}g prot
            </span>
          </div>
        </div>
      </div>

      {/* Quantidade */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">
            Quanto tem na dieta? (g)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={userQty}
              onChange={(e) => setUserQty(Math.max(1, Number(e.target.value)))}
              className="w-24 text-lg font-bold"
            />
            <span className="text-sm text-muted-foreground">
              = {baseKcalFor} kcal
            </span>
          </div>
        </div>
      </div>

      {/* Ordenação */}
      <div className="flex gap-1.5 flex-wrap">
        {(["default", "az", "menor_g", "maior_g"] as SortMode[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              sort === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {s === "default" ? "padrão" : s === "az" ? "a→z" : s === "menor_g" ? "menor g" : "maior g"}
          </button>
        ))}
      </div>

      {/* Lista de trocas */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border">
        {loading && (
          <p className="p-3 text-sm text-muted-foreground">Carregando trocas...</p>
        )}
        {!loading && sorted.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Sem trocas disponíveis para este alimento.</p>
        )}
        {sorted.map((sub) => {
          const swapG = calcSwapGrams(userQty, baseFood.kcal, sub.kcal);
          const swapKcal = Math.round((sub.kcal / 100) * swapG);
          return (
            <button
              key={sub.id}
              onClick={() => onConfirm(sub, swapG)}
              className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-muted/60 transition-colors"
            >
              <FoodDot food={sub} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{sub.name}</p>
                <p className="text-xs text-muted-foreground">
                  {swapG}g · {swapKcal} kcal
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-muted text-muted-foreground">
                {swapG}g
              </span>
            </button>
          );
        })}
      </div>

      <Button variant="ghost" size="sm" onClick={onBack} className="self-start gap-1.5">
        <ArrowLeftIcon className="size-4" /> Trocar alimento
      </Button>
    </div>
  );
}

function calcSwapGrams(userQty: number, baseKcalPer100: number, swapKcalPer100: number): number {
  if (swapKcalPer100 === 0) return userQty;
  return Math.round((userQty / 100) * (baseKcalPer100 / swapKcalPer100) * 100);
}

// ─── FoodSwapSheet ────────────────────────────────────────────────────────────
export function FoodSwapSheet({
  open,
  onOpenChange,
  mode,
  baseFood,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** "food" = adicionar novo alimento; "sub" = adicionar troca com view swap completa */
  mode: "food" | "sub";
  /** Para mode="sub": o alimento cujas trocas serão listadas automaticamente */
  baseFood?: TacoFood | null;
  onSelect: (food: TacoFood, qty: number) => void;
}) {
  const [view, setView] = useState<"search" | "swap">("search");
  const [selected, setSelected] = useState<TacoFood | null>(null);

  useEffect(() => {
    if (!open) {
      setView(mode === "sub" && baseFood ? "swap" : "search");
      setSelected(null);
    } else {
      if (mode === "sub" && baseFood) {
        setView("swap");
        setSelected(baseFood);
      } else {
        setView("search");
        setSelected(null);
      }
    }
  }, [open, mode, baseFood]);

  function handleSearchSelect(food: TacoFood) {
    if (mode === "food") {
      onSelect(food, food.typical_amount || 100);
      onOpenChange(false);
    } else {
      setSelected(food);
      setView("swap");
    }
  }

  function handleSwapConfirm(food: TacoFood, qty: number) {
    onSelect(food, qty);
    onOpenChange(false);
  }

  const title =
    view === "swap" ? "Escolher troca equivalente" : "Adicionar alimento";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-4 overflow-hidden">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {view === "search" ? (
            <SearchView onSelect={handleSearchSelect} />
          ) : selected ? (
            <SwapView
              baseFood={selected}
              onConfirm={handleSwapConfirm}
              onBack={() => {
                if (mode === "sub" && baseFood) {
                  onOpenChange(false);
                } else {
                  setView("search");
                  setSelected(null);
                }
              }}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
