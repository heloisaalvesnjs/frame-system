'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, CheckCheck, Video, MapPin,
  X, ExternalLink, Unlink, Plus, Trash2, Ban,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isToday, parseISO, startOfWeek,
  addDays, addWeeks, subWeeks, setHours, setMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Avatar, Badge, Btn, Card, KPI, SectionTitle } from '@/components/ui/finance-primitives'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Appointment {
  id: string; client_name: string; client_phone: string
  scheduled_at: string; duration_minutes: number; duration?: number
  status: 'scheduled'|'confirmed'|'cancelled'|'completed'
  modality?: 'online'|'presencial'; notes?: string
  location_name?: string
}
interface Location { id: string; name: string; city?: string; address?: string; color: string }
interface CalendarBlock { id: string; starts_at: string; ends_at: string; reason?: string }
interface Client { id: string; name: string; phone: string }

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label:string; dot:string; tag:'default'|'green'|'blue'|'red'|'amber'; bg:string; border:string; text:string; textSub:string }> = {
  scheduled: { label:'Agendado',   dot:'bg-blue-500',     tag:'blue',    bg:'bg-blue-500/[0.12]',   border:'border-blue-500',  text:'text-blue-700',    textSub:'text-blue-500/80'  },
  confirmed: { label:'Confirmado', dot:'bg-emerald-500',  tag:'green',   bg:'bg-emerald-500/[0.12]', border:'border-emerald-500', text:'text-emerald-700', textSub:'text-emerald-500/80' },
  cancelled: { label:'Cancelado',  dot:'bg-red-400',      tag:'red',     bg:'bg-red-500/[0.08]',    border:'border-red-400',   text:'text-red-600',     textSub:'text-red-400/70'   },
  completed: { label:'Realizado',  dot:'bg-zinc-400',     tag:'default', bg:'bg-zinc-100',          border:'border-zinc-300',  text:'text-zinc-600',    textSub:'text-zinc-400'     },
}

