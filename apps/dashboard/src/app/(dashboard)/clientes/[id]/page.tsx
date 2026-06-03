'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  ArrowLeft, Calendar, MessageSquare, Edit2, Save, X, Phone, Target,
  FileText, Clock, Send, TrendingUp, Droplets, Dumbbell, ClipboardList,
  Scale, ChevronUp, ChevronDown, Minus, KeyRound, Copy, RefreshCw, CheckCircle2,
  UtensilsCrossed, FolderOpen, MessageCircle, Plus, Trash2, Download, Paperclip,
  Search, ArrowRightLeft, Flame, ChevronRight,
} from 'lucide-react'
import { useRef } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string; name: string | null; phone: string; goal: string | null
  notes: string | null; birthdate: string | null; created_at: string; updated_at: string
}
interface Appointment {
  id: string; scheduled_at: string; duration: number; modality: string
  status: string; notes: string | null; created_by: string
}
interface Conversation {
  id: string; status: string; created_at: string
  last_message_at: string | null; message_count: number
}
interface ProfileData { client: Client; appointments: Appointment[]; conversations: Conversation[] }

interface WeightEntry { id: string; weight_kg: string; waist_cm: string | null; hip_cm: string | null; notes: string | null; logged_at: string }
interface Checkin { id: string; week_start: string; hunger_score: number; energy_score: number; sleep_score: number; mood_score: number; notes: string | null; created_at: string }
interface ActivityEntry { id: string; activity_type: string; duration_minutes: number | null; notes: string | null; logged_at: string }
interface WaterStat { logged_at: string; total_ml: number }
interface TrackingData { weightLogs: WeightEntry[]; checkins: Checkin[]; activityLogs: ActivityEntry[]; waterStats: WaterStat[] }

interface InviteCode {
  id: string; code: string; client_id: string | null
  used_by: string | null; used_at: string | null
  expires_at: string; created_at: string
}
// FoodEntry = alimento dentro de uma refeição (estruturado com macros)
interface FoodEntry {
  id: string
  food_id?: number
  name: string
  quantity: number
  unit: string
  kcal_per_100g?: number
  protein_per_100g?: number
  carbs_per_100g?: number
  fat_per_100g?: number
  fiber_per_100g?: number
  unit_weight_g?: number
}
interface MealItem { id: string; name: string; time: string; items: FoodEntry[]; notes?: string }
interface MealPlan { id: string; title: string; meals: MealItem[]; notes: string | null; updated_at: string }
interface PatientDoc { id: string; original_name: string; description: string | null; mimetype: string; size_bytes: number; created_at: string }
interface ChatMessage { id: string; from_role: 'patient' | 'nutritionist'; content: string; read_at: string | null; created_at: string }

