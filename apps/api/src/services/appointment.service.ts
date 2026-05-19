import { query } from '../db'

interface TimeSlot {
  datetime: string   // ISO: "2026-05-21T14:00:00"
  label: string      // Legível: "21/05 às 14:00"
}

export async function getAvailableSlots(nutritionist_id: string, date: string): Promise<TimeSlot[]> {
  const targetDate = new Date(date)
  const dayOfWeek = targetDate.getDay()

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
       AND DATE(scheduled_at) = $2
       AND status NOT IN ('cancelled')`,
    [nutritionist_id, date]
  )

  const bookedTimes = new Set(
    existingAppointments.map((a: any) =>
      new Date(a.scheduled_at).toTimeString().slice(0, 5)
    )
  )

  const slots: TimeSlot[] = []

  for (const avail of availability) {
    const [startH, startM] = avail.start_time.split(':').map(Number)
    const [endH, endM] = avail.end_time.split(':').map(Number)
    const duration = avail.slot_duration

    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + duration <= endMinutes) {
      const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0')
      const m = (currentMinutes % 60).toString().padStart(2, '0')
      const timeStr = `${h}:${m}`

      if (!bookedTimes.has(timeStr)) {
        const [year, month, day] = date.split('-').map(Number)
        const datetime = new Date(year, month - 1, day, Number(h), Number(m)).toISOString()
        const label = `${day.toString().padStart(2,'0')}/${month.toString().padStart(2,'0')} às ${timeStr}`

        slots.push({ datetime, label })
      }

      currentMinutes += duration
    }
  }

  return slots
}
