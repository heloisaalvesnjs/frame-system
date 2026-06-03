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
    const m = entryMacros(e); if (!m) return acc
    return { kcal: acc.kcal + m.kcal, protein: +(acc.protein + m.protein).toFixed(1), carbs: +(acc.carbs + m.carbs).toFixed(1), fat: +(acc.fat + m.fat).toFixed(1) }
  }, { kcal:0, protein:0, carbs:0, fat:0 })
}

// ── TacoFood (resposta da API) ────────────────────────────────────────────────
interface TacoResult { id:number; name:string; category:string; kcal:number; protein:number; carbs:number; fat:number; fiber:number; typical_amount:number; typical_unit:string; unit_weight_g:number }

// ── TACO visual helpers ───────────────────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  'Cereais e grãos':'🌾','Tubérculos':'🥔','Proteínas animais':'🥩',
  'Ovos e derivados':'🥚','Leite e derivados':'🥛','Leguminosas':'🫘',
  'Verduras e legumes':'🥦','Frutas':'🍎','Gorduras e óleos':'🫒',
  'Oleaginosas e sementes':'🥜','Açúcares e adoçantes':'🍯','Bebidas':'☕','Suplementos':'💊',
}
// Specific food emojis for a nicer grid
const FOOD_EMOJI: Record<number,string> = {
  1:'🍚',2:'🍚',3:'🥖',4:'🍞',5:'🍞',6:'🥣',7:'🍝',8:'🍝',9:'🥞',10:'🌿',
  11:'🥣',12:'🌽',13:'🥣',14:'🌽',15:'🥣',16:'🍞',17:'🍠',18:'🥔',19:'🌿',
  20:'🌿',21:'🌿',22:'🍗',23:'🍗',24:'🥩',25:'🥩',26:'🐟',27:'🐟',28:'🐠',
  29:'🐟',30:'🥩',31:'🦃',32:'🦐',33:'🥩',34:'🥩',35:'🥚',36:'🍳',37:'🥚',
  38:'🥚',39:'🥛',40:'🥛',41:'🥛',42:'🫙',43:'🫙',44:'🫙',45:'🧀',46:'🧀',
  47:'🧀',48:'🧀',49:'🧀',50:'🥛',51:'🥛',52:'🫘',53:'🫘',54:'🫘',55:'🫘',
  56:'🟢',57:'🫘',58:'🫘',59:'🥦',60:'🥬',61:'🥬',62:'🍅',63:'🥗',64:'🥕',
  65:'🥒',66:'🍆',67:'🥒',68:'🫚',69:'🥬',70:'🥦',71:'🫑',72:'🫛',73:'🌿',
  74:'🌿',75:'🌽',76:'🍌',77:'🍎',78:'🍊',79:'🍈',80:'🍍',81:'🍇',82:'🍓',
  83:'🍈',84:'🍉',85:'🥑',86:'🥭',87:'🍐',88:'🍈',89:'🥝',90:'🍊',91:'🍑',
  92:'🥥',93:'🫒',94:'🥥',95:'🧈',96:'🧈',97:'🫒',98:'🥜',99:'🌰',100:'🥜',
  101:'🌰',102:'🥜',103:'⚫',104:'🟤',105:'🌻',106:'⚪',107:'🌰',108:'🍯',
  109:'🍬',110:'🍬',111:'🍓',112:'🍊',113:'☕',114:'🍵',115:'🥤',
  116:'💪',117:'💪',118:'🌱',119:'💊',120:'🔋',
}
const CATEGORY_GROUPS = [
  { id:'prot',  label:'Proteínas',    emoji:'🥩', cats:['Proteínas animais','Ovos e derivados','Leguminosas'] },
  { id:'carb',  label:'Carboidratos', emoji:'🌾', cats:['Cereais e grãos','Tubérculos'] },
  { id:'lact',  label:'Laticínios',   emoji:'🥛', cats:['Leite e derivados'] },
  { id:'veg',   label:'Vegetais',     emoji:'🥦', cats:['Verduras e legumes'] },
  { id:'fruit', label:'Frutas',       emoji:'🍎', cats:['Frutas'] },
  { id:'gord',  label:'Gorduras',     emoji:'🫒', cats:['Gorduras e óleos','Oleaginosas e sementes'] },
  { id:'other', label:'Outros',       emoji:'✨', cats:['Açúcares e adoçantes','Bebidas','Suplementos'] },
]

