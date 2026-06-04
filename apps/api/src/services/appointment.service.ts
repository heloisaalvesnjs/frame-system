import { query } from '../db'

interface TimeSlot {
  datetime: string   // ISO: "2026-05-21T14:00:00"
  label: string      // Legível: "21/05 às 14:00"
}

// ── Cache de feriados em memória (por ano) ────────────────────────
const holidayCache = new Map<number, Set<string>>()

async function getHolidays(year: number): Promise<Set<string>> {
  if (holidayCache.has(year)) return holidayCache.get(year)!

  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      signal: AbortSignal.timeout(4000)
    })
    if (!res.ok) return new Set()

    const holidays = await res.json() as { date: string }[]
    const dates = new Set(holidays.map((h) => h.date)) // "2026-01-01"
    holidayCache.set(year, dates)
    return dates
  } catch {
    // BrasilAPI offline → não bloqueia slots (melhor oferecer do que travar)
    return new Set()
  }
}

// ── Verifica se está dentro do horário de funcionamento (BRT) ────
export async function isWithinWorkingHours(nutritionist_id: string): Promise<boolean> {
  const now = new Date()
  const brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const dayOfWeek = brazilDate.getDay()
  const currentTime = brazilDate.toTimeString().slice(0, 5)

  const availability = await query<any>(
    `SELECT start_time, end_time FROM availability
     WHERE nutritionist_id = $1 AND day_of_week = $2 AND is_active = true`,
    [nutritionist_id, dayOfWeek]
  )

  // Sem config → não bloqueia (nutri ainda não configurou)
  if (!availability.length) return true

  return availability.some((av: any) =>
    currentTime >= av.start_time.slice(0, 5) &&
    currentTime <  av.end_time.slice(0, 5)
  )
}

// ── Slots de um dia específico ────────────────────────────────────
export async function getAvailableSlots(nutritionist_id: string, date: string): Promise<TimeSlot[]> {
  // Usa Date local (evita bug de UTC onde "2026-05-25" vira domingo em UTC-3)
  const [year, month, day] = date.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)
  const dayOfWeek = targetDate.getDay()

  // Verifica feriado nacional
  const holidays = await getHolidays(year)
  if (holidays.has(date)) return []

  // Verifica data bloqueada manualmente pelo nutricionista
  const blocked = await query<any>(
    `SELECT id FROM blocked_dates WHERE nutritionist_id = $1 AND blocked_date = $2`,
    [nutritionist_id, date]
  ).catch(() => [] as any[])
  if (blocked.length > 0) return []

  // Busca horários configurados para o dia da semana
  const availability = await query<any>(
    `SELECT * FROM availability
     WHERE nutritionist_id = $1 AND day_of_week = $2 AND is_active = true`,
    [nutritionist_id, dayOfWeek]
  )

  if (!availability.length) return []

  // Busca agendamentos já existentes na data
  const existingAppointments = await query<any>(
    `SELECT scheduled_at FROM appointments
     WHERE nutritionist_id = $1
       AND DATE(scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $2
       AND status NOT IN ('cancelled')`,
    [nutritionist_id, date]
  )

  const bookedTimes = new Set(
    existingAppointments.map((a: any) => {
      const d = new Date(a.scheduled_at)
      const brazilStr = d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
      return new Date(brazilStr).toTimeString().slice(0, 5)
    })
  )

  const slots: TimeSlot[] = []

  for (const avail of availability) {
    const [startH, startM] = avail.start_time.split(':').map(Number)
    const [endH, endM] = avail.end_time.split(':').map(Number)
    const duration = avail.slot_duration

    // Pausa (ex: almoço)
    const breakStart = avail.break_start ? (() => {
      const [bH, bM] = avail.break_start.slice(0, 5).split(':').map(Number)
      return bH * 60 + bM
    })() : null
    const breakEnd = avail.break_end ? (() => {
      const [bH, bM] = avail.break_end.slice(0, 5).split(':').map(Number)
      return bH * 60 + bM
    })() : null

    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + duration <= endMinutes) {
      // Pula slots que caem dentro da pausa
      if (breakStart !== null && breakEnd !== null) {
        if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
          currentMinutes += duration
          continue
        }
        // Pula slot que começaria antes da pausa mas terminaria dentro dela
        if (currentMinutes < breakStart && currentMinutes + duration > breakStart) {
          currentMinutes = breakEnd
          continue
        }
      }

      const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0')
      const m = (currentMinutes % 60).toString().padStart(2, '0')
      const timeStr = `${h}:${m}`

      if (!bookedTimes.has(timeStr)) {
        const datetime = new Date(year, month - 1, day, Number(h), Number(m)).toISOString()
        const label = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year} às ${timeStr}`
        slots.push({ datetime, label })
      }

      currentMinutes += duration
    }
  }

  return slots
}

// ── Próximos slots disponíveis (varre múltiplos dias) ────────────
// Retorna até `maxSlots` slots nos próximos `maxDays` dias.
// Pula fins de semana sem config, feriados e dias sem disponibilidade.
export async function getNextAvailableSlots(
  nutritionist_id: string,
  maxDays = 14,
  maxSlots = 10
): Promise<TimeSlot[]> {
  const allSlots: TimeSlot[] = []

  // Busca bloqueios manuais dos próximos maxDays dias
  const now = new Date()
  const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const endDate = new Date(brazilNow)
  endDate.setDate(brazilNow.getDate() + maxDays)

  const blocks = await query<any>(
    `SELECT starts_at, ends_at FROM calendar_blocks
     WHERE nutritionist_id = $1 AND ends_at >= $2 AND starts_at <= $3`,
    [nutritionist_id, brazilNow.toISOString(), endDate.toISOString()]
  ).catch(() => [] as any[])

  for (let i = 1; i <= maxDays && allSlots.length < maxSlots; i++) {
    const next = new Date(brazilNow)
    next.setDate(brazilNow.getDate() + i)

    const yr  = next.getFullYear()
    const mo  = String(next.getMonth() + 1).padStart(2, '0')
    const dy  = String(next.getDate()).padStart(2, '0')
    const dateStr = `${yr}-${mo}-${dy}`

    const daySlots = await getAvailableSlots(nutritionist_id, dateStr)

    // Remove slots que caem dentro de bloqueios manuais
    const filtered = daySlots.filter(slot => {
      const slotTime = new Date(slot.datetime)
      return !blocks.some((b: any) => {
        const bStart = new Date(b.starts_at)
        const bEnd   = new Date(b.ends_at)
        return slotTime >= bStart && slotTime < bEnd
      })
    })

    allSlots.push(...filtered)
  }

  return allSlots.slice(0, maxSlots)
}

// ── Lista feriados de um ano (para o dashboard) ───────────────────
export async function listHolidays(year: number): Promise<{ date: string; name: string }[]> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      signal: AbortSignal.timeout(4000)
    })
    if (!res.ok) return []
    return await res.json() as { date: string; name: string }[]
  } catch {
    return []
  }
}
