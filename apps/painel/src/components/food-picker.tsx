"use client";

import { useEffect, useState } from "react";
import type { TacoFood } from "@/lib/meal-types";
import { searchFoods, UNITS } from "@/lib/foods";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";

export function FoodPicker({
  open,
  onOpenChange,
  title = "Adicionar alimento",
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  onSelect: (food: TacoFood, quantity: number, unit: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TacoFood[]>([]);
  const [selected, setSelected] = useState<TacoFood | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState("g");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ(""); setResults([]); setSelected(null); setQuantity(100); setUnit("g");
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        setResults(await searchFoods(q));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function pick(food: TacoFood) {
    setSelected(food);
    setQuantity(food.typical_amount || 100);
    setUnit(food.typical_unit || "g");
  }

  function confirm() {
    if (!selected) return;
    onSelect(selected, quantity, unit);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar alimento (ex: arroz, frango, banana)"
                className="pl-8"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {loading && <p className="p-3 text-sm text-muted-foreground">Buscando...</p>}
              {!loading && q && results.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Nenhum alimento encontrado.</p>
              )}
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => pick(f)}
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                >
                  <span>{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.kcal} kcal/100g</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium">
              {selected.name}
            </div>
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fp-qty">Quantidade</Label>
                <Input
                  id="fp-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-28"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Medida</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {selected && (
            <Button variant="ghost" onClick={() => setSelected(null)}>Voltar</Button>
          )}
          <Button onClick={confirm} disabled={!selected}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
