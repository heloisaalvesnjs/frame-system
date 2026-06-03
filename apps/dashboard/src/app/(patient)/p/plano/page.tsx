'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import {
  UtensilsCrossed, Clock, ShoppingCart, CheckSquare, Square, Loader2,
  ChevronDown, ChevronUp, Flame, ArrowRightLeft, X
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FoodEntry {
  id: string; food_id?: number; name: string; quantity: number; unit: string
  kcal_per_100g?: number; protein_per_100g?: number; carbs_per_100g?: number
  fat_per_100g?: number; fiber_per_100g?: number; unit_weight_g?: number
}
interface Meal { id: string; name: string; time: string; items: (FoodEntry | string)[]; notes?: string }
interface MealPlan { id: string; title: string; meals: Meal[]; notes: string | null; updated_at: string }

interface TacoResult {
  id: number; name: string; category: string; kcal: number; protein: number
  carbs: number; fat: number; fiber: number; typical_amount: number; typical_unit: string; unit_weight_g: number
}

// ── Macro helpers ─────────────────────────────────────────────────────────────
const UNIT_W: Record<string, number> = {
  'g':1,'ml':1,'colher de sopa':15,'colher de chá':5,'xícara':200,'fatia':30,'porção':100,'unidade':100,
}
function getDisplayName(item: FoodEntry | string): string {
  if (typeof item === 'string') return item
  const unitStr = item.unit === 'g' || item.unit === 'ml'
    ? `${item.quantity}${item.unit}`
    : `${item.quantity} ${item.unit}`
  return `${unitStr} de ${item.name}`
}
function getMacros(item: FoodEntry) {
  if (!item.kcal_per_100g) return null
  const uw = ['unidade','fatia','porção'].includes(item.unit) ? (item.unit_weight_g ?? UNIT_W[item.unit] ?? 100) : (UNIT_W[item.unit] ?? 1)
  const f = (item.quantity * uw) / 100
  return {
    kcal:    Math.round(item.kcal_per_100g * f),
    protein: Math.round((item.protein_per_100g ?? 0) * f * 10) / 10,
    carbs:   Math.round((item.carbs_per_100g  ?? 0) * f * 10) / 10,
    fat:     Math.round((item.fat_per_100g    ?? 0) * f * 10) / 10,
  }
}
function mealTotal(items: (FoodEntry | string)[]) {
  return items.reduce((acc, item) => {
    if (typeof item === 'string') return acc
    const m = getMacros(item); if (!m) return acc
    return { kcal: acc.kcal + m.kcal, protein: +(acc.protein + m.protein).toFixed(1), carbs: +(acc.carbs + m.carbs).toFixed(1), fat: +(acc.fat + m.fat).toFixed(1) }
  }, { kcal:0, protein:0, carbs:0, fat:0 })
}
function allItemNames(meals: Meal[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const meal of meals) {
    for (const item of meal.items) {
      const name = typeof item === 'string' ? item.trim() : item.name.trim()
      if (name && !seen.has(name)) { seen.add(name); result.push(name) }
    }
  }
  return result
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PatientPlanPage() {
  const { client } = usePatient()
  const [activeTab, setActiveTab] = useState<'plano' | 'compras'>('plano')
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [subEntry, setSubEntry] = useState<FoodEntry | null>(null)
  const [subResults, setSubResults] = useState<TacoResult[] | null>(null)
  const [loadingSub, setLoadingSub] = useState(false)

  const { data: plan, isLoading } = useQuery<MealPlan | null>({
    queryKey: ['patient-meal-plan'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/meal-plan')
      return data.plan
    },
    enabled: !!client,
    staleTime: 60_000,
  })

  async function openSub(entry: FoodEntry) {
    if (!entry.food_id) return
    setSubEntry(entry)
    setSubResults(null)
    setLoadingSub(true)
    try {
      const { data } = await patientApi.get(`/api/foods/${entry.food_id}/substitutions`)
      setSubResults(data.substitutions ?? [])
    } catch { setSubResults([]) }
    finally { setLoadingSub(false) }
  }

  const shopItems = plan ? allItemNames(plan.meals) : []

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      <h1 className="text-[22px] font-bold text-white mb-1 tracking-tight">Plano alimentar</h1>
      <p className="text-sm text-white/35 mb-5">Seu plano personalizado</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-ui-card border border-white/[0.06] rounded-xl">
        {([
          { key: 'plano',   label: 'Refeições',        icon: UtensilsCrossed },
          { key: 'compras', label: 'Lista de compras',  icon: ShoppingCart },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-brand-500/10 text-brand-400' : 'text-white/40 hover:text-white/70'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
      ) : !plan ? (
        <div className="text-center py-16">
          <UtensilsCrossed className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhum plano alimentar disponível ainda</p>
          <p className="text-xs text-white/20 mt-1">Sua nutricionista enviará seu plano em breve</p>
        </div>
      ) : activeTab === 'plano' ? (
        <>
          <p className="text-xs text-white/25 mb-4 text-right">Atualizado em {new Date(plan.updated_at).toLocaleDateString('pt-BR')}</p>

          <div className="space-y-3">
            {plan.meals.map(meal => {
              const total = mealTotal(meal.items)
              const expanded = expandedMeal === meal.id
              return (
                <div key={meal.id} className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                  {/* Meal header */}
                  <button onClick={() => setExpandedMeal(expanded ? null : meal.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white/90">{meal.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {meal.time && (
                          <p className="text-xs text-white/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{meal.time}
                          </p>
                        )}
                        {total.kcal > 0 && (
                          <p className="text-xs text-amber-400/70 flex items-center gap-1">
                            <Flame className="w-3 h-3" />{total.kcal} kcal
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-white/25">{meal.items.length} itens</span>
                      {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-white/[0.04]">
                      <ul className="divide-y divide-white/[0.03]">
                        {meal.items.map((item, i) => {
                          const isStr = typeof item === 'string'
                          const macros = isStr ? null : getMacros(item as FoodEntry)
                          const entry = isStr ? null : item as FoodEntry
                          return (
                            <li key={i} className="px-4 py-2.5 flex items-center gap-2">
                              <span className="text-brand-400 flex-shrink-0 text-lg leading-none">·</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white/75">{isStr ? item as string : getDisplayName(item)}</p>
                                {macros && (
                                  <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-2">
                                    <span className="text-amber-400">{macros.kcal}kcal</span>
                                    <span>P:{macros.protein}g</span>
                                    <span>C:{macros.carbs}g</span>
                                    <span>G:{macros.fat}g</span>
                                  </p>
                                )}
                              </div>
                              {/* Substituir */}
                              {entry?.food_id && (
                                <button onClick={() => openSub(entry)}
                                  className="flex-shrink-0 text-white/15 hover:text-brand-400 transition-colors"
                                  title="Ver substituições">
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {/* Meal total row */}
                      {total.kcal > 0 && (
                        <div className="flex items-center gap-3 px-4 py-2 text-[10px]" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                          <Flame className="w-3 h-3 text-amber-400/50" />
                          <span className="text-amber-400 font-semibold">{total.kcal} kcal</span>
                          <span className="text-white/25">Prot:{total.protein}g · Carb:{total.carbs}g · Gord:{total.fat}g</span>
                        </div>
                      )}
                      {meal.notes && (
                        <p className="text-xs text-white/25 italic px-4 py-2.5 border-t border-white/[0.03]">
                          💡 {meal.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {plan.notes && (
            <div className="mt-4 bg-brand-500/5 border border-brand-500/15 rounded-2xl p-4">
              <p className="text-xs font-semibold text-brand-400 mb-1">Observações gerais</p>
              <p className="text-sm text-white/50 whitespace-pre-wrap">{plan.notes}</p>
            </div>
          )}
        </>
      ) : (
        /* Lista de compras */
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/35">{shopItems.length} ingredientes · {checked.size} marcados</p>
            {checked.size > 0 && (
              <button onClick={() => setChecked(new Set())} className="text-xs text-white/25 hover:text-white/50">Limpar</button>
            )}
          </div>
          {shopItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/25">Nenhum ingrediente no plano ainda</div>
          ) : (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
              <ul className="divide-y divide-white/[0.04]">
                {shopItems.map(item => (
                  <li key={item}>
                    <button onClick={() => setChecked(prev => { const n = new Set(prev); n.has(item) ? n.delete(item) : n.add(item); return n })}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
                      {checked.has(item)
                        ? <CheckSquare className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        : <Square className="w-4 h-4 text-white/20 flex-shrink-0" />}
                      <span className={`text-sm transition-colors ${checked.has(item) ? 'line-through text-white/25' : 'text-white/75'}`}>{item}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Substitution modal */}
      {subEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setSubEntry(null); setSubResults(null) }}>
          <div className="w-full max-w-md rounded-t-2xl overflow-hidden shadow-2xl mb-safe" style={{ background: 'var(--ui-bg)', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-semibold text-white/90">Substituições</p>
                <p className="text-xs text-brand-400 mt-0.5">{subEntry.name}</p>
              </div>
              <button onClick={() => { setSubEntry(null); setSubResults(null) }} className="text-white/30 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 pb-8">
              {loadingSub ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-brand-400 animate-spin" /></div>
              ) : !subResults || subResults.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-8">Nenhuma substituição encontrada na mesma categoria.</p>
              ) : (
                <div className="space-y-1">
                  {subResults.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div>
                        <p className="text-sm text-white/85">{s.name}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{s.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-xs font-semibold text-amber-400">{s.kcal} kcal</p>
                        <p className="text-[10px] text-white/30">P:{s.protein}g · C:{s.carbs}g</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PatientNav />
    </div>
  )
}
