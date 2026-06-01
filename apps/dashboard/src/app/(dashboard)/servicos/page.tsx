'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ShoppingBag, Sparkles } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Consulta', 'Pacote', 'Retorno', 'Avaliação', 'Outro']

interface Service { id: string; name: string; category: string; price: string; description: string }

// ── Templates pré-definidos ───────────────────────────────────────
const TEMPLATES: Omit<Service, 'id'>[] = [
  // Consultoria Online
  {
    name: 'Consultoria Online – Trimestral',
    category: 'Pacote',
    price: '3x de R$248,84',
    description: '90 dias · plataforma completa + suporte · check-in quinzenal com ajustes reais · suporte ativo no WhatsApp · grupo individualizado direto com o David e equipe'
  },
  {
    name: 'Consultoria Online – Semestral',
    category: 'Pacote',
    price: '6x de R$206,79',
    description: 'Melhor custo-benefício · grupo com David e equipe · área fitness inclusa · acompanhamento quinzenal · plano alimentar personalizado · menos de R$7/dia'
  },
  {
    name: 'Consultoria Online – Anual',
    category: 'Pacote',
    price: '12x de R$156,27',
    description: 'Maior transformação · tudo incluso · plataforma completa + suporte · plano alimentar para sua realidade · acompanhamento de verdade, não genérico'
  },
  // Consultoria Premium Presencial
  {
    name: 'Consultoria Premium – Mensal',
    category: 'Consulta',
    price: 'R$600 à vista',
    description: '1 consulta presencial · avaliação física · plano personalizado · suporte WhatsApp · Dossiê Evolutivo'
  },
  {
    name: 'Consultoria Premium – Trimestral',
    category: 'Pacote',
    price: '3x de R$414,63',
    description: 'Mais popular · 3 consultas presenciais · 3 avaliações físicas · treino individual elaborado · check-in quinzenal · Dossiê Evolutivo completo'
  },
  {
    name: 'Consultoria Premium – Semestral',
    category: 'Pacote',
    price: '6x de R$362,73',
    description: 'Máxima transformação · 6 consultas · 6 monitoramentos · treino individual · ficha de treino · Dossiê Evolutivo semestral · planejamento dos próximos passos'
  },
]

function ServiceForm({ initial, onSave, onCancel }: {
  initial?: Partial<Service>
  onSave: (data: Omit<Service, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category || 'Consulta',
    price: initial?.price || '',
    description: initial?.description || '',
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
      <p className="font-mono text-[11px] text-t2 tracking-wider">{initial?.id ? 'EDITAR SERVIÇO' : 'NOVO SERVIÇO'}</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome do serviço" placeholder="Ex: Consulta inicial" value={form.name}
          onChange={e => setForm(v => ({ ...v, name: e.target.value }))} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-t2 font-mono tracking-wide">Categoria</label>
          <select value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))}
            className="h-9 w-full rounded-lg px-3 text-sm text-t1 focus:outline-none"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Input label="Valor" placeholder="Ex: R$ 250 ou 3x de R$148" value={form.price}
          onChange={e => setForm(v => ({ ...v, price: e.target.value }))} />
        <Input label="Descrição" placeholder="O que está incluso..." value={form.description}
          onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={submit} loading={saving} disabled={!form.name.trim()}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

export default function ServicosPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Partial<Service> | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [addingTemplates, setAddingTemplates] = useState<Set<number>>(new Set())

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => { const { data } = await api.get('/api/services'); return data.services }
  })

  async function saveService(data: Omit<Service, 'id'>) {
    if ((editing as Service)?.id) {
      await api.put(`/api/services/${(editing as Service).id}`, data)
      toast.success('Serviço atualizado!')
    } else {
      await api.post('/api/services', data)
      toast.success('Serviço adicionado!')
    }
    qc.invalidateQueries({ queryKey: ['services'] })
    setEditing(null)
  }

  async function remove(id: string) {
    await api.delete(`/api/services/${id}`)
    toast.success('Serviço removido.')
    qc.invalidateQueries({ queryKey: ['services'] })
  }

  async function addTemplate(t: Omit<Service, 'id'>, idx: number) {
    setAddingTemplates(s => new Set(s).add(idx))
    try {
      await api.post('/api/services', t)
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success(`"${t.name}" adicionado!`)
    } catch { toast.error('Erro ao adicionar.') }
    finally { setAddingTemplates(s => { const n = new Set(s); n.delete(idx); return n }) }
  }

  if (isLoading) return <div className="p-6 text-t2 text-sm">Carregando...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Serviços</h1>
          <p className="text-sm text-t2 mt-0.5">A assistente usa esses valores para responder sobre preços e planos</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowTemplates(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border',
              showTemplates ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'border-theme text-t2 hover:text-t1'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Templates
          </button>
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="w-3.5 h-3.5" /> Novo serviço
          </Button>
        </div>
      </div>

      {/* Templates */}
      {showTemplates && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <p className="text-sm font-semibold text-t1">Templates — Consultoria David Effgen</p>
              <span className="font-mono text-[10px] text-t3 ml-auto">Clique para adicionar</span>
            </div>

            {/* Online */}
            <p className="font-mono text-[10px] text-t3 tracking-wider mb-2">ONLINE — PERFORMANCE REAL</p>
            <div className="space-y-2 mb-5">
              {TEMPLATES.slice(0, 3).map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--raised)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-t1">{t.name}</p>
                    <p className="text-xs text-t2">{t.price}</p>
                  </div>
                  <Button size="sm" variant="secondary" loading={addingTemplates.has(i)}
                    onClick={() => addTemplate(t, i)}>
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>

            {/* Presencial */}
            <p className="font-mono text-[10px] text-t3 tracking-wider mb-2">PRESENCIAL — PREMIUM</p>
            <div className="space-y-2">
              {TEMPLATES.slice(3).map((t, i) => (
                <div key={i+3} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--raised)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-t1">{t.name}</p>
                    <p className="text-xs text-t2">{t.price}</p>
                  </div>
                  <Button size="sm" variant="secondary" loading={addingTemplates.has(i+3)}
                    onClick={() => addTemplate(t, i+3)}>
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário inline */}
      {editing && (
        <ServiceForm initial={editing} onSave={saveService} onCancel={() => setEditing(null)} />
      )}

      {/* Lista */}
      {services.length === 0 && !editing ? (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-brand-500" />
          </div>
          <p className="text-sm text-t2">Nenhum serviço ainda.</p>
          <p className="text-xs text-t3">Use o botão "Templates" para adicionar os planos do David rapidamente.</p>
          <button onClick={() => setShowTemplates(true)}
            className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-medium hover:bg-brand-500/15 transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> Carregar templates
          </button>
        </div>
      ) : services.length > 0 ? (
        <Card>
          <div className="rounded-t-2xl overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--raised)' }}>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-t3 tracking-wider">NOME</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-t3 tracking-wider">CATEGORIA</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-t3 tracking-wider">VALOR</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-t3 tracking-wider">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={s.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-t1">{s.name}</p>
                      {s.description && <p className="text-xs text-t3 mt-0.5 line-clamp-1">{s.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-brand-500 px-2 py-0.5 rounded-full bg-brand-500/10">{s.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-t1">{s.price || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg text-t3 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