const EVT_COLORS = ['blue', 'purple', 'orange', 'pink', 'green'] as const
type EvtColor = typeof EVT_COLORS[number]
const evtMap: Record<EvtColor, { bg: string; border: string; text: string; sub: string }> = {
  blue:   { bg:'rgba(106,169,255,0.13)', border:'rgba(106,169,255,0.4)', text:'#4B88E8', sub:'#6AA9FF' },
  purple: { bg:'rgba(182,156,255,0.13)', border:'rgba(182,156,255,0.4)', text:'#7C5CFF', sub:'#B69CFF' },
  orange: { bg:'rgba(255,180,84,0.13)',  border:'rgba(255,180,84,0.4)',  text:'#C47A20', sub:'#FFB454' },
  pink:   { bg:'rgba(255,143,179,0.13)', border:'rgba(255,143,179,0.4)', text:'#C0446E', sub:'#FF8FB3' },
  green:  { bg:'rgba(0,194,124,0.13)',   border:'rgba(0,194,124,0.4)',   text:'var(--brand)', sub:'rgba(0,194,124,0.8)' },
}
function evtColor(name: string): EvtColor {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return EVT_COLORS[h % EVT_COLORS.length]
}
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 07–20
const HOUR_H = 64
const MIN_H  = HOUR_H / 60
const DAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const DURATIONS = [30, 45, 60, 90, 120]

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ currentMonth, selectedDate, appointments, onSelectDate, onPrevMonth, onNextMonth }: {
  currentMonth: Date; selectedDate: Date; appointments: Appointment[]
  onSelectDate: (d: Date) => void; onPrevMonth: () => void; onNextMonth: () => void
}) {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const leading = Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 })
  const apptDates = new Set(appointments.map(a => format(parseISO(a.scheduled_at), 'yyyy-MM-dd')))
  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="font-mono text-[11px] tracking-wider text-t2 font-semibold uppercase">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </p>
        <div className="flex gap-0.5">
          <button onClick={onPrevMonth} className="w-6 h-6 rounded flex items-center justify-center text-t3 hover:text-t1 transition-colors hover:bg-[var(--raised)]"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button onClick={onNextMonth} className="w-6 h-6 rounded flex items-center justify-center text-t3 hover:text-t1 transition-colors hover:bg-[var(--raised)]"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S','T','Q','Q','S','S','D'].map((d, i) => <div key={i} className="text-center"><span className="font-mono text-[9px] text-t3">{d}</span></div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {leading.map((_, i) => <div key={`l-${i}`} />)}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const isSelected = isSameDay(day, selectedDate)
          const isTodayDay = isToday(day)
          const hasAppt = apptDates.has(key)
          return (
            <button key={key} onClick={() => onSelectDate(day)}
              className={cn('relative flex flex-col items-center py-0.5 rounded-lg transition-all hover:bg-[var(--raised)]',
                isSelected ? 'bg-[var(--brand)]' : isTodayDay ? 'bg-[var(--brand-s)]' : '')}>
              <span className={cn('font-mono text-[11px] leading-5',
                isSelected ? 'font-bold' : isTodayDay ? 'text-[var(--brand)] font-semibold' : 'text-t2')}
                style={{ color: isSelected ? '#fff' : undefined }}>
                {format(day, 'd')}
              </span>
              {hasAppt && !isSelected && <span className="w-1 h-1 rounded-full bg-[var(--brand)] mt-0.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Google Calendar Card ───────────────────────────────────────────────────────
function GoogleCalendarCard() {
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const { data: gcalStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['gcal-status'],
    queryFn: async () => { const { data } = await api.get('/api/google-calendar/status'); return data },
    staleTime: 30_000,
  })
  const { data: authUrlData } = useQuery<{ url: string }>({
    queryKey: ['gcal-auth-url'],
    queryFn: async () => { const { data } = await api.get('/api/google-calendar/auth-url'); return data },
    enabled: !gcalStatus?.connected,
  })
  const disconnect = useMutation({
    mutationFn: async () => api.delete('/api/google-calendar/disconnect'),
    onSuccess: () => { toast.success('Google Agenda desconectado.'); qc.invalidateQueries({ queryKey: ['gcal-status'] }) },
  })
  useEffect(() => {
    const c = searchParams.get('google_connected')
    const e = searchParams.get('google_error')
    if (c) { toast.success('Google Agenda conectado!'); qc.invalidateQueries({ queryKey: ['gcal-status'] }) }
    if (e) toast.error('Erro ao conectar Google Agenda.')
  }, [searchParams, qc])
  const isConnected = gcalStatus?.connected
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ border:'1px solid var(--border)', background:'var(--surface)' }}>
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <p className="text-[11px] font-semibold text-t1">Google Agenda</p>
        <div className={cn('ml-auto w-2 h-2 rounded-full', isConnected ? 'bg-emerald-500' : 'bg-t3')} />
      </div>
      {isConnected ? (
        <div className="flex items-center gap-3">
          <button onClick={async () => {
            try {
              const { data } = await api.post('/api/google-calendar/sync')
              if (data.total === 0) toast.success('Nenhuma consulta futura para sincronizar.')
              else if (data.synced === 0) toast.error(`Erro ao sincronizar. ${data.lastError || ''}`)
              else toast.success(`${data.synced}/${data.total} consulta(s) enviada(s) ao Google Agenda!`)
            } catch (e: any) { toast.error(e?.response?.data?.error ?? 'Erro ao sincronizar') }
          }} className="text-[10px] text-[var(--brand)] hover:opacity-80 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Sincronizar
          </button>
          <button onClick={() => disconnect.mutate()} className="text-[10px] text-t3 hover:text-[var(--danger)] flex items-center gap-1"><Unlink className="w-3 h-3" /> Desconectar</button>
        </div>
      ) : (
        <a href={authUrlData?.url || '#'} className="text-[10px] text-[var(--brand)] hover:opacity-80 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Conectar</a>
      )}
    </div>
  )
}

