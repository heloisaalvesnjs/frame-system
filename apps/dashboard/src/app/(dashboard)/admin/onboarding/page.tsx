'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Clock, User } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge, Btn, Card, SectionTitle } from '@/components/ui/finance-primitives'

interface OForm {
  id: string
  slug: string
  data: Record<string, any>
  processed: boolean
  submitted_at: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>{title}</h4>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-[13px]">
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span style={{ color: 'var(--text-1)' }}>{Array.isArray(value) ? value.join(', ') : value}</span>
    </div>
  )
}

function FormDetail({ form }: { form: OForm }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const d = form.data

  const markDone = useMutation({
    mutationFn: () => api.patch(`/api/onboarding-form/${form.id}/processed`),
    onSuccess: () => { toast.success('Marcado como processado'); qc.invalidateQueries({ queryKey: ['onboarding-forms'] }) },
  })

  const date = new Date(form.submitted_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--line-1)', background: 'var(--bg-elevated)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0"
          style={{ background: form.processed ? 'var(--bg-surface)' : 'var(--brand-soft)', color: form.processed ? 'var(--text-3)' : 'var(--brand)' }}>
          {(d.name || form.slug || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-1 truncate">{d.name || form.slug}</span>
            {form.processed
              ? <Badge variant="success">Processado</Badge>
              : <Badge variant="warning">Novo</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{date}</span>
            {d.whatsapp && <span className="flex items-center gap-1"><User className="w-3 h-3" />{d.whatsapp}</span>}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-3" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-3" />}
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-5" style={{ borderTop: '1px solid var(--line-1)' }}>
          <div className="pt-4 space-y-5">

            <Section title="Identificação">
              <Row label="Nome" value={d.name} />
              <Row label="CRN" value={d.crn} />
              <Row label="E-mail" value={d.email} />
              <Row label="WhatsApp" value={d.whatsapp} />
              <Row label="Consultório" value={d.clinic_name} />
              <Row label="Instagram" value={d.instagram} />
              <Row label="Site" value={d.site} />
            </Section>

            <Section title="Assistente">
              <Row label="Nome da IA" value={d.assistant_name} />
              <Row label="Tom de voz" value={d.tone} />
              <Row label="Boas-vindas" value={d.greeting_message} />
              <Row label="Despedida" value={d.farewell_message} />
              <Row label="Frases preferidas" value={d.frases_preferidas} />
              <Row label="Frases proibidas" value={d.frases_proibidas} />
            </Section>

            {d.services?.filter((s: any) => s.name).length > 0 && (
              <Section title="Serviços">
                {d.services.filter((s: any) => s.name).map((s: any, i: number) => (
                  <div key={i} className="text-[13px] pl-2" style={{ color: 'var(--text-1)' }}>
                    <strong>{s.name}</strong> · {s.modality} · {s.price ? `R$ ${s.price}` : 'sem valor'} · {s.duration} min
                  </div>
                ))}
                <Row label="Pagamentos" value={d.payment_methods} />
              </Section>
            )}

            <Section title="Agenda">
              {d.schedule?.filter((s: any) => s.active).map((s: any) => (
                <div key={s.day} className="text-[13px]" style={{ color: 'var(--text-1)' }}>
                  {s.day}: {s.start} – {s.end}
                </div>
              ))}
              <Row label="Duração slot" value={d.slot_duration ? `${d.slot_duration} min` : undefined} />
              <Row label="Intervalo" value={d.buffer_minutes ? `${d.buffer_minutes} min` : undefined} />
              <Row label="Antecedência mín." value={d.min_advance ? `${d.min_advance}h` : undefined} />
              <Row label="Máx. por dia" value={d.max_per_day} />
            </Section>

            {d.locations?.filter((l: any) => l.name).length > 0 && (
              <Section title="Locais">
                {d.locations.filter((l: any) => l.name).map((l: any, i: number) => (
                  <div key={i} className="text-[13px]" style={{ color: 'var(--text-1)' }}>
                    <strong>{l.name}</strong> · {l.modality}{l.address ? ` · ${l.address}` : ''}
                  </div>
                ))}
                <Row label="Link online" value={d.online_link} />
              </Section>
            )}

            <Section title="Base de conhecimento da IA">
              <Row label="Abordagem" value={d.approach} />
              <Row label="Público-alvo" value={d.target_audience} />
              <Row label="Objetivos" value={d.patient_goals} />
              <Row label="Diferenciais" value={d.differentials} />
              <Row label="Pode compartilhar" value={d.can_share} />
              <Row label="Nunca mencionar" value={d.cannot_share} />
            </Section>

            <Section title="Integrações">
              <Row label="WhatsApp Business" value={d.has_whatsapp_business} />
              <Row label="Google Calendar" value={d.google_calendar_email} />
              <Row label="Horário humano" value={d.human_hours} />
              <Row label="Sempre transferir" value={d.always_transfer} />
              <Row label="Observações" value={d.extra_notes} />
            </Section>
          </div>

          {!form.processed && (
            <div className="pt-2">
              <Btn variant="primary" size="sm" onClick={() => markDone.mutate()} disabled={markDone.isPending}>
                {markDone.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Marcar como configurado
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function OnboardingAdminPage() {
  const [filter, setFilter] = useState<'todos' | 'novos' | 'processados'>('todos')

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-forms'],
    queryFn: () => api.get('/api/onboarding-form').then(r => r.data.forms as OForm[]),
    staleTime: 30_000,
  })

  const forms = (data ?? []).filter(f => {
    if (filter === 'novos') return !f.processed
    if (filter === 'processados') return f.processed
    return true
  })

  const novos = (data ?? []).filter(f => !f.processed).length

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-1">Formulários de onboarding</h1>
          <p className="mt-1 text-[13px] text-3">
            Respostas recebidas de novas nutricionistas
            {novos > 0 && <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{novos} novo{novos !== 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'todos', label: 'Todos' },
          { key: 'novos', label: 'Novos' },
          { key: 'processados', label: 'Processados' },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors"
            style={{
              background: filter === f.key ? 'var(--bg-elevated)' : 'transparent',
              border: filter === f.key ? '1px solid var(--line-2)' : '1px solid transparent',
              color: filter === f.key ? 'var(--text-1)' : 'var(--text-3)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      )}

      {!isLoading && forms.length === 0 && (
        <div className="py-12 text-center text-[13px] text-3">
          {filter === 'novos' ? 'Nenhum formulário pendente.' : 'Nenhum formulário recebido ainda.'}
        </div>
      )}

      <div className="space-y-3">
        {forms.map(f => <FormDetail key={f.id} form={f} />)}
      </div>
    </div>
  )
}
