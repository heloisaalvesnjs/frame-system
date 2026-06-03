'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, CheckCheck, Video, MapPin,
  X, ExternalLink, Unlink, Plus, Pencil, Trash2, Ban,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek,
  addDays, addWeeks, subWeeks, setHours, setMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

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
const STATUS: Record<string, { label:string; dot:string; badge:string; bg:string; border:string; text:string; textSub:string }> = {
  scheduled: { label:'Agendado',   dot:'bg-blue-500',     badge:'bg-blue-500/10 text-blue-600 border-blue-500/20',     bg:'bg-blue-500/[0.12]',   border:'border-blue-500',  text:'text-blue-700',    textSub:'text-blue-500/80'  },
  confirmed: { label:'Confirmado', dot:'bg-emerald-500',  badge:'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', bg:'bg-emerald-500/[0.12]', border:'border-emerald-500', text:'text-emerald-700', textSub:'text-emerald-500/80' },
  cancelled: { label:'Cancelado',  dot:'bg-red-400',      badge:'bg-red-500/10 text-red-500 border-red-500/20',        bg:'bg-red-500/[0.08]',    border:'border-red-400',   text:'text-red-600',     textSub:'text-red-400/70'   },
  completed: { label:'Realizado',  dot:'bg-t3',           badge:'bg-t3/10 text-t3 border-t3/20',                       bg:'bg-t3/[0.08]',         border:'border-t3',        text:'text-t2',          textSub:'text-t3'           },
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
          <button onClick={onPrevMonth} className="w-6 h-6 rounded flex items-center justify-center text-t3 hover:text-t1 hover:bg-raised transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button onClick={onNextMonth} className="w-6 h-6 rounded flex items-center justify-center text-t3 hover:text-t1 hover:bg-raised transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
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
              className={cn('relative flex flex-col items-center py-0.5 rounded-lg transition-all',
                isSelected ? 'bg-brand-500' : isTodayDay ? 'bg-brand-500/10' : 'hover:bg-raised')}>
              <span className={cn('font-mono text-[11px] leading-5',
                isSelected ? 'text-white font-bold' : isTodayDay ? 'text-brand-500 font-semibold' : 'text-t2')}>
                {format(day, 'd')}
              </span>
              {hasAppt && !isSelected && <span className="w-1 h-1 rounded-full bg-brand-500 mt-0.5" />}
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
      {isConnected
        ? <button onClick={() => disconnect.mutate()} className="text-[10px] text-t3 hover:text-red-400 flex items-center gap-1"><Unlink className="w-3 h-3" /> Desconectar</button>
        : <a href={authUrlData?.url || '#'} className="text-[10px] text-brand-500 hover:text-brand-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Conectar</a>
      }
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

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p className="font-bold text-t1">Nova consulta</p>
            <p className="text-xs text-t3 mt-0.5">{format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-t3 hover:bg-raised">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Date + time */}
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

          {/* Client */}
          <div>
            <label className="text-xs text-t3 block mb-1.5">Paciente</label>
            {selectedClient ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border:'1px solid var(--border)', background:'var(--raised)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-t1 truncate">{selectedClient.name}</p>
                  <p className="text-xs text-t3">{selectedClient.phone}</p>
                </div>
                <button onClick={() => { setSelectedClient(null); setClientSearch('') }} className="text-t3 hover:text-red-500">
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
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-raised text-left transition-colors">
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

          {/* Duration + modality */}
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
                <option value="presencial">📍 Presencial</option>
                <option value="online">🌐 Online</option>
              </select>
            </div>
          </div>

          {/* Location */}
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

          {/* Notes */}
          <div>
            <label className="text-xs text-t3 block mb-1.5">Observações (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Alguma observação sobre a consulta..."
              className="w-full rounded-lg px-3 py-2 text-sm text-t1 placeholder:text-t3 resize-none focus:outline-none"
              style={{ border:'1px solid var(--border)', background:'var(--raised)' }} />
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3 flex-shrink-0" style={{ borderTop:'1px solid var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-t2 hover:text-t1 transition-colors" style={{ borderColor:'var(--border)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-all disabled:opacity-50">
            {saving ? 'Salvando…' : 'Agendar consulta'}
          </button>
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
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-t3 hover:bg-raised flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', s.badge)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} /> {s.label}
            </span>
            {appt.modality && (
              <span className="flex items-center gap-1.5 text-xs text-t2 px-2.5 py-1 rounded-full" style={{ border:'1px solid var(--border)' }}>
                {appt.modality === 'online' ? <><Video className="w-3 h-3" /> Online</> : <><MapPin className="w-3 h-3" /> Presencial</>}
              </span>
            )}
            {appt.location_name && (
              <span className="flex items-center gap-1 text-xs text-t3 px-2 py-0.5 rounded-full" style={{ border:'1px solid var(--border)' }}>
                <MapPin className="w-3 h-3" /> {appt.location_name}
              </span>
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
              <button onClick={() => { onUpdate(appt.id, 'confirmed'); onClose() }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                <CheckCircle className="w-4 h-4" /> Confirmar
              </button>
            )}
            {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
              <button onClick={() => { onUpdate(appt.id, 'completed'); onClose() }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-brand-500/10 text-brand-500 border border-brand-500/20 hover:bg-brand-500/20 transition-colors">
                <CheckCheck className="w-4 h-4" /> Realizado
              </button>
            )}
            <button onClick={() => { onUpdate(appt.id, 'cancelled'); onClose() }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors">
              <XCircle className="w-4 h-4" /> Cancelar
            </button>
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
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm text-t2 hover:text-t1" style={{ borderColor:'var(--border)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-sm font-semibold disabled:opacity-50">
            {saving ? 'Salvando…' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Locations Sidebar Panel ───────────────────────────────────────────────────
function LocationsPanel() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', color: '#6366f1' })

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => { const { data } = await api.get('/api/locations'); return data.locations },
    staleTime: 60_000,
  })

  const create = useMutation({
    mutationFn: () => api.post('/api/locations', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setAdding(false); setForm({ name:'', city:'', color:'#6366f1' }); toast.success('Local adicionado!') },
    onError: () => toast.error('Erro ao adicionar local'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/locations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Local removido.') },
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] text-t3 tracking-wider uppercase">Locais</p>
        <button onClick={() => setAdding(v => !v)} className="text-t3 hover:text-brand-500 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-lg p-2" style={{ background:'var(--raised)', border:'1px solid var(--border)' }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nome do local" className="w-full h-7 rounded px-2 text-xs text-t1 placeholder:text-t3 focus:outline-none"
            style={{ border:'1px solid var(--border)', background:'var(--surface)' }} />
          <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Cidade" className="w-full h-7 rounded px-2 text-xs text-t1 placeholder:text-t3 focus:outline-none"
            style={{ border:'1px solid var(--border)', background:'var(--surface)' }} />
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="w-7 h-7 rounded cursor-pointer" />
            <button onClick={() => form.name && create.mutate()}
              className="flex-1 h-7 rounded text-[11px] font-semibold bg-brand-500 text-white hover:bg-brand-400 transition-colors">
              Salvar
            </button>
          </div>
        </div>
      )}

      {locations.length === 0 && !adding && (
        <p className="text-[10px] text-t3 text-center py-2">Nenhum local cadastrado</p>
      )}

      {locations.map(l => (
        <div key={l.id} className="flex items-center gap-2 py-1 group">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-t1 truncate leading-tight">{l.name}</p>
            {l.city && <p className="text-[9px] text-t3">{l.city}</p>}
          </div>
          <button onClick={() => remove.mutate(l.id)}
            className="opacity-0 group-hover:opacity-100 text-t3 hover:text-red-500 transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
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

  // Group blocks by day
  const blocksByDay = new Map<string, CalendarBlock[]>()
  weekDays.forEach(d => blocksByDay.set(format(d, 'yyyy-MM-dd'), []))
  blocks.forEach(b => {
    const key = format(parseISO(b.starts_at), 'yyyy-MM-dd')
    blocksByDay.get(key)?.push(b)
  })

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [weekStart])

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    // Don't trigger if clicking on an appointment button
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
      {/* Day headers */}
      <div className="flex flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="w-14 flex-shrink-0" />
        {weekDays.map((day, i) => {
          const isToday2 = isToday(day)
          return (
            <div key={i} className="flex-1 flex flex-col items-center py-2 gap-0.5 min-w-0"
              style={{ borderLeft:'1px solid var(--border)' }}>
              <span className={cn('font-mono text-[10px] tracking-wider', isToday2 ? 'text-brand-500' : 'text-t3')}>{DAY_LABELS[i]}</span>
              <span className={cn('w-7 h-7 rounded-full flex items-center justify-center font-mono text-[13px] font-bold',
                isToday2 ? 'bg-brand-500 text-white' : 'text-t1')}>{format(day, 'd')}</span>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${HOURS.length * HOUR_H}px` }}>

          {/* Time labels */}
          <div className="w-14 flex-shrink-0 relative pointer-events-none">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: i * HOUR_H - 8, height: HOUR_H }}>
                <span className="font-mono text-[10px] text-t3 leading-none mt-1">{String(h).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayAppts = byDay.get(key) || []
            const dayBlocks = blocksByDay.get(key) || []
            const isToday2 = isToday(day)

            return (
              <div key={key} className="flex-1 relative min-w-0 cursor-pointer"
                style={{ borderLeft:'1px solid var(--border)', height:`${HOURS.length * HOUR_H}px`,
                  background: isToday2 ? 'rgba(0,194,124,0.018)' : undefined }}
                onClick={e => handleColumnClick(e, day)}
              >
                {/* Hour lines */}
                {HOURS.map((_, i) => (
                  <div key={i} className="absolute w-full pointer-events-none"
                    style={{ top: i * HOUR_H, borderTop:'1px dashed var(--border)', opacity: 0.5 }} />
                ))}
                {HOURS.map((_, i) => (
                  <div key={`h-${i}`} className="absolute w-full pointer-events-none"
                    style={{ top: i * HOUR_H + HOUR_H / 2, borderTop:'1px dashed var(--border)', opacity: 0.25 }} />
                ))}

                {/* Calendar blocks (grey overlay) */}
                {dayBlocks.map(b => {
                  const bStart = parseISO(b.starts_at)
                  const bEnd   = parseISO(b.ends_at)
                  const startMin = (bStart.getHours() - 7) * 60 + bStart.getMinutes()
                  const endMin   = (bEnd.getHours()   - 7) * 60 + bEnd.getMinutes()
                  const top    = Math.max(startMin * MIN_H, 0)
                  const height = Math.max((endMin - startMin) * MIN_H, 20)
                  return (
                    <div key={b.id} className="absolute left-0 right-0 pointer-events-none"
                      style={{ top, height, background:'rgba(100,100,100,0.12)', borderLeft:'3px solid rgba(100,100,100,0.3)' }}>
                      {height > 22 && (
                        <p className="px-1.5 pt-1 text-[9px] text-t3 font-medium truncate">{b.reason || 'Bloqueado'}</p>
                      )}
                    </div>
                  )
                })}

                {/* Appointments */}
                {dayAppts.map((a, ai) => {
                  const dt = parseISO(a.scheduled_at)
                  const dur = a.duration ?? a.duration_minutes ?? 50
                  const startMin = (dt.getHours() - 7) * 60 + dt.getMinutes()
                  const top = Math.max(startMin * MIN_H, 0)
                  const height = Math.max(dur * MIN_H, 26)
                  const s = STATUS[a.status] || STATUS.scheduled
                  const endDt = new Date(dt.getTime() + dur * 60000)
                  return (
                    <button key={a.id} data-appt="true"
                      onClick={e => { e.stopPropagation(); onClickAppt(a) }}
                      className={cn('absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left overflow-hidden transition-all hover:opacity-80 hover:shadow-md border-l-[3px]', s.bg, s.border)}
                      style={{ top, height, zIndex: ai + 1 }}>
                      <p className={cn('text-[11px] font-semibold leading-tight truncate', s.text)}>{a.client_name}</p>
                      {height > 38 && <p className={cn('text-[9px] truncate mt-0.5', s.textSub)}>{format(dt,'HH:mm')} – {format(endDt,'HH:mm')}</p>}
                      {height > 52 && a.location_name && <p className={cn('text-[9px] truncate mt-0.5', s.textSub)}>📍 {a.location_name}</p>}
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

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden">

      {/* ── Left sidebar ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col gap-5 w-[200px] flex-shrink-0 px-4 py-5 overflow-y-auto"
        style={{ borderRight:'1px solid var(--border)' }}>
        <MiniCalendar
          currentMonth={currentMonth} selectedDate={weekStart} appointments={monthAppts}
          onSelectDate={selectDate}
          onPrevMonth={() => setCurrentMonth(m => subMonths(m, 1))}
          onNextMonth={() => setCurrentMonth(m => addMonths(m, 1))}
        />

        {/* Status legend */}
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] text-t3 tracking-wider uppercase">Status</p>
          {Object.entries(STATUS).map(([key, s]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', s.dot)} />
              <span className="text-[11px] text-t2">{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded flex-shrink-0" style={{ background:'rgba(100,100,100,0.3)' }} />
            <span className="text-[11px] text-t2">Bloqueado</span>
          </div>
        </div>

        <LocationsPanel />
        <GoogleCalendarCard />
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="w-8 h-8 rounded-lg flex items-center justify-center text-t2 hover:text-t1 hover:bg-raised transition-colors" style={{ border:'1px solid var(--border)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                isCurrentWeek ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20' : 'text-t2 hover:bg-raised')}
              style={{ border: isCurrentWeek ? undefined : '1px solid var(--border)' }}>
              Hoje
            </button>
            <button onClick={nextWeek} className="w-8 h-8 rounded-lg flex items-center justify-center text-t2 hover:text-t1 hover:bg-raised transition-colors" style={{ border:'1px solid var(--border)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="font-mono text-[12px] text-t2 tracking-wide hidden sm:block">{weekRangeLabel}</p>

          <div className="flex items-center gap-2">
            <button onClick={() => setBlockDate(new Date())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t2 hover:text-red-500 hover:bg-red-500/5 transition-colors"
              style={{ border:'1px solid var(--border)' }}>
              <Ban className="w-3.5 h-3.5" /> Bloquear
            </button>
            <button onClick={() => setNewApptDate(setHours(startOfWeek(weekStart, { weekStartsOn: 1 }), 9))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-400 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nova consulta
            </button>
          </div>
        </div>

        {/* Week grid */}
        <WeekView
          weekStart={weekStart}
          appointments={appointments}
          blocks={blocks}
          onClickAppt={setSelectedAppt}
          onClickSlot={handleClickSlot}
        />
      </div>

      {/* Modals */}
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