// ── New Appointment Modal ─────────────────────────────────────────────────────
function NewAppointmentModal({ initialDate, onClose, onSaved }: {
  initialDate: Date; onClose: () => void; onSaved: () => void
}) {
  const [dateStr, setDateStr] = useState(format(initialDate, 'yyyy-MM-dd'))
  const [timeStr, setTimeStr] = useState(format(initialDate, 'HH:mm'))
  const [duration, setDuration] = useState(50)
  const [modality, setModality] = useState<'presencial'|'online'>('presencial')
  const [locationId, setLocationId] = useState('')
  const [notes, setNotes] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [showClientSearch, setShowClientSearch] = useState(false)

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => { const { data } = await api.get('/api/locations'); return data.locations },
    staleTime: 60_000,
  })

  const { data: clientResults = [] } = useQuery<Client[]>({
    queryKey: ['clients-search', clientSearch],
    queryFn: async () => {
      if (clientSearch.trim().length < 2) return []
      const { data } = await api.get('/api/clients', { params: { search: clientSearch } })
      return data.clients ?? []
    },
    enabled: clientSearch.trim().length >= 2,
    staleTime: 10_000,
  })

  async function handleSave() {
    if (!selectedClient && (!newClientName.trim() || !newClientPhone.trim())) {
      toast.error('Selecione ou cadastre um cliente'); return
    }
    setSaving(true)
    try {
      await api.post('/api/appointments/manual', {
        client_id:    selectedClient?.id,
        client_name:  selectedClient ? undefined : newClientName.trim(),
        client_phone: selectedClient ? undefined : newClientPhone.trim(),
        scheduled_at: `${dateStr}T${timeStr}:00`,
        duration,
        modality,
        location_id:  locationId || undefined,
        notes:        notes.trim() || undefined,
      })
      toast.success('Consulta agendada!')
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao agendar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p className="font-bold text-t1">Nova consulta</p>
            <p className="text-xs text-t3 mt-0.5">{format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-t3 hover:bg-[var(--raised)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-t3 block mb-1.5">Data</label>
              <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none"
                style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
            </div>
            <div>
              <label className="text-xs text-t3 block mb-1.5">Horário</label>
              <input type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)}
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none"
                style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
            </div>
          </div>

          <div>
            <label className="text-xs text-t3 block mb-1.5">Paciente</label>
            {selectedClient ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border:'1px solid var(--border)', background:'var(--raised)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-t1 truncate">{selectedClient.name}</p>
                  <p className="text-xs text-t3">{selectedClient.phone}</p>
                </div>
                <button onClick={() => { setSelectedClient(null); setClientSearch('') }} className="text-t3 hover:text-[var(--danger)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowClientSearch(true) }}
                    onFocus={() => setShowClientSearch(true)}
                    placeholder="Buscar paciente existente..."
                    className="w-full h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none"
                    style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
                  {showClientSearch && clientResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-xl"
                      style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                      {clientResults.slice(0, 5).map(c => (
                        <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); setShowClientSearch(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--raised)]">
                          <div>
                            <p className="text-sm text-t1">{c.name}</p>
                            <p className="text-xs text-t3">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-t3">Ou cadastre agora:</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newClientName} onChange={e => setNewClientName(e.target.value)}
                    placeholder="Nome" className="h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none"
                    style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
                  <input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)}
                    placeholder="Telefone" className="h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none"
                    style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-t3 block mb-1.5">Duração</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none cursor-pointer"
                style={{ border:'1px solid var(--border)', background:'var(--raised)' }}>
                {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-t3 block mb-1.5">Modalidade</label>
              <select value={modality} onChange={e => setModality(e.target.value as any)}
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none cursor-pointer"
                style={{ border:'1px solid var(--border)', background:'var(--raised)' }}>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          {locations.length > 0 && (
            <div>
              <label className="text-xs text-t3 block mb-1.5">Local de atendimento</label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)}
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none cursor-pointer"
                style={{ border:'1px solid var(--border)', background:'var(--raised)' }}>
                <option value="">Sem local específico</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ''}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-t3 block mb-1.5">Observações (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Alguma observação sobre a consulta..."
              className="w-full rounded-lg px-3 py-2 text-sm text-t1 placeholder:text-t3 resize-none focus:outline-none"
              style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3 flex-shrink-0" style={{ borderTop:'1px solid var(--border)' }}>
          <Btn variant="secondary" onClick={onClose} className="flex-1">Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Salvando…' : 'Agendar consulta'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Appointment Modal ─────────────────────────────────────────────────────────
function AppointmentModal({ appt, onClose, onUpdate }: {
  appt: Appointment; onClose: () => void; onUpdate: (id: string, status: string) => void
}) {
  const dt = parseISO(appt.scheduled_at)
  const dur = appt.duration ?? appt.duration_minutes ?? 50
  const s  = STATUS[appt.status] || STATUS.scheduled
  const endTime = new Date(dt.getTime() + dur * 60000)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden z-10"
        style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
        <div className={cn('px-5 py-4 flex items-start justify-between gap-3', s.bg)}>
          <div>
            <p className="font-display font-bold text-[17px] text-t1 leading-tight">{appt.client_name}</p>
            <p className="text-sm text-t2 mt-0.5">
              {format(dt, "EEEE, d 'de' MMMM", { locale: ptBR })} · {format(dt, 'HH:mm')} – {format(endTime, 'HH:mm')}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-t3 hover:bg-[var(--raised)] flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={s.tag === 'green' ? 'success' : s.tag === 'blue' ? 'info' : s.tag === 'red' ? 'danger' : s.tag === 'amber' ? 'warning' : 'default'} dot>{s.label}</Badge>
            {appt.modality && (
              <Badge variant="default">
                {appt.modality === 'online' ? <><Video className="w-3 h-3" /> Online</> : <><MapPin className="w-3 h-3" /> Presencial</>}
              </Badge>
            )}
            {appt.location_name && (
              <Badge variant="default"><MapPin className="w-3 h-3" /> {appt.location_name}</Badge>
            )}
          </div>
          <div className="text-xs text-t2 space-y-1">
            <p><span className="text-t3">WhatsApp:</span> {appt.client_phone}</p>
            <p><span className="text-t3">Duração:</span> {dur} min</p>
          </div>
          {appt.notes && <p className="text-xs text-t2 rounded-lg px-3 py-2" style={{ background:'var(--raised)', border:'1px solid var(--border)' }}>{appt.notes}</p>}
        </div>
        {appt.status !== 'cancelled' && appt.status !== 'completed' && (
          <div className="px-5 pb-5 flex gap-2">
            {appt.status === 'scheduled' && (
              <Btn variant="secondary" onClick={() => { onUpdate(appt.id, 'confirmed'); onClose() }} className="flex-1">
                <CheckCircle className="w-4 h-4" /> Confirmar
              </Btn>
            )}
            {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
              <Btn variant="primary" onClick={() => { onUpdate(appt.id, 'completed'); onClose() }} className="flex-1">
                <CheckCheck className="w-4 h-4" /> Realizado
              </Btn>
            )}
            <Btn variant="danger" onClick={() => { onUpdate(appt.id, 'cancelled'); onClose() }}>
              <XCircle className="w-4 h-4" /> Cancelar
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Block Time Modal ──────────────────────────────────────────────────────────
function BlockTimeModal({ initialDate, onClose, onSaved }: {
  initialDate: Date; onClose: () => void; onSaved: () => void
}) {
  const [dateStr,  setDateStr]  = useState(format(initialDate, 'yyyy-MM-dd'))
  const [startStr, setStartStr] = useState('08:00')
  const [endStr,   setEndStr]   = useState('18:00')
  const [reason,   setReason]   = useState('')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/api/locations/blocks', {
        starts_at: `${dateStr}T${startStr}:00`,
        ends_at:   `${dateStr}T${endStr}:00`,
        reason: reason.trim() || undefined,
      })
      toast.success('Horário bloqueado!')
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao bloquear')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden z-10"
        style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p className="font-bold text-t1">Bloquear horário</p>
            <p className="text-xs text-t3 mt-0.5">A IA não vai oferecer este período</p>
          </div>
          <button onClick={onClose} className="text-t3 hover:text-t1"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-t3 block mb-1.5">Data</label>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
              className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none"
              style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-t3 block mb-1.5">Das</label>
              <input type="time" value={startStr} onChange={e => setStartStr(e.target.value)}
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none"
                style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
            </div>
            <div>
              <label className="text-xs text-t3 block mb-1.5">Até</label>
              <input type="time" value={endStr} onChange={e => setEndStr(e.target.value)}
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 focus:outline-none"
                style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
            </div>
          </div>
          <div>
            <label className="text-xs text-t3 block mb-1.5">Motivo (opcional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ex: Viagem, reunião, feriado..."
              className="w-full h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none"
              style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <Btn variant="secondary" onClick={onClose} className="flex-1">Cancelar</Btn>
          <Btn variant="danger" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Salvando…' : 'Bloquear'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ weekStart, appointments, blocks, onClickAppt, onClickSlot }: {
  weekStart: Date
  appointments: Appointment[]
  blocks: CalendarBlock[]
  onClickAppt: (a: Appointment) => void
  onClickSlot: (date: Date, hour: number, minute: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const byDay = new Map<string, Appointment[]>()
  weekDays.forEach(d => byDay.set(format(d, 'yyyy-MM-dd'), []))
  appointments.forEach(a => {
    const key = format(parseISO(a.scheduled_at), 'yyyy-MM-dd')
    byDay.get(key)?.push(a)
  })

  const blocksByDay = new Map<string, CalendarBlock[]>()
  weekDays.forEach(d => blocksByDay.set(format(d, 'yyyy-MM-dd'), []))
  blocks.forEach(b => {
    const key = format(parseISO(b.starts_at), 'yyyy-MM-dd')
    blocksByDay.get(key)?.push(b)
  })

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [weekStart])

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if ((e.target as HTMLElement).closest('button[data-appt]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    const y = e.clientY - rect.top + scrollTop
    const minutesFromStart = y / MIN_H
    const rounded = Math.round(minutesFromStart / 30) * 30
    const hour = 7 + Math.floor(rounded / 60)
    const minute = rounded % 60
    if (hour >= 7 && hour < 20) onClickSlot(day, hour, minute)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="w-14 flex-shrink-0" />
        {weekDays.map((day, i) => {
          const isToday2 = isToday(day)
          return (
            <div key={i} className="flex-1 flex flex-col items-center py-2 gap-0.5 min-w-0"
              style={{ borderLeft:'1px solid var(--border)' }}>
              <span className={cn('font-mono text-[10px] tracking-wider', isToday2 ? 'text-[var(--brand)]' : 'text-t3')}>{DAY_LABELS[i]}</span>
              <span className={cn('w-7 h-7 rounded-full flex items-center justify-center font-mono text-[13px] font-bold',
                isToday2 ? 'bg-[var(--brand)]' : '')}
                style={{ color: isToday2 ? '#fff' : 'var(--t1)' }}>{format(day, 'd')}</span>
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${HOURS.length * HOUR_H}px` }}>

          <div className="w-14 flex-shrink-0 relative pointer-events-none">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: i * HOUR_H - 8, height: HOUR_H }}>
                <span className="font-mono text-[10px] text-t3 leading-none mt-1">{String(h).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>

          {weekDays.map((day, di) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayAppts = byDay.get(key) || []
            const dayBlocks = blocksByDay.get(key) || []
            const isToday2 = isToday(day)

            return (
              <div key={key} className="flex-1 relative min-w-0 cursor-pointer"
                style={{ borderLeft:'1px solid var(--border)', height:`${HOURS.length * HOUR_H}px`,
                  background: isToday2 ? 'var(--brand-s)' : undefined }}
                onClick={e => handleColumnClick(e, day)}
              >
                {HOURS.map((_, i) => (
                  <div key={i} className="absolute w-full pointer-events-none"
                    style={{ top: i * HOUR_H, borderTop:'1px dashed var(--border)', opacity: 0.5 }} />
                ))}
                {HOURS.map((_, i) => (
                  <div key={`h-${i}`} className="absolute w-full pointer-events-none"
                    style={{ top: i * HOUR_H + HOUR_H / 2, borderTop:'1px dashed var(--border)', opacity: 0.25 }} />
                ))}

                {dayBlocks.map(b => {
                  const bStart = parseISO(b.starts_at)
                  const bEnd   = parseISO(b.ends_at)
                  const startMin = (bStart.getHours() - 7) * 60 + bStart.getMinutes()
                  const endMin   = (bEnd.getHours()   - 7) * 60 + bEnd.getMinutes()
                  const top    = Math.max(startMin * MIN_H, 0)
                  const height = Math.max((endMin - startMin) * MIN_H, 20)
                  return (
                    <div key={b.id} className="absolute left-0 right-0 pointer-events-none"
                      style={{ top, height, background:'color-mix(in oklab, var(--t3) 14%, transparent)', borderLeft:'3px solid color-mix(in oklab, var(--t3) 35%, transparent)' }}>
                      {height > 22 && (
                        <p className="px-1.5 pt-1 text-[9px] text-t3 font-medium truncate">{b.reason || 'Bloqueado'}</p>
                      )}
                    </div>
                  )
                })}

                {dayAppts.map((a, ai) => {
                  const dt = parseISO(a.scheduled_at)
                  const dur = a.duration ?? a.duration_minutes ?? 50
                  const startMin = (dt.getHours() - 7) * 60 + dt.getMinutes()
                  const top = Math.max(startMin * MIN_H, 0)
                  const height = Math.max(dur * MIN_H, 26)
                  const c = evtMap[evtColor(a.client_name)]
                  return (
                    <button key={a.id} data-appt="true"
                      onClick={e => { e.stopPropagation(); onClickAppt(a) }}
                      className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-left overflow-hidden transition-all hover:brightness-95 cursor-pointer"
                      style={{ top, height, zIndex: ai + 1, background: c.bg, border: `1px solid ${c.border}` }}>
                      {height > 22 && (
                        <div className="flex items-center gap-1 mb-0.5">
                          {a.modality === 'online' ? <Video className="w-2.5 h-2.5 flex-shrink-0" style={{ color: c.sub }} /> : <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: c.sub }} />}
                          <span className="font-mono text-[9.5px]" style={{ color: c.sub }}>{format(dt,'HH:mm')}</span>
                        </div>
                      )}
                      <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: c.text }}>{a.client_name}</p>
                      {height > 52 && a.notes && <p className="text-[9px] truncate mt-0.5" style={{ color: c.sub }}>{a.notes}</p>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const qc = useQueryClient()
  const [today] = useState(new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [newApptDate, setNewApptDate] = useState<Date | null>(null)
  const [blockDate, setBlockDate] = useState<Date | null>(null)

  const weekEnd = addDays(weekStart, 6)

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments-week', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await api.get('/api/appointments', {
        params: { start: format(weekStart,'yyyy-MM-dd'), end: format(weekEnd,'yyyy-MM-dd') }
      })
      return data.appointments || []
    },
    staleTime: 30_000,
  })

  const { data: monthAppts = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments-month', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await api.get('/api/appointments', {
        params: { start: format(startOfMonth(currentMonth),'yyyy-MM-dd'), end: format(endOfMonth(currentMonth),'yyyy-MM-dd') }
      })
      return data.appointments || []
    },
  })

  const { data: blocks = [] } = useQuery<CalendarBlock[]>({
    queryKey: ['calendar-blocks', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await api.get('/api/locations/blocks', {
        params: { start: format(weekStart,'yyyy-MM-dd'), end: format(weekEnd,'yyyy-MM-dd') }
      })
      return data.blocks || []
    },
    staleTime: 60_000,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/appointments/${id}/status`, { status })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments-week'] })
      qc.invalidateQueries({ queryKey: ['appointments-month'] })
      toast.success('Status atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  })

  function goToday()  { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setCurrentMonth(new Date()) }
  function prevWeek() { setWeekStart(w => subWeeks(w, 1)) }
  function nextWeek() { setWeekStart(w => addWeeks(w, 1)) }
  function selectDate(d: Date) { setWeekStart(startOfWeek(d, { weekStartsOn: 1 })); setCurrentMonth(d) }

  function handleClickSlot(date: Date, hour: number, minute: number) {
    const d = setMinutes(setHours(date, hour), minute)
    setNewApptDate(d)
  }

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ['appointments-week'] })
    qc.invalidateQueries({ queryKey: ['appointments-month'] })
    qc.invalidateQueries({ queryKey: ['calendar-blocks'] })
  }

  const weekRangeLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 }))
  const todayCount = appointments.filter(a => isToday(parseISO(a.scheduled_at)) && a.status !== 'cancelled').length
  const weekTotal = appointments.filter(a => a.status !== 'cancelled').length
  const weekConfirmed = appointments.filter(a => a.status === 'confirmed').length
  const weekCancelled = appointments.filter(a => a.status === 'cancelled').length
  const weekCompleted = appointments.filter(a => a.status === 'completed').length

  const next24h = appointments
    .filter(a => {
      const dt = parseISO(a.scheduled_at)
      return a.status !== 'cancelled' && dt >= today && dt.getTime() <= today.getTime() + 24 * 60 * 60 * 1000
    })
    .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())

  const sortedBlocks = [...blocks].sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime())
  function isFullDayBlock(b: CalendarBlock) {
    const s = parseISO(b.starts_at)
    const e = parseISO(b.ends_at)
    return (e.getTime() - s.getTime()) >= 12 * 60 * 60 * 1000
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-4 space-y-5">
      {/* Nav controls (sem título — TopBar já mostra "Agenda") */}
      <div className="flex items-center gap-2">
        <Btn variant="outline" size="sm" onClick={prevWeek}><ChevronLeft className="h-3.5 w-3.5" /></Btn>
        <Btn variant={isCurrentWeek ? 'primary' : 'secondary'} size="sm" onClick={goToday}>Hoje</Btn>
        <Btn variant="outline" size="sm" onClick={nextWeek}><ChevronRight className="h-3.5 w-3.5" /></Btn>
        <span className="text-[13px] text-3 ml-1">{weekRangeLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <GoogleCalendarCard />
          <Btn variant="secondary" size="sm" onClick={() => setBlockDate(new Date())}><Ban className="h-3.5 w-3.5" />Bloquear</Btn>
          <Btn variant="primary" size="sm" onClick={() => setNewApptDate(setHours(startOfWeek(weekStart, { weekStartsOn: 1 }), 9))}>
            <Plus className="h-3.5 w-3.5" />Nova consulta
          </Btn>
        </div>
      </div>

      {/* KPIs — Lovable layout */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Consultas na semana" value={String(weekTotal)} hint={weekRangeLabel} />
        <KPI label="Taxa de ocupação" value="—" hint="sem dados suficientes" />
        <KPI label="No-shows" value={String(weekCancelled)} hint="cancelados esta semana" />
        <KPI label="Receita prevista" value="—" hint="integração de pagamentos" />
      </div>

      {/* Grade semanal full-width */}
      <Card className="overflow-hidden !p-0" style={{ height: '640px' }}>
        <WeekView
          weekStart={weekStart}
          appointments={appointments}
          blocks={blocks}
          onClickAppt={setSelectedAppt}
          onClickSlot={handleClickSlot}
        />
      </Card>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Próximas 24 horas" hint={`${next24h.length} consulta${next24h.length !== 1 ? 's' : ''}`} />
          <div className="space-y-1">
            {next24h.length === 0 && (
              <p className="py-2 text-[12px] text-3">Nenhuma consulta nas próximas 24 horas.</p>
            )}
            {next24h.map(a => {
              const s = STATUS[a.status] || STATUS.scheduled
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--bg-elevated)]">
                  <Avatar name={a.client_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-1">{a.client_name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-3">
                      {a.modality === 'online' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {a.modality === 'online' ? 'Online' : (a.location_name || 'Presencial')}
                    </p>
                  </div>
                  <Badge variant={s.tag === 'green' ? 'success' : s.tag === 'blue' ? 'info' : s.tag === 'red' ? 'danger' : s.tag === 'amber' ? 'warning' : 'default'} dot>{s.label}</Badge>
                  <span className="flex-shrink-0 font-mono text-[12px] tabular-nums text-2">{format(parseISO(a.scheduled_at), 'HH:mm')}</span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Bloqueios" hint={`${sortedBlocks.length} nesta semana`} />
          <div className="space-y-1">
            {sortedBlocks.length === 0 && (
              <p className="py-2 text-[12px] text-3">Nenhum bloqueio nesta semana.</p>
            )}
            {sortedBlocks.map(b => {
              const bStart = parseISO(b.starts_at)
              const bEnd   = parseISO(b.ends_at)
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[var(--bg-elevated)]">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-1 capitalize">{format(bStart, "EEEE, d 'de' MMM", { locale: ptBR })}</p>
                    {b.reason && <p className="truncate text-[11px] text-3">{b.reason}</p>}
                  </div>
                  <span className="flex-shrink-0 font-mono text-[12px] tabular-nums text-2">
                    {isFullDayBlock(b) ? 'Dia todo' : `${format(bStart, 'HH:mm')}–${format(bEnd, 'HH:mm')}`}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {selectedAppt && (
        <AppointmentModal
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdate={(id, status) => updateStatus.mutate({ id, status })}
        />
      )}
      {newApptDate && (
        <NewAppointmentModal
          initialDate={newApptDate}
          onClose={() => setNewApptDate(null)}
          onSaved={() => { setNewApptDate(null); refreshAll() }}
        />
      )}
      {blockDate && (
        <BlockTimeModal
          initialDate={blockDate}
          onClose={() => setBlockDate(null)}
          onSaved={() => { setBlockDate(null); refreshAll() }}
        />
      )}
    </div>
  )
}
