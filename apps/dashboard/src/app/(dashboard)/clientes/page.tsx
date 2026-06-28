'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, Loader2, MoreHorizontal, Plus, Search, Star, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Avatar, Badge, Btn } from '@/components/ui/finance-primitives'

// ── Modal Novo Paciente ───────────────────────────────────────────────────────

function NovoPacienteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', phone: '', email: '', goal: '', notes: '' })
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const create = useMutation({
    mutationFn: () => api.post('/api/clients', form),
    onSuccess: () => {
      toast.success('Paciente cadastrado!')
      qc.invalidateQueries({ queryKey: ['clients'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Erro ao cadastrar'),
  })

  const inputCls = "w-full h-9 px-3 rounded-lg text-[13px] outline-none focus:ring-2 transition"
  const inputStyle = { background: 'var(--bg-elevated)', color: 'var(--text-1)', border: '1px solid var(--line-1)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--bg-base)', border: '1px solid var(--line-1)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-1">Novo paciente</h2>
          <button onClick={onClose} className="grid size-7 place-items-center rounded-md text-3 hover:text-1 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11.5px] font-medium text-3 mb-1 block">Telefone (WhatsApp) *</label>
            <input className={inputCls} style={inputStyle} placeholder="+55 11 99999-0000" value={form.phone} onChange={f('phone')} />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-3 mb-1 block">Nome</label>
            <input className={inputCls} style={inputStyle} placeholder="Nome completo" value={form.name} onChange={f('name')} />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-3 mb-1 block">E-mail</label>
            <input className={inputCls} style={inputStyle} type="email" placeholder="email@exemplo.com" value={form.email} onChange={f('email')} />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-3 mb-1 block">Objetivo</label>
            <input className={inputCls} style={inputStyle} placeholder="Ex: Emagrecimento, ganho de massa…" value={form.goal} onChange={f('goal')} />
          </div>
          <div>
            <label className="text-[11.5px] font-medium text-3 mb-1 block">Observações</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none focus:ring-2 transition resize-none"
              style={inputStyle}
              rows={2}
              placeholder="Informações adicionais…"
              value={form.notes}
              onChange={f('notes')}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="primary"
            size="sm"
            disabled={!form.phone.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="size-3 animate-spin" /> : null}
            Cadastrar
          </Btn>
        </div>
      </div>
    </div>
  )
}

interface Client {
  id: string
  name: string | null
  phone: string
  goal: string | null
  created_at: string
  last_contact: string | null
  appointment_count?: number
}

const COLORS = ['blue', 'green', 'purple', 'orange', 'pink'] as const

function dateLabel(d?: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(d))
}

export default function ClientesPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => { const { data } = await api.get('/api/clients'); return data.clients as Client[] },
    staleTime: 30_000,
  })

  const clients = (data ?? []).filter(c => {
    const text = `${c.name ?? ''} ${c.phone} ${c.goal ?? ''}`.toLowerCase()
    if (!text.includes(search.toLowerCase())) return false
    const isActive = (c.appointment_count ?? 0) > 0
    if (statusFilter === 'ativos') return isActive
    if (statusFilter === 'leads') return !isActive
    return true
  })

  async function importFile(file?: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/clients/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`${data.imported ?? 0} pacientes importados`)
      qc.invalidateQueries({ queryKey: ['clients'] })
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erro ao importar')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-1">Pacientes</h1>
          <p className="mt-1 text-[13px] text-3">
            {data ? `${data.length} pacientes · ${data.filter(c => (c.appointment_count ?? 0) > 0).length} ativos` : 'Carregando…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => importFile(e.target.files?.[0])} />
          <Btn variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Importar
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo paciente
          </Btn>
          {showModal && <NovoPacienteModal onClose={() => setShowModal(false)} />}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div
          className="flex h-9 flex-1 items-center gap-2 rounded-lg px-3"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)', maxWidth: '400px' }}
        >
          <Search className="h-3.5 w-3.5 text-3" />
          <input
            className="flex-1 bg-transparent text-[13px] text-1 outline-none placeholder:text-3"
            placeholder="Filtrar por nome, telefone, objetivo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Btn variant="outline" size="sm">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </Btn>
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'ativos', label: 'Ativos' },
          { key: 'leads', label: 'Leads' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors"
            style={{
              background: statusFilter === s.key ? 'var(--bg-elevated)' : 'transparent',
              border: statusFilter === s.key ? '1px solid var(--line-2)' : '1px solid transparent',
              color: statusFilter === s.key ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)' }}
      >
        <div
          className="grid items-center gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-3"
          style={{
            gridTemplateColumns: '24px minmax(0,2fr) 110px 140px minmax(0,1.3fr) 110px 40px',
            borderBottom: '1px solid var(--line-1)',
          }}
        >
          <div />
          <div>Paciente</div>
          <div>Estágio</div>
          <div>Objetivo</div>
          <div>Último contato</div>
          <div className="text-right">Consultas</div>
          <div />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-3">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!isLoading && clients.length === 0 && (
          <div className="py-12 text-center text-[13px] text-3">
            {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
          </div>
        )}

        {clients.map((c, i) => {
          const isActive = (c.appointment_count ?? 0) > 0
          return (
            <div
              key={c.id}
              className="group grid cursor-pointer items-center gap-4 px-5 py-3 text-[13px] transition-colors"
              style={{
                gridTemplateColumns: '24px minmax(0,2fr) 110px 140px minmax(0,1.3fr) 110px 40px',
                borderBottom: i < clients.length - 1 ? '1px solid var(--line-1)' : 'none',
              }}
              onClick={() => router.push(`/clientes/${c.id}`)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, white 2.5%, transparent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Star className="h-3.5 w-3.5 text-3 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={c.name || c.phone} color={COLORS[i % COLORS.length]} size={28} />
                <div className="min-w-0">
                  <div className="truncate font-medium text-1">{c.name || c.phone}</div>
                  <div className="truncate text-[11.5px] text-3">{c.phone}</div>
                </div>
              </div>
              <Badge variant={isActive ? 'success' : 'info'}>{isActive ? 'Ativo' : 'Lead'}</Badge>
              <div className="text-2">{c.goal || '—'}</div>
              <div className="font-mono text-[12px] tabular-nums text-2">{dateLabel(c.last_contact ?? c.created_at)}</div>
              <div className="text-right font-medium tabular-nums text-1">{c.appointment_count ?? 0}</div>
              <button
                className="grid h-7 w-7 place-items-center rounded-md text-3 opacity-0 transition group-hover:opacity-100 hover:bg-white/[0.06] hover:text-1"
                onClick={e => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