const STATUS_LABEL: Record<string, string> = { scheduled: 'Agendada', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Realizada' }
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  confirmed:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  cancelled:  'text-red-400 bg-red-500/10 border-red-500/20',
  completed:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

// ── Helpers macros ────────────────────────────────────────────────────────────
const UNIT_W: Record<string, number> = {
  'g':1,'ml':1,'colher de sopa':15,'colher de chá':5,'xícara':200,'fatia':30,'porção':100,'unidade':100,
}
function entryGrams(e: FoodEntry): number {
  const base = ['unidade','fatia','porção'].includes(e.unit) ? (e.unit_weight_g ?? UNIT_W[e.unit] ?? 100) : (UNIT_W[e.unit] ?? 1)
  return e.quantity * base
}
function entryMacros(e: FoodEntry) {
  if (!e.kcal_per_100g) return null
  const f = entryGrams(e) / 100
  return {
    kcal:    Math.round((e.kcal_per_100g    ?? 0) * f),
    protein: Math.round((e.protein_per_100g ?? 0) * f * 10) / 10,
    carbs:   Math.round((e.carbs_per_100g   ?? 0) * f * 10) / 10,
    fat:     Math.round((e.fat_per_100g     ?? 0) * f * 10) / 10,
  }
}
function sumMealMacros(items: FoodEntry[]) {
  return items.reduce((acc, e) => {
    const m = entryMacros(e)
    if (!m) return acc
    return { kcal: acc.kcal + m.kcal, protein: +(acc.protein + m.protein).toFixed(1), carbs: +(acc.carbs + m.carbs).toFixed(1), fat: +(acc.fat + m.fat).toFixed(1) }
  }, { kcal:0, protein:0, carbs:0, fat:0 })
}

// ── TacoFood (resposta da API) ────────────────────────────────────────────────
interface TacoResult { id:number; name:string; category:string; kcal:number; protein:number; carbs:number; fat:number; fiber:number; typical_amount:number; typical_unit:string; unit_weight_g:number }

// ── MealPlanEditor ────────────────────────────────────────────────────────────
function MealPlanEditor({ clientId }: { clientId: string }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('Plano Alimentar')
  const [meals, setMeals] = useState<MealItem[]>([])
  const [notes, setNotes] = useState('')
  // food search state: mealId → query/results/adding
  const [searchQ, setSearchQ] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, TacoResult[]>>({})
  const [adding, setAdding] = useState<Record<string, { food: TacoResult; qty: number; unit: string } | null>>({})
  // substitution modal
  const [subTarget, setSubTarget] = useState<{ mealId: string; entry: FoodEntry } | null>(null)
  const [subResults, setSubResults] = useState<TacoResult[]>([])
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const { isLoading } = useQuery<MealPlan | null>({
    queryKey: ['meal-plan', clientId],
    queryFn: async () => {
      const { data } = await api.get(`/api/features/clients/${clientId}/meal-plan`)
      return data.plan
    },
    staleTime: 30_000,
    onSuccess: (plan: MealPlan | null) => {
      if (plan) {
        setTitle(plan.title)
        setNotes(plan.notes ?? '')
        // migrar itens antigos (string → FoodEntry)
        const migrated = plan.meals.map((m: any) => ({
          ...m,
          items: (m.items ?? []).map((item: any, i: number) =>
            typeof item === 'string'
              ? { id: `legacy-${m.id}-${i}`, name: item, quantity: 1, unit: 'porção' }
              : item
          ),
        }))
        setMeals(migrated)
      }
    },
  } as any)

  const savePlan = useMutation({
    mutationFn: () => api.put(`/api/features/clients/${clientId}/meal-plan`, { title, meals, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-plan', clientId] }); toast.success('Plano salvo!') },
    onError: () => toast.error('Erro ao salvar plano'),
  })

  // ── Food search ─────────────────────────────────────────────────────
  function handleSearchChange(mealId: string, q: string) {
    setSearchQ(prev => ({ ...prev, [mealId]: q }))
    clearTimeout(searchTimers.current[mealId])
    if (q.trim().length < 2) { setResults(prev => ({ ...prev, [mealId]: [] })); return }
    searchTimers.current[mealId] = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/foods/search?q=${encodeURIComponent(q)}&limit=8`)
        setResults(prev => ({ ...prev, [mealId]: data.foods ?? [] }))
      } catch {}
    }, 280)
  }

  function selectFood(mealId: string, food: TacoResult) {
    setAdding(prev => ({ ...prev, [mealId]: { food, qty: food.typical_amount, unit: food.typical_unit } }))
    setSearchQ(prev => ({ ...prev, [mealId]: '' }))
    setResults(prev => ({ ...prev, [mealId]: [] }))
  }

  function confirmAdd(mealId: string) {
    const a = adding[mealId]
    if (!a) return
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      food_id: a.food.id,
      name: a.food.name,
      quantity: a.qty,
      unit: a.unit,
      kcal_per_100g:    a.food.kcal,
      protein_per_100g: a.food.protein,
      carbs_per_100g:   a.food.carbs,
      fat_per_100g:     a.food.fat,
      fiber_per_100g:   a.food.fiber,
      unit_weight_g:    a.food.unit_weight_g,
    }
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, items: [...m.items, entry] } : m))
    setAdding(prev => ({ ...prev, [mealId]: null }))
  }

  function removeEntry(mealId: string, entryId: string) {
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, items: m.items.filter(e => e.id !== entryId) } : m))
  }

  function updateEntry(mealId: string, entryId: string, patch: Partial<FoodEntry>) {
    setMeals(prev => prev.map(m => m.id === mealId
      ? { ...m, items: m.items.map(e => e.id === entryId ? { ...e, ...patch } : e) }
      : m
    ))
  }

  function addMeal() {
    setMeals(prev => [...prev, { id: crypto.randomUUID(), name: 'Nova refeição', time: '', items: [], notes: '' }])
  }

  function removeMeal(mealId: string) { setMeals(prev => prev.filter(m => m.id !== mealId)) }
  function updateMealField(mealId: string, field: 'name' | 'time' | 'notes', val: string) {
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, [field]: val } : m))
  }

  // substitutions
  async function openSub(mealId: string, entry: FoodEntry) {
    if (!entry.food_id) return
    setSubTarget({ mealId, entry })
    try {
      const { data } = await api.get(`/api/foods/${entry.food_id}/substitutions`)
      setSubResults(data.substitutions ?? [])
    } catch {}
  }

  function applySub(sub: TacoResult) {
    if (!subTarget) return
    const { mealId, entry } = subTarget
    updateEntry(mealId, entry.id, {
      food_id: sub.id, name: sub.name,
      kcal_per_100g: sub.kcal, protein_per_100g: sub.protein,
      carbs_per_100g: sub.carbs, fat_per_100g: sub.fat,
      fiber_per_100g: sub.fiber, unit_weight_g: sub.unit_weight_g,
    })
    setSubTarget(null)
    setSubResults([])
  }

  // grand totals
  const grandTotal = meals.reduce((acc, m) => {
    const t = sumMealMacros(m.items)
    return { kcal: acc.kcal + t.kcal, protein: +(acc.protein + t.protein).toFixed(1), carbs: +(acc.carbs + t.carbs).toFixed(1), fat: +(acc.fat + t.fat).toFixed(1) }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const UNITS = ['g','ml','unidade','fatia','colher de sopa','colher de chá','xícara','porção']

  if (isLoading) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-brand-400" /></div>

  return (
    <div className="space-y-5">
      {/* Title + save */}
      <div className="flex items-center gap-3">
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="flex-1 text-sm font-semibold bg-transparent border-0 text-white/80 focus:outline-none focus:text-white placeholder:text-white/30"
          placeholder="Título do plano" />
        <button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex-shrink-0">
          <Save className="w-3.5 h-3.5" />{savePlan.isPending ? 'Salvando…' : 'Salvar plano'}
        </button>
      </div>

      {/* Grand total summary */}
      {grandTotal.kcal > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-xl p-3" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
          {[
            { label: 'Kcal', value: grandTotal.kcal, color: 'text-amber-400' },
            { label: 'Prot', value: `${grandTotal.protein}g`, color: 'text-blue-400' },
            { label: 'Carb', value: `${grandTotal.carbs}g`, color: 'text-emerald-400' },
            { label: 'Gord', value: `${grandTotal.fat}g`, color: 'text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-[10px] text-white/30">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Meals */}
      {meals.length === 0 ? (
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-8 text-center">
          <UtensilsCrossed className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/25">Nenhuma refeição ainda</p>
          <button onClick={addMeal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-400 transition-colors">
            <Plus className="w-3.5 h-3.5" />Adicionar refeição
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map(meal => {
            const mTotal = sumMealMacros(meal.items)
            const isAdding = !!adding[meal.id]
            return (
              <div key={meal.id} className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Meal header */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <input value={meal.name} onChange={e => updateMealField(meal.id, 'name', e.target.value)}
                    className="flex-1 text-sm font-semibold bg-transparent text-white/90 focus:outline-none placeholder:text-white/25" placeholder="Nome da refeição" />
                  <input value={meal.time} onChange={e => updateMealField(meal.id, 'time', e.target.value)}
                    type="time" className="text-xs text-white/40 bg-transparent focus:outline-none w-16 text-right" />
                  <button onClick={() => removeMeal(meal.id)} className="text-white/20 hover:text-red-400 transition-colors ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Food items */}
                {meal.items.length > 0 && (
                  <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {meal.items.map(entry => {
                      const m = entryMacros(entry)
                      return (
                        <li key={entry.id} className="flex items-center gap-2 px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/85 truncate">{entry.name}</p>
                            {m && (
                              <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-2">
                                <span className="text-amber-400">{m.kcal}kcal</span>
                                <span>P:{m.protein}g</span>
                                <span>C:{m.carbs}g</span>
                                <span>G:{m.fat}g</span>
                              </p>
                            )}
                          </div>
                          {/* Qty + unit inline */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <input
                              type="number" min="0" step="any"
                              value={entry.quantity}
                              onChange={e => updateEntry(meal.id, entry.id, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-14 text-right text-xs text-white/70 bg-transparent focus:outline-none focus:text-white"
                              style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', background: 'var(--surface)' }}
                            />
                            <select value={entry.unit}
                              onChange={e => updateEntry(meal.id, entry.id, { unit: e.target.value })}
                              className="text-[10px] text-white/50 focus:outline-none cursor-pointer"
                              style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '2px 4px', background: 'var(--surface)', color: 'var(--t2)', maxWidth: 80 }}>
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          {/* Substituir */}
                          {entry.food_id && (
                            <button onClick={() => openSub(meal.id, entry)} title="Substituições"
                              className="text-white/20 hover:text-brand-400 transition-colors flex-shrink-0">
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => removeEntry(meal.id, entry.id)}
                            className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Meal total */}
                {mTotal.kcal > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 text-[10px]" style={{ borderTop: '1px solid var(--border)', background: 'var(--raised)' }}>
                    <Flame className="w-3 h-3 text-amber-400/60" />
                    <span className="text-amber-400 font-semibold">{mTotal.kcal} kcal</span>
                    <span className="text-white/30">P:{mTotal.protein}g · C:{mTotal.carbs}g · G:{mTotal.fat}g</span>
                  </div>
                )}

                {/* Food search */}
                <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                  {!isAdding ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                      <input
                        value={searchQ[meal.id] ?? ''}
                        onChange={e => handleSearchChange(meal.id, e.target.value)}
                        placeholder="Buscar alimento (ex: frango, aveia, banana…)"
                        className="w-full pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none rounded-lg transition-colors"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      />
                      {/* Dropdown results */}
                      {(results[meal.id]?.length ?? 0) > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl overflow-hidden shadow-xl"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          {results[meal.id].map(food => (
                            <button key={food.id} onClick={() => selectFood(meal.id, food)}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-raised text-left transition-colors">
                              <span className="text-sm text-white/85">{food.name}</span>
                              <span className="text-[10px] text-white/30 flex-shrink-0 ml-3">{food.kcal}kcal/100g · {food.category}</span>
                            </button>
                          ))}
                          <button onClick={() => {
                            const custom = searchQ[meal.id]?.trim()
                            if (!custom) return
                            const entry: FoodEntry = { id: crypto.randomUUID(), name: custom, quantity: 1, unit: 'porção' }
                            setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, items: [...m.items, entry] } : m))
                            setSearchQ(prev => ({ ...prev, [meal.id]: '' }))
                            setResults(prev => ({ ...prev, [meal.id]: [] }))
                          }} className="w-full flex items-center gap-2 px-4 py-2.5 text-white/40 hover:text-white/70 text-xs border-t transition-colors" style={{ borderColor: 'var(--border)' }}>
                            <Plus className="w-3.5 h-3.5" />Adicionar &quot;{searchQ[meal.id]}&quot; manualmente
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Confirm add panel */
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white/70 flex-shrink-0 truncate max-w-[160px]">{adding[meal.id]?.food.name}</span>
                      <input type="number" min="0" step="any"
                        value={adding[meal.id]?.qty ?? 1}
                        onChange={e => setAdding(prev => ({ ...prev, [meal.id]: prev[meal.id] ? { ...prev[meal.id]!, qty: parseFloat(e.target.value) || 0 } : null }))}
                        className="w-16 text-sm text-white focus:outline-none rounded-lg px-2 py-1"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      />
                      <select value={adding[meal.id]?.unit ?? 'g'}
                        onChange={e => setAdding(prev => ({ ...prev, [meal.id]: prev[meal.id] ? { ...prev[meal.id]!, unit: e.target.value } : null }))}
                        className="text-xs text-white/70 focus:outline-none rounded-lg px-2 py-1"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button onClick={() => confirmAdd(meal.id)}
                        className="px-3 py-1 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-lg transition-colors">
                        Adicionar
                      </button>
                      <button onClick={() => setAdding(prev => ({ ...prev, [meal.id]: null }))}
                        className="text-white/30 hover:text-white text-xs transition-colors">Cancelar</button>
                    </div>
                  )}
                </div>

                {/* Meal notes */}
                <div className="px-4 pb-3">
                  <input value={meal.notes ?? ''} onChange={e => updateMealField(meal.id, 'notes', e.target.value)}
                    placeholder="Observação da refeição (opcional)"
                    className="w-full text-xs text-white/40 placeholder:text-white/20 bg-transparent focus:outline-none focus:text-white/70 transition-colors" />
                </div>
              </div>
            )
          })}

          <button onClick={addMeal}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
            style={{ border: '1px dashed var(--border)' }}>
            <Plus className="w-4 h-4" />Nova refeição
          </button>
        </div>
      )}

      {/* General notes */}
      <div>
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2">Observações gerais</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder="Ex: Beber 2L de água por dia, evitar processados..."
          className="w-full bg-ui-card border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/60 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none transition-colors" />
      </div>

      {/* Substitution modal */}
      {subTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setSubTarget(null); setSubResults([]) }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold text-white/90">Substituições para</p>
              <p className="text-xs text-brand-400 mt-0.5">{subTarget.entry.name}</p>
            </div>
            <div className="p-2">
              {subResults.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">Nenhuma substituição encontrada</p>
              ) : subResults.map(s => (
                <button key={s.id} onClick={() => applySub(s)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-raised text-left transition-colors">
                  <div>
                    <p className="text-sm text-white/85">{s.name}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{s.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-xs text-amber-400 font-semibold">{s.kcal} kcal</p>
                    <p className="text-[10px] text-white/30">P:{s.protein}g C:{s.carbs}g</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setSubTarget(null); setSubResults([]) }}
                className="w-full text-xs text-white/30 hover:text-white/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return p
}

function scoreColor(n: number) {
  if (n >= 4) return 'text-emerald-400'
  if (n <= 2) return 'text-red-400'
  return 'text-amber-400'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'appointments' | 'conversations' | 'tracking' | 'access' | 'plan' | 'docs' | 'chat'>('appointments')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  // Chat
  const [chatText, setChatText] = useState('')
  const chatBottomRef = useRef<HTMLDivElement>(null)
  // Docs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docDesc, setDocDesc] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', goal: '', notes: '', birthdate: '' })

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data: d } = await api.get(`/api/clients/${id}`)
      return d as ProfileData
    },
  })

  const { data: trackingData } = useQuery<TrackingData>({
    queryKey: ['client-tracking', id],
    queryFn: async () => {
      const { data: d } = await api.get(`/api/clients/${id}/tracking`)
      return d as TrackingData
    },
    enabled: tab === 'tracking',
    staleTime: 30_000,
  })

  const { data: inviteCodes, refetch: refetchCodes } = useQuery<InviteCode[]>({
    queryKey: ['invite-codes', id],
    queryFn: async () => {
      const { data: d } = await api.get('/api/patient/invite-codes')
      return (d.codes as InviteCode[]).filter((c: InviteCode) => c.client_id === id)
    },
    enabled: tab === 'access',
    staleTime: 30_000,
  })

  const generateCode = useMutation({
    mutationFn: () => api.post('/api/patient/invite-codes', { client_id: id }),
    onSuccess: () => { refetchCodes(); toast.success('Código gerado!') },
    onError: () => toast.error('Erro ao gerar código'),
  })

  // ── Documentos ───────────────────────────────────────────────────────────────
  const { data: docs, refetch: refetchDocs } = useQuery<PatientDoc[]>({
    queryKey: ['client-docs', id],
    queryFn: async () => {
      const { data: d } = await api.get(`/api/features/clients/${id}/documents`)
      return d.documents
    },
    enabled: tab === 'docs',
    staleTime: 30_000,
  })

  const uploadDoc = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/api/features/clients/${id}/documents?description=${encodeURIComponent(docDesc)}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => { refetchDocs(); setDocDesc(''); toast.success('Arquivo enviado!') },
    onError: () => toast.error('Erro ao enviar arquivo'),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => api.delete(`/api/features/documents/${docId}`),
    onSuccess: () => { refetchDocs(); toast.success('Documento removido') },
    onError: () => toast.error('Erro ao remover'),
  })

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const { data: chatMessages, refetch: refetchChat } = useQuery<ChatMessage[]>({
    queryKey: ['client-chat', id],
    queryFn: async () => {
      const { data: d } = await api.get(`/api/features/clients/${id}/chat`)
      return d.messages
    },
    enabled: tab === 'chat',
    refetchInterval: tab === 'chat' ? 10_000 : false,
    staleTime: 5_000,
  })

  useEffect(() => {
    if (tab === 'chat') {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [chatMessages, tab])

  const sendChatMsg = useMutation({
    mutationFn: (content: string) => api.post(`/api/features/clients/${id}/chat`, { content }),
    onSuccess: () => { refetchChat(); setChatText('') },
    onError: () => toast.error('Erro ao enviar mensagem'),
  })

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  useEffect(() => {
    if (data?.client) {
      const c = data.client
      setForm({ name: c.name ?? '', goal: c.goal ?? '', notes: c.notes ?? '', birthdate: c.birthdate ? c.birthdate.slice(0, 10) : '' })
    }
  }, [data])

  const sendPortalLink = useMutation({
    mutationFn: () => api.post('/api/patient/auth/request', { clientId: id }),
    onSuccess: (res) => {
      const link = res.data?.link
      if (link) { navigator.clipboard?.writeText(link).catch(() => {}); toast.success('Link enviado via WhatsApp e copiado!', { duration: 5000 }) }
      else toast.success('Link enviado via WhatsApp!')
    },
    onError: () => toast.error('Erro ao gerar link. WhatsApp conectado?'),
  })

  const saveMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      await api.patch(`/api/clients/${id}`, { name: body.name || undefined, goal: body.goal || undefined, notes: body.notes || undefined, birthdate: body.birthdate || undefined })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', id] }); qc.invalidateQueries({ queryKey: ['clients'] }); setEditing(false); toast.success('Dados salvos!') },
    onError: () => toast.error('Erro ao salvar'),
  })

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="p-8">
      <p className="text-white/40">Cliente não encontrado.</p>
      <button onClick={() => router.back()} className="mt-4 text-brand-400 text-sm">← Voltar</button>
    </div>
  )

  const { client, appointments, conversations } = data
  const displayName = (client.name && client.name !== 'Cliente') ? client.name : formatPhone(client.phone)
  // Avatar: pega a primeira letra do nome real, ou "?" para telefones
  const avatarChar = client.name && client.name !== 'Cliente'
    ? client.name.replace(/\s+/g, '').charAt(0).toUpperCase()
    : '#'

  // Weight delta
  const wLogs = trackingData?.weightLogs ?? []
  const weightDelta = wLogs.length >= 2 && wLogs[0].weight_kg && wLogs[1].weight_kg
    ? parseFloat(wLogs[0].weight_kg) - parseFloat(wLogs[1].weight_kg)
    : null

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Back */}
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Clientes
      </Link>

      {/* Header card */}
      <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 mb-5">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Nome</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do paciente" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Data de nascimento</label>
                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                  value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Objetivo</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder="Ex: perda de peso, ganho de massa..." />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Anotações clínicas</label>
              <textarea rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40 resize-none"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anotações clínicas, observações..." />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Save className="w-3.5 h-3.5" />{saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white text-sm rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold ${
                avatarChar === '#'
                  ? 'bg-white/5 border border-white/10 text-white/20'
                  : 'bg-brand-500/15 border border-brand-500/25 text-brand-400'
              }`}>
                {avatarChar === '#' ? <Phone className="w-5 h-5 text-white/20" /> : avatarChar}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white leading-tight">{displayName}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  <span className="text-sm text-white/40 flex items-center gap-1">
                    <Phone className="w-3 h-3" />{formatPhone(client.phone)}
                  </span>
                  {client.birthdate && (
                    <span className="text-xs text-white/30">
                      {(() => {
                        try {
                          const s = String(client.birthdate).slice(0, 10)
                          return format(parseISO(s), 'dd/MM/yyyy')
                        } catch { return String(client.birthdate).slice(0, 10) }
                      })()}
                    </span>
                  )}
                </div>
                {client.goal && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-brand-500/8 border border-brand-500/15 text-xs text-brand-400">
                    <Target className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate max-w-[260px]">{client.goal}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => sendPortalLink.mutate()}
                  disabled={sendPortalLink.isPending}
                  title="Envia link de acesso ao portal do paciente via WhatsApp"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 text-brand-400 hover:text-brand-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <Send className="w-3 h-3" />{sendPortalLink.isPending ? 'Enviando…' : 'Portal do paciente'}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  <Edit2 className="w-3 h-3" />Editar
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/[0.05]">
              <div className="text-center py-1">
                <p className="text-2xl font-bold text-white tabular-nums">{appointments.length}</p>
                <p className="text-[11px] text-white/30 mt-0.5">Consultas</p>
              </div>
              <div className="text-center py-1">
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {appointments.filter((a: Appointment) => a.status === 'completed').length}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">Realizadas</p>
              </div>
              <div className="text-center py-1">
                <p className="text-2xl font-bold text-white tabular-nums">{conversations.length}</p>
                <p className="text-[11px] text-white/30 mt-0.5">Conversas</p>
              </div>
              <div className="text-center py-1">
                {/* Próxima consulta */}
                {(() => {
                  const upcoming = appointments
                    .filter((a: Appointment) => ['scheduled', 'confirmed'].includes(a.status) && new Date(a.scheduled_at) > new Date())
                    .sort((a: Appointment, b: Appointment) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
                  if (upcoming) {
                    return (
                      <>
                        <p className="text-base font-bold text-violet-400 tabular-nums leading-tight">
                          {format(new Date(upcoming.scheduled_at), 'd/MM')}
                        </p>
                        <p className="text-[10px] text-white/30">{format(new Date(upcoming.scheduled_at), 'HH:mm')}</p>
                        <p className="text-[10px] text-white/25 mt-0">Próxima</p>
                      </>
                    )
                  }
                  return (
                    <>
                      <p className="text-2xl font-bold text-white/15 tabular-nums">—</p>
                      <p className="text-[11px] text-white/30 mt-0.5">Próxima</p>
                    </>
                  )
                })()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      {!editing && client.notes && (
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">Anotações clínicas</span>
          </div>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-ui-card border border-white/[0.06] rounded-xl flex-wrap">
        {([
          { key: 'appointments',  label: 'Consultas',      icon: Calendar,         count: appointments.length },
          { key: 'conversations', label: 'Conversas',      icon: MessageSquare,    count: conversations.length },
          { key: 'plan',          label: 'Plano',          icon: UtensilsCrossed,  count: null },
          { key: 'docs',          label: 'Documentos',     icon: FolderOpen,       count: null },
          { key: 'chat',          label: 'Chat',           icon: MessageCircle,    count: null },
          { key: 'tracking',      label: 'Evolução',       icon: TrendingUp,       count: null },
          { key: 'access',        label: 'Acesso',         icon: KeyRound,         count: null },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-brand-500/10 text-brand-400' : 'text-white/40 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== null && <span className="text-xs opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* ── Tab: Consultas ── */}
      {tab === 'appointments' && (
        <div className="space-y-2">
          {appointments.length === 0 && <div className="text-center py-12 text-sm text-white/25">Nenhuma consulta registrada</div>}
          {appointments.map((appt: Appointment) => (
            <div key={appt.id} className="bg-ui-card border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {new Date(appt.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {appt.modality === 'presencial' ? 'Presencial' : 'Online'} · {appt.duration} min
                  {appt.created_by === 'assistant' ? ' · Agendada pela IA' : ''}
                </p>
                {appt.notes && <p className="text-xs text-white/25 mt-1 truncate">{appt.notes}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${STATUS_COLOR[appt.status] ?? 'text-white/40 bg-white/5 border-white/10'}`}>
                {STATUS_LABEL[appt.status] ?? appt.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Conversas ── */}
      {tab === 'conversations' && (
        <div className="space-y-2">
          {conversations.length === 0 && <div className="text-center py-12 text-sm text-white/25">Nenhuma conversa registrada</div>}
          {conversations.map((conv: Conversation) => (
            <Link key={conv.id} href={`/conversas?id=${conv.id}`}
              className="bg-ui-card border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 hover:border-white/10 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{conv.message_count} mensagen{conv.message_count !== 1 ? 's' : ''}</p>
                <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR, addSuffix: true }) : 'Sem mensagens'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg border font-medium flex-shrink-0 ${
                conv.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                conv.status === 'human_takeover' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                'text-white/30 bg-white/5 border-white/10'}`}>
                {conv.status === 'active' ? 'Ativa' : conv.status === 'human_takeover' ? 'Assumida' : 'Encerrada'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Tab: Acompanhamento ── */}
      {tab === 'tracking' && (
        <div className="space-y-5">

          {/* Peso */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-white/80">Peso e medidas</h3>
              {wLogs.length > 0 && wLogs[0].weight_kg && (
                <span className="ml-auto text-lg font-bold text-white">
                  {parseFloat(wLogs[0].weight_kg).toFixed(1)}kg
                </span>
              )}
              {weightDelta !== null && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${weightDelta < 0 ? 'text-emerald-400' : weightDelta > 0 ? 'text-amber-400' : 'text-white/30'}`}>
                  {weightDelta < 0 ? <ChevronDown className="w-3 h-3" /> : weightDelta > 0 ? <ChevronUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {Math.abs(weightDelta).toFixed(1)}kg
                </span>
              )}
            </div>
            {wLogs.length === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhum registro de peso ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                <ul className="divide-y divide-white/[0.04]">
                  {wLogs.slice(0, 10).map(w => (
                    <li key={w.id} className="flex items-center gap-4 px-4 py-3">
                      <p className="text-sm text-white/40 w-20 flex-shrink-0">{format(parseISO(w.logged_at), "dd/MM/yyyy")}</p>
                      <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                        <span className="font-semibold text-white">{w.weight_kg ? `${parseFloat(w.weight_kg).toFixed(1)}kg` : '—'}</span>
                        <span className="text-white/40">C: {w.waist_cm ? `${parseFloat(w.waist_cm).toFixed(0)}cm` : '—'}</span>
                        <span className="text-white/40">Q: {w.hip_cm ? `${parseFloat(w.hip_cm).toFixed(0)}cm` : '—'}</span>
                      </div>
                      {w.notes && <p className="text-xs text-white/25 truncate max-w-[120px]">{w.notes}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Check-ins */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white/80">Check-ins semanais</h3>
              <span className="ml-auto text-xs text-white/30">{trackingData?.checkins.length ?? 0} registros</span>
            </div>
            {(trackingData?.checkins.length ?? 0) === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhum check-in enviado ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-4 py-2 border-b border-white/[0.04]">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider w-20">Semana</p>
                  <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                    {['🍽️ Fome', '⚡ Energia', '😴 Sono', '😊 Humor'].map(l => (
                      <p key={l} className="text-[10px] font-semibold text-white/25">{l}</p>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-white/25 w-12 text-center">Média</p>
                </div>
                <ul className="divide-y divide-white/[0.04]">
                  {trackingData?.checkins.map(c => {
                    const avg = ((c.hunger_score + c.energy_score + c.sleep_score + c.mood_score) / 4)
                    return (
                      <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                        <p className="text-sm text-white/40 w-20 flex-shrink-0">
                          {format(parseISO(c.week_start), "dd/MM")}
                        </p>
                        <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                          {[c.hunger_score, c.energy_score, c.sleep_score, c.mood_score].map((v, i) => (
                            <span key={i} className={`text-base font-bold ${scoreColor(v)}`}>{v}</span>
                          ))}
                        </div>
                        <div className="w-12 text-center">
                          <span className={`text-sm font-bold ${scoreColor(Math.round(avg))}`}>{avg.toFixed(1)}</span>
                        </div>
                        {c.notes && (
                          <p className="text-xs text-white/25 truncate max-w-[100px]" title={c.notes}>{c.notes}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* Água (últimos 7 dias) */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white/80">Água — últimos 7 dias</h3>
            </div>
            {(trackingData?.waterStats.length ?? 0) === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhum registro de água ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-end gap-2 h-20">
                  {(trackingData?.waterStats ?? []).map(w => {
                    const pct = Math.min(w.total_ml / 2000, 1)
                    return (
                      <div key={w.logged_at} className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-[9px] text-white/30">{(w.total_ml / 1000).toFixed(1)}L</p>
                        <div className="w-full bg-white/5 rounded-sm overflow-hidden" style={{ height: '48px' }}>
                          <div
                            className={`w-full rounded-sm transition-all ${pct >= 1 ? 'bg-emerald-500' : pct >= 0.6 ? 'bg-cyan-500' : 'bg-cyan-500/40'}`}
                            style={{ height: `${pct * 100}%`, marginTop: `${(1 - pct) * 100}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-white/25">{format(parseISO(w.logged_at), 'dd/MM')}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-white/20 text-center mt-2">Meta: 2L/dia · Verde = atingiu a meta</p>
              </div>
            )}
          </section>

          {/* Atividades recentes */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white/80">Atividades físicas</h3>
            </div>
            {(trackingData?.activityLogs.length ?? 0) === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhuma atividade registrada ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                <ul className="divide-y divide-white/[0.04]">
                  {trackingData?.activityLogs.slice(0, 10).map(a => (
                    <li key={a.id} className="flex items-center gap-4 px-4 py-3">
                      <p className="text-xs text-white/35 w-16 flex-shrink-0">{format(parseISO(a.logged_at), 'dd/MM')}</p>
                      <p className="flex-1 text-sm font-medium text-white/80">{a.activity_type}</p>
                      {a.duration_minutes && <p className="text-xs text-white/30 flex-shrink-0">{a.duration_minutes} min</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Tab: Plano Alimentar ── */}
      {tab === 'plan' && <MealPlanEditor clientId={id} />}

      {/* ── Tab: Documentos ── */}
      {tab === 'docs' && (
        <div className="space-y-4">
          {/* Upload area */}
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-white/70">Enviar arquivo</p>
            <input
              value={docDesc}
              onChange={e => setDocDesc(e.target.value)}
              placeholder="Descrição (ex: Exame de sangue, Cardápio semana 1...)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) { uploadDoc.mutate(file); e.target.value = '' }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDoc.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-brand-500/30 rounded-xl text-sm text-brand-400 hover:bg-brand-500/5 transition-colors disabled:opacity-50"
            >
              {uploadDoc.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              {uploadDoc.isPending ? 'Enviando…' : 'Selecionar arquivo (PDF, imagem, Word)'}
            </button>
          </div>

          {/* Doc list */}
          {!docs || docs.length === 0 ? (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-8 text-center">
              <FolderOpen className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/25">Nenhum documento enviado ainda</p>
            </div>
          ) : (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
              <ul className="divide-y divide-white/[0.04]">
                {docs.map(doc => (
                  <li key={doc.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-base">
                      {doc.mimetype.includes('pdf') ? '📄' : doc.mimetype.includes('image') ? '🖼️' : '📎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85 truncate">{doc.original_name}</p>
                      {doc.description && <p className="text-xs text-white/35 truncate">{doc.description}</p>}
                      <p className="text-[10px] text-white/20 mt-0.5">
                        {format(new Date(doc.created_at), "d MMM yyyy", { locale: ptBR })} · {(doc.size_bytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button onClick={() => deleteDoc.mutate(doc.id)} disabled={deleteDoc.isPending}
                      className="text-red-400/30 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Chat ── */}
      {tab === 'chat' && (
        <div className="flex flex-col" style={{ height: '500px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
            {!chatMessages || chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-8 h-8 text-white/10 mb-3" />
                <p className="text-sm text-white/25">Sem mensagens ainda</p>
                <p className="text-xs text-white/15 mt-1">O paciente pode te enviar mensagens pelo app</p>
              </div>
            ) : (
              chatMessages.map(msg => {
                const isMe = msg.from_role === 'nutritionist'
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%]">
                      {!isMe && <p className="text-[10px] text-white/25 mb-1 ml-1">Paciente</p>}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-brand-500 text-white rounded-br-md' : 'bg-white/[0.08] text-white/80 rounded-bl-md'}`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-white/20 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                        {isMe && msg.read_at && ' · Lida'}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-white/[0.05] pt-3 flex-shrink-0">
            <input
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && chatText.trim()) { e.preventDefault(); sendChatMsg.mutate(chatText.trim()) } }}
              placeholder="Mensagem para o paciente..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-500/40"
            />
            <button
              onClick={() => { if (chatText.trim()) sendChatMsg.mutate(chatText.trim()) }}
              disabled={!chatText.trim() || sendChatMsg.isPending}
              className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-all disabled:opacity-40"
            >
              {sendChatMsg.isPending ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Acesso ── */}
      {tab === 'access' && (
        <div className="space-y-5">

          {/* Info card */}
          <div className="flex items-start gap-3 bg-brand-500/5 border border-brand-500/15 rounded-2xl p-4">
            <KeyRound className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-brand-300/80 leading-relaxed">
              Gere um <strong>código de acesso</strong> para este paciente criar a conta no portal. O código expira em 7 dias e só pode ser usado uma vez.
              <br />
              <span className="text-white/35 mt-1 block">O paciente acessa o portal pelo link do site e usa o código para se cadastrar.</span>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/80">Códigos de acesso</h3>
            <button
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-brand-500/20"
            >
              {generateCode.isPending
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <KeyRound className="w-3.5 h-3.5" />}
              Gerar novo código
            </button>
          </div>

          {/* Codes list */}
          {!inviteCodes || inviteCodes.length === 0 ? (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-8 text-center">
              <KeyRound className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/25">Nenhum código gerado ainda</p>
              <p className="text-xs text-white/15 mt-1">Clique em "Gerar novo código" para liberar o acesso</p>
            </div>
          ) : (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
              <ul className="divide-y divide-white/[0.04]">
                {inviteCodes.map(ic => {
                  const expired = new Date(ic.expires_at) < new Date()
                  const used = !!ic.used_by
                  return (
                    <li key={ic.id} className="flex items-center gap-4 px-5 py-4">
                      {/* Code badge */}
                      <div className={`font-mono text-lg font-bold tracking-widest px-3 py-1.5 rounded-xl border flex-shrink-0 ${
                        used
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : expired
                            ? 'text-white/20 bg-white/5 border-white/10 line-through'
                            : 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                      }`}>
                        {ic.code}
                      </div>

                      {/* Status */}
                      <div className="flex-1 min-w-0">
                        {used ? (
                          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Utilizado
                          </p>
                        ) : expired ? (
                          <p className="text-xs text-white/25">Expirado</p>
                        ) : (
                          <p className="text-xs text-white/50">
                            Expira {formatDistanceToNow(new Date(ic.expires_at), { locale: ptBR, addSuffix: true })}
                          </p>
                        )}
                        <p className="text-[10px] text-white/20 mt-0.5">
                          Criado em {format(new Date(ic.created_at), "d 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>

                      {/* Copy button (only if unused & not expired) */}
                      {!used && !expired && (
                        <button
                          onClick={() => copyCode(ic.code)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
                            copiedCode === ic.code
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-white/40 bg-white/5 border-white/10 hover:text-white/70 hover:border-white/20'
                          }`}
                          title="Copiar código"
                        >
                          {copiedCode === ic.code
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado</>
                            : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Quick share hint */}
          {inviteCodes && inviteCodes.some(c => !c.used_by && new Date(c.expires_at) > new Date()) && (
            <p className="text-xs text-white/20 text-center">
              Compartilhe o código com o paciente pelo WhatsApp. Ele acessa o site, clica em "Paciente → Criar conta" e insere o código.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