// ── Default meals template ────────────────────────────────────────────────────
const DEFAULT_MEALS: MealItem[] = [
  { id:'dm-1', name:'Café da manhã',  time:'07:00', items:[], notes:'' },
  { id:'dm-2', name:'Almoço',         time:'12:00', items:[], notes:'' },
  { id:'dm-3', name:'Café da tarde',  time:'15:30', items:[], notes:'' },
  { id:'dm-4', name:'Jantar',         time:'19:00', items:[], notes:'' },
  { id:'dm-5', name:'Ceia',           time:'21:00', items:[], notes:'' },
]

// ── MealPlanEditor ────────────────────────────────────────────────────────────
function MealPlanEditor({ clientId }: { clientId: string }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('Plano Alimentar')
  const [meals, setMeals] = useState<MealItem[]>(DEFAULT_MEALS.map(m => ({ ...m, id: crypto.randomUUID() })))
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)
  // food search per meal
  const [searchQ, setSearchQ] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, TacoResult[]>>({})
  // substitution modal state
  const [subTarget, setSubTarget] = useState<{ mealId: string; entry: FoodEntry } | null>(null)
  const [allFoods, setAllFoods] = useState<TacoResult[]>([])
  const [subSearch, setSubSearch] = useState('')
  const [subCat, setSubCat] = useState<string | null>(null)
  const [subLoading, setSubLoading] = useState(false)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const UNITS = ['g','ml','unidade','fatia','colher de sopa','colher de chá','xícara','porção']

  const { isLoading } = useQuery<MealPlan | null>({
    queryKey: ['meal-plan', clientId],
    queryFn: async () => { const { data } = await api.get(`/api/features/clients/${clientId}/meal-plan`); return data.plan },
    staleTime: 30_000,
    onSuccess: (plan: MealPlan | null) => {
      if (plan && !loaded) {
        setLoaded(true); setTitle(plan.title); setNotes(plan.notes ?? '')
        setMeals(plan.meals.map((m: any) => ({
          ...m,
          items: (m.items ?? []).map((it: any, i: number) =>
            typeof it === 'string' ? { id:`legacy-${m.id}-${i}`, name:it, quantity:1, unit:'porção' } : it
          ),
        })))
      }
    },
  } as any)

  const savePlan = useMutation({
    mutationFn: () => api.put(`/api/features/clients/${clientId}/meal-plan`, { title, meals, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-plan', clientId] }); toast.success('Plano salvo!') },
    onError: () => toast.error('Erro ao salvar plano'),
  })

  // ── Food search (debounced) ──────────────────────────────────────────
  function handleSearch(mealId: string, q: string) {
    setSearchQ(p => ({ ...p, [mealId]: q }))
    clearTimeout(timers.current[mealId])
    if (q.trim().length < 2) { setResults(p => ({ ...p, [mealId]: [] })); return }
    timers.current[mealId] = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/foods/search?q=${encodeURIComponent(q)}&limit=8`)
        setResults(p => ({ ...p, [mealId]: data.foods ?? [] }))
      } catch {}
    }, 260)
  }

  function addFoodFromTaco(mealId: string, food: TacoResult) {
    const entry: FoodEntry = {
      id: crypto.randomUUID(), food_id: food.id, name: food.name,
      quantity: food.typical_amount, unit: food.typical_unit,
      kcal_per_100g: food.kcal, protein_per_100g: food.protein,
      carbs_per_100g: food.carbs, fat_per_100g: food.fat,
      fiber_per_100g: food.fiber, unit_weight_g: food.unit_weight_g,
    }
    setMeals(p => p.map(m => m.id === mealId ? { ...m, items: [...m.items, entry] } : m))
    setSearchQ(p => ({ ...p, [mealId]: '' }))
    setResults(p => ({ ...p, [mealId]: [] }))
  }

  function addFoodCustom(mealId: string, name: string) {
    if (!name.trim()) return
    const entry: FoodEntry = { id: crypto.randomUUID(), name: name.trim(), quantity: 1, unit: 'porção' }
    setMeals(p => p.map(m => m.id === mealId ? { ...m, items: [...m.items, entry] } : m))
    setSearchQ(p => ({ ...p, [mealId]: '' }))
    setResults(p => ({ ...p, [mealId]: [] }))
  }

  function removeEntry(mealId: string, eid: string) {
    setMeals(p => p.map(m => m.id === mealId ? { ...m, items: m.items.filter(e => e.id !== eid) } : m))
  }
  function patchEntry(mealId: string, eid: string, patch: Partial<FoodEntry>) {
    setMeals(p => p.map(m => m.id === mealId ? { ...m, items: m.items.map(e => e.id === eid ? { ...e, ...patch } : e) } : m))
  }
  function addMeal() { setMeals(p => [...p, { id: crypto.randomUUID(), name: 'Nova refeição', time: '', items: [], notes: '' }]) }
  function removeMeal(mid: string) { setMeals(p => p.filter(m => m.id !== mid)) }
  function patchMeal(mid: string, field: 'name'|'time'|'notes', val: string) {
    setMeals(p => p.map(m => m.id === mid ? { ...m, [field]: val } : m))
  }

  // ── Tabela de Substituições ──────────────────────────────────────────
  async function openSub(mealId: string, entry: FoodEntry) {
    setSubTarget({ mealId, entry }); setSubSearch(''); setSubCat(null); setSubLoading(true)
    try {
      const { data } = await api.get('/api/foods/all')
      setAllFoods(data.foods ?? [])
    } catch {} finally { setSubLoading(false) }
  }

  function applySub(sub: TacoResult) {
    if (!subTarget) return
    const { mealId, entry } = subTarget
    const targetKcal = entryMacros(entry)?.kcal ?? 0
    const equivG = targetKcal > 0 && sub.kcal > 0 ? Math.round(targetKcal * 100 / sub.kcal) : entry.quantity
    patchEntry(mealId, entry.id, {
      food_id: sub.id, name: sub.name, quantity: equivG, unit: 'g',
      kcal_per_100g: sub.kcal, protein_per_100g: sub.protein,
      carbs_per_100g: sub.carbs, fat_per_100g: sub.fat,
      fiber_per_100g: sub.fiber, unit_weight_g: sub.unit_weight_g,
    })
    setSubTarget(null); setAllFoods([])
  }

  // Filtro da tabela de trocas
  const filteredSubs = allFoods.filter(f => {
    if (f.id === subTarget?.entry.food_id) return false
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const matchSearch = subSearch.trim().length < 2 || norm(f.name).includes(norm(subSearch))
    const matchCat = !subCat || CATEGORY_GROUPS.find(g => g.id === subCat)?.cats.includes(f.category)
    return matchSearch && matchCat
  })

  // grand total
  const grand = meals.reduce((acc, m) => {
    const t = sumMealMacros(m.items)
    return { kcal: acc.kcal + t.kcal, protein: +(acc.protein + t.protein).toFixed(1), carbs: +(acc.carbs + t.carbs).toFixed(1), fat: +(acc.fat + t.fat).toFixed(1) }
  }, { kcal:0, protein:0, carbs:0, fat:0 })

  if (isLoading) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-brand-400" /></div>

  return (
    <div className="space-y-5">

      {/* Title + save */}
      <div className="flex items-center gap-3">
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="flex-1 text-sm font-semibold bg-transparent focus:outline-none text-t1 placeholder:text-t3"
          placeholder="Título do plano" />
        <button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex-shrink-0">
          <Save className="w-3.5 h-3.5" />{savePlan.isPending ? 'Salvando…' : 'Salvar plano'}
        </button>
      </div>

      {/* Grand total */}
      {grand.kcal > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-xl p-3" style={{ background:'var(--raised)', border:'1px solid var(--border)' }}>
          {([
            { label:'Kcal total', value:grand.kcal,         color:'text-amber-500' },
            { label:'Proteína',   value:`${grand.protein}g`, color:'text-blue-500' },
            { label:'Carboidrato',value:`${grand.carbs}g`,   color:'text-emerald-500' },
            { label:'Gordura',    value:`${grand.fat}g`,     color:'text-orange-500' },
          ] as const).map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-[10px] text-t3 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Meals */}
      {meals.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ border:'1px dashed var(--border)' }}>
          <UtensilsCrossed className="w-8 h-8 text-t3 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-t3">Nenhuma refeição ainda</p>
          <button onClick={addMeal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-400 transition-colors">
            <Plus className="w-3.5 h-3.5" />Adicionar refeição
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map(meal => {
            const mTotal = sumMealMacros(meal.items)
            return (
              <div key={meal.id} className="rounded-2xl overflow-visible" style={{ border:'1px solid var(--border)', background:'var(--surface)' }}>

                {/* Meal header */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
                  <UtensilsCrossed className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <input value={meal.name} onChange={e => patchMeal(meal.id,'name',e.target.value)}
                    className="flex-1 text-sm font-semibold bg-transparent focus:outline-none text-t1 placeholder:text-t3"
                    placeholder="Nome da refeição (ex: Café da manhã)" />
                  <input value={meal.time} onChange={e => patchMeal(meal.id,'time',e.target.value)}
                    type="text" placeholder="07:00"
                    className="w-14 text-xs text-t3 bg-transparent focus:outline-none text-right placeholder:text-t3"
                    maxLength={5} />
                  <button onClick={() => removeMeal(meal.id)}
                    className="text-t3 hover:text-red-500 transition-colors ml-1 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Food items */}
                {meal.items.length > 0 && (
                  <ul>
                    {meal.items.map((entry, idx) => {
                      const m = entryMacros(entry)
                      return (
                        <li key={entry.id} className={`flex items-center gap-2 px-4 py-2.5 ${idx > 0 ? 'border-t' : ''}`} style={{ borderColor:'var(--border)' }}>
                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-t1 truncate">{entry.name}</p>
                            {m && (
                              <p className="text-[10px] text-t3 mt-0.5 flex flex-wrap gap-x-2">
                                <span className="text-amber-500 font-medium">{m.kcal} kcal</span>
                                <span>P: {m.protein}g</span>
                                <span>C: {m.carbs}g</span>
                                <span>G: {m.fat}g</span>
                              </p>
                            )}
                          </div>
                          {/* Qty */}
                          <input type="number" min="0" step="any"
                            value={entry.quantity}
                            onChange={e => patchEntry(meal.id, entry.id, { quantity: parseFloat(e.target.value)||0 })}
                            className="w-14 text-right text-xs text-t2 focus:outline-none rounded-md"
                            style={{ border:'1px solid var(--border)', padding:'3px 6px', background:'var(--raised)', color:'var(--t1)' }}
                          />
                          {/* Unit */}
                          <select value={entry.unit}
                            onChange={e => patchEntry(meal.id, entry.id, { unit: e.target.value })}
                            className="text-[11px] focus:outline-none rounded-md cursor-pointer"
                            style={{ border:'1px solid var(--border)', padding:'3px 5px', background:'var(--raised)', color:'var(--t2)', maxWidth:90 }}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          {/* Trocar */}
                          {entry.food_id && (
                            <button onClick={() => openSub(meal.id, entry)} title="Tabela de trocas"
                              className="flex-shrink-0 text-t3 hover:text-brand-500 transition-colors" >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Remove */}
                          <button onClick={() => removeEntry(meal.id, entry.id)}
                            className="flex-shrink-0 text-t3 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Meal total bar */}
                {mTotal.kcal > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 text-[11px]" style={{ borderTop:'1px solid var(--border)', background:'var(--raised)' }}>
                    <Flame className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="font-semibold text-amber-500">{mTotal.kcal} kcal</span>
                    <span className="text-t3">·</span>
                    <span className="text-t3">P: {mTotal.protein}g</span>
                    <span className="text-t3">C: {mTotal.carbs}g</span>
                    <span className="text-t3">G: {mTotal.fat}g</span>
                  </div>
                )}

                {/* Food search */}
                <div className="px-4 py-3 relative" style={{ borderTop:'1px solid var(--border)' }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-t3 pointer-events-none" />
                    <input
                      value={searchQ[meal.id] ?? ''}
                      onChange={e => handleSearch(meal.id, e.target.value)}
                      placeholder="Buscar alimento na tabela TACO (ex: frango, aveia, banana…)"
                      className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none rounded-lg transition-colors text-t1 placeholder:text-t3"
                      style={{ background:'var(--raised)', border:'1px solid var(--border)' }}
                    />
                    {/* Dropdown */}
                    {(results[meal.id]?.length ?? 0) > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-40 rounded-xl overflow-hidden shadow-xl"
                        style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                        {results[meal.id].map(food => (
                          <button key={food.id} onClick={() => addFoodFromTaco(meal.id, food)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-raised text-left transition-colors">
                            <div>
                              <span className="text-sm text-t1">{food.name}</span>
                              <span className="ml-2 text-[10px] text-t3">{food.category}</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <span className="text-[11px] font-semibold text-amber-500">{food.kcal} kcal</span>
                              <span className="text-[10px] text-t3 ml-1">/ 100g</span>
                            </div>
                          </button>
                        ))}
                        {searchQ[meal.id]?.trim() && (
                          <button
                            onClick={() => addFoodCustom(meal.id, searchQ[meal.id])}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-t3 hover:text-t1 text-xs border-t transition-colors"
                            style={{ borderColor:'var(--border)' }}>
                            <Plus className="w-3.5 h-3.5" />Adicionar &ldquo;{searchQ[meal.id]}&rdquo; manualmente (sem macros)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Meal note */}
                <div className="px-4 pb-3">
                  <input value={meal.notes ?? ''} onChange={e => patchMeal(meal.id,'notes',e.target.value)}
                    placeholder="Observação (opcional)"
                    className="w-full text-xs text-t3 placeholder:text-t3 bg-transparent focus:outline-none focus:text-t2 transition-colors" />
                </div>
              </div>
            )
          })}

          <button onClick={addMeal}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm text-t3 hover:text-t2 transition-colors"
            style={{ border:'1px dashed var(--border)' }}>
            <Plus className="w-4 h-4" />Nova refeição
          </button>
        </div>
      )}

      {/* General notes */}
      <div>
        <p className="text-[10px] font-semibold text-t3 uppercase tracking-wider mb-2">Observações gerais</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder="Ex: Beber 2L de água por dia, evitar processados..."
          className="w-full rounded-xl px-3 py-2.5 text-sm text-t1 placeholder:text-t3 focus:outline-none resize-none transition-colors"
          style={{ background:'var(--raised)', border:'1px solid var(--border)' }} />
      </div>

      {/* ── Tabela de Trocas modal ── */}
      {subTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => { setSubTarget(null); setAllFoods([]) }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ background:'var(--surface)', border:'1px solid var(--border)', maxHeight:'90vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-1">Tabela de trocas</p>
                  <p className="text-lg font-bold text-t1 leading-tight">{subTarget.entry.name}</p>
                  {(() => {
                    const m = entryMacros(subTarget.entry)
                    const g = entryGrams(subTarget.entry)
                    if (!m) return null
                    return (
                      <p className="text-xs text-t3 mt-1 flex flex-wrap gap-x-2">
                        <span>{subTarget.entry.quantity}{subTarget.entry.unit !== 'g' ? ` ${subTarget.entry.unit}` : 'g'}{subTarget.entry.unit !== 'g' && subTarget.entry.unit !== 'ml' && ` (≈${g}g)`}</span>
                        <span>·</span>
                        <span className="text-amber-500 font-semibold">{m.kcal} kcal</span>
                        <span>P:{m.protein}g</span>
                        <span>C:{m.carbs}g</span>
                        <span>G:{m.fat}g</span>
                      </p>
                    )
                  })()}
                </div>
                <button onClick={() => { setSubTarget(null); setAllFoods([]) }}
                  className="text-t3 hover:text-t1 transition-colors flex-shrink-0 mt-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t3 pointer-events-none" />
                <input value={subSearch} onChange={e => setSubSearch(e.target.value)}
                  placeholder="O que você quer trocar? (arroz, banana, frango…)"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm text-t1 placeholder:text-t3 focus:outline-none rounded-xl"
                  style={{ background:'var(--raised)', border:'1px solid var(--border)' }} />
              </div>

              {/* Category pills */}
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setSubCat(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${!subCat ? 'bg-brand-500 text-white' : 'text-t2 hover:bg-raised'}`}
                  style={!subCat ? {} : { border:'1px solid var(--border)' }}>
                  Todos
                </button>
                {CATEGORY_GROUPS.map(g => (
                  <button key={g.id} onClick={() => setSubCat(subCat === g.id ? null : g.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${subCat === g.id ? 'bg-brand-500 text-white' : 'text-t2 hover:bg-raised'}`}
                    style={subCat === g.id ? {} : { border:'1px solid var(--border)' }}>
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Foods grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {subLoading ? (
                <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-brand-400 animate-spin" /></div>
              ) : filteredSubs.length === 0 ? (
                <p className="text-sm text-t3 text-center py-12">Nenhum alimento encontrado.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredSubs.map(s => {
                    const targetKcal = entryMacros(subTarget.entry)?.kcal ?? 0
                    const equivG = targetKcal > 0 && s.kcal > 0 ? Math.round(targetKcal * 100 / s.kcal) : null
                    const equivKcal = equivG ? Math.round(s.kcal * equivG / 100) : s.kcal
                    const emoji = FOOD_EMOJI[s.id] ?? CAT_EMOJI[s.category] ?? '🍽️'
                    return (
                      <button key={s.id} onClick={() => applySub(s)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center hover:bg-brand-500/8 hover:border-brand-500/30 transition-all active:scale-95 group"
                        style={{ border:'1px solid var(--border)', background:'var(--raised)' }}>
                        <span className="text-3xl leading-none">{emoji}</span>
                        {equivG && (
                          <div>
                            <p className="text-base font-bold text-brand-500 tabular-nums leading-none">{equivG}g</p>
                          </div>
                        )}
                        <p className="text-[11px] font-medium text-t1 leading-tight line-clamp-2 min-h-[2.5em]">{s.name}</p>
                        <p className="text-[10px] text-amber-500 font-semibold">{equivKcal} kcal</p>
                        <p className="text-[9px] text-t3">P:{equivG ? Math.round(s.protein*equivG/100*10)/10 : s.protein}g C:{equivG ? Math.round(s.carbs*equivG/100*10)/10 : s.carbs}g</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 flex items-center gap-2 text-[11px] text-t3 flex-shrink-0"
              style={{ borderTop:'1px solid var(--border)', background:'var(--raised)' }}>
              <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0" />
              Quantidades em gramas calculadas para manter as mesmas calorias do alimento original.
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
