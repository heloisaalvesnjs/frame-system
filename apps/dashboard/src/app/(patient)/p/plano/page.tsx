'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { UtensilsCrossed, Clock, ShoppingCart, CheckSquare, Square, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Meal {
  id: string
  name: string
  time: string
  items: string[]
  notes?: string
}
interface MealPlan {
  id: string
  title: string
  meals: Meal[]
  notes: string | null
  updated_at: string
}

export default function PatientPlanPage() {
  const { client } = usePatient()
  const [activeTab, setActiveTab] = useState<'plano' | 'compras'>('plano')
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const { data: plan, isLoading } = useQuery<MealPlan | null>({
    queryKey: ['patient-meal-plan'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/meal-plan')
      return data.plan
    },
    enabled: !!client,
    staleTime: 60_000,
  })

  // Extrair todos os itens únicos para a lista de compras
  const allItems: string[] = []
  if (plan?.meals) {
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        const clean = item.trim()
        if (clean && !allItems.includes(clean)) allItems.push(clean)
      }
    }
  }

  function toggleCheck(item: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      <h1 className="text-[22px] font-bold text-white mb-1 tracking-tight">Plano alimentar</h1>
      <p className="text-sm text-white/35 mb-5">Seu plano personalizado</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-ui-card border border-white/[0.06] rounded-xl">
        {([
          { key: 'plano', label: 'Refeições', icon: UtensilsCrossed },
          { key: 'compras', label: 'Lista de compras', icon: ShoppingCart },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-brand-500/10 text-brand-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : !plan ? (
        <div className="text-center py-16">
          <UtensilsCrossed className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhum plano alimentar disponível ainda</p>
          <p className="text-xs text-white/20 mt-1">Sua nutricionista enviará seu plano em breve</p>
        </div>
      ) : activeTab === 'plano' ? (
        <>
          <p className="text-xs text-white/25 mb-4 text-right">
            Atualizado em {new Date(plan.updated_at).toLocaleDateString('pt-BR')}
          </p>

          <div className="space-y-3">
            {plan.meals.map(meal => (
              <div key={meal.id} className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                >
                  <div className="flex-1 flex items-center gap-3 text-left">
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4 text-brand-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90">{meal.name}</p>
                      {meal.time && (
                        <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {meal.time}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-white/25">{meal.items.length} itens</span>
                    {expandedMeal === meal.id
                      ? <ChevronUp className="w-4 h-4 text-white/30" />
                      : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </div>
                </button>

                {expandedMeal === meal.id && (
                  <div className="border-t border-white/[0.04] px-4 py-3 space-y-1.5">
                    {meal.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-brand-400 mt-0.5 flex-shrink-0">•</span>
                        <span className="text-sm text-white/70">{item}</span>
                      </div>
                    ))}
                    {meal.notes && (
                      <p className="text-xs text-white/30 italic mt-2 pt-2 border-t border-white/[0.04]">
                        💡 {meal.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
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
            <p className="text-xs text-white/35">{allItems.length} ingredientes · {checked.size} marcados</p>
            {checked.size > 0 && (
              <button onClick={() => setChecked(new Set())} className="text-xs text-white/25 hover:text-white/50 transition-colors">
                Limpar
              </button>
            )}
          </div>

          {allItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/25">
              Nenhum ingrediente no plano ainda
            </div>
          ) : (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
              <ul className="divide-y divide-white/[0.04]">
                {allItems.map(item => (
                  <li key={item}>
                    <button
                      onClick={() => toggleCheck(item)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      {checked.has(item)
                        ? <CheckSquare className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        : <Square className="w-4 h-4 text-white/20 flex-shrink-0" />}
                      <span className={`text-sm transition-colors ${checked.has(item) ? 'line-through text-white/25' : 'text-white/75'}`}>
                        {item}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <PatientNav />
    </div>
  )
}
