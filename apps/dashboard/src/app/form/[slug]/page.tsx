'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────
interface FormData {
  // 1. Identificação
  name: string
  crn: string
  email: string
  whatsapp: string
  clinic_name: string
  instagram: string
  site: string
  // 2. Assistente
  assistant_name: string
  tone: string
  greeting_message: string
  farewell_message: string
  frases_preferidas: string
  frases_proibidas: string
  // 3. Serviços
  services: { name: string; modality: string; price: string; duration: string }[]
  payment_methods: string[]
  // 4. Agenda
  schedule: { day: string; active: boolean; start: string; end: string }[]
  slot_duration: string
  buffer_minutes: string
  min_advance: string
  max_per_day: string
  // 5. Locais
  locations: { name: string; address: string; modality: string }[]
  online_link: string
  // 6. Base de conhecimento
  approach: string
  target_audience: string
  patient_goals: string
  differentials: string
  can_share: string
  cannot_share: string
  // 7. Integrações
  has_whatsapp_business: string
  google_calendar_email: string
  extra_notes: string
  always_transfer: string
  human_hours: string
}

const INITIAL: FormData = {
  name: '', crn: '', email: '', whatsapp: '', clinic_name: '', instagram: '', site: '',
  assistant_name: '', tone: 'acolhedor', greeting_message: '', farewell_message: '',
  frases_preferidas: '', frases_proibidas: '',
  services: [
    { name: '', modality: 'online', price: '', duration: '50' },
    { name: '', modality: 'online', price: '', duration: '50' },
  ],
  payment_methods: [],
  schedule: [
    { day: 'Segunda-feira', active: true,  start: '08:00', end: '18:00' },
    { day: 'Terça-feira',   active: true,  start: '08:00', end: '18:00' },
    { day: 'Quarta-feira',  active: true,  start: '08:00', end: '18:00' },
    { day: 'Quinta-feira',  active: true,  start: '08:00', end: '18:00' },
    { day: 'Sexta-feira',   active: true,  start: '08:00', end: '18:00' },
    { day: 'Sábado',        active: false, start: '08:00', end: '12:00' },
    { day: 'Domingo',       active: false, start: '08:00', end: '12:00' },
  ],
  slot_duration: '50', buffer_minutes: '10', min_advance: '3', max_per_day: '8',
  locations: [{ name: '', address: '', modality: 'presencial' }],
  online_link: '',
  approach: '', target_audience: '', patient_goals: '', differentials: '',
  can_share: '', cannot_share: '',
  has_whatsapp_business: '', google_calendar_email: '',
  extra_notes: '', always_transfer: '', human_hours: '',
}

const STEPS = [
  { id: 1, label: 'Identificação',    emoji: '👩‍⚕️' },
  { id: 2, label: 'Assistente',       emoji: '🤖' },
  { id: 3, label: 'Serviços',         emoji: '💰' },
  { id: 4, label: 'Agenda',           emoji: '📅' },
  { id: 5, label: 'Locais',           emoji: '📍' },
  { id: 6, label: 'Base de IA',       emoji: '🧠' },
  { id: 7, label: 'Integrações',      emoji: '🔌' },
]

// ─── Sub-components ───────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold" style={{ color: '#161616' }}>{label}</label>
      {hint && <p className="text-[12px]" style={{ color: '#6b7280' }}>{hint}</p>}
      {children}
    </div>
  )
}

const inputCls = "w-full h-10 px-3 rounded-xl text-[13px] outline-none transition border focus:border-[#00c27c] focus:ring-2 focus:ring-[#00c27c20]"
const inputStyle = { background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#161616' }
const textareaCls = "w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition border focus:border-[#00c27c] focus:ring-2 focus:ring-[#00c27c20] resize-none"

// ─── Steps ────────────────────────────────────────────────
function Step1({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome completo *">
          <input className={inputCls} style={inputStyle} placeholder="Dra. Ana Silva" value={data.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="CRN *">
          <input className={inputCls} style={inputStyle} placeholder="CRN-3 00000" value={data.crn} onChange={e => set('crn', e.target.value)} />
        </Field>
        <Field label="E-mail profissional *">
          <input className={inputCls} style={inputStyle} type="email" placeholder="ana@consultorio.com" value={data.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="WhatsApp que será usado no sistema *">
          <input className={inputCls} style={inputStyle} placeholder="+55 11 99999-0000" value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
        </Field>
        <Field label="Nome do consultório / clínica">
          <input className={inputCls} style={inputStyle} placeholder="Consultório Ana Nutrição" value={data.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
        </Field>
        <Field label="Instagram">
          <input className={inputCls} style={inputStyle} placeholder="@anasilva.nutri" value={data.instagram} onChange={e => set('instagram', e.target.value)} />
        </Field>
        <Field label="Site (se tiver)">
          <input className={inputCls} style={inputStyle} placeholder="www.anasilva.com.br" value={data.site} onChange={e => set('site', e.target.value)} />
        </Field>
      </div>
    </div>
  )
}

function Step2({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Como a assistente deve se chamar? *" hint="Ex: Lia, Sofia, Frame, Julia…">
          <input className={inputCls} style={inputStyle} placeholder="Lia" value={data.assistant_name} onChange={e => set('assistant_name', e.target.value)} />
        </Field>
        <Field label="Tom de voz *">
          <select className={inputCls} style={inputStyle} value={data.tone} onChange={e => set('tone', e.target.value)}>
            <option value="acolhedor">Acolhedor e empático</option>
            <option value="formal">Formal e profissional</option>
            <option value="descontraido">Descontraído e próximo</option>
          </select>
        </Field>
      </div>
      <Field label="Mensagem de boas-vindas *" hint="Como a assistente deve se apresentar ao primeiro contato">
        <textarea className={textareaCls} style={inputStyle} rows={3}
          placeholder={`Ex: "Olá! 😊 Sou a Lia, assistente virtual da Dra. Ana. Fico feliz em te atender! Como posso te ajudar hoje?"`}
          value={data.greeting_message} onChange={e => set('greeting_message', e.target.value)} />
      </Field>
      <Field label="Mensagem de despedida" hint="O que diz ao encerrar o atendimento">
        <textarea className={textareaCls} style={inputStyle} rows={2}
          placeholder={`Ex: "Foi um prazer te atender! Qualquer dúvida é só chamar. Até logo! 🌿"`}
          value={data.farewell_message} onChange={e => set('farewell_message', e.target.value)} />
      </Field>
      <Field label="Frases que a assistente DEVE usar com frequência" hint="Uma por linha. Ex: Com certeza!, Que ótimo!, Você está no lugar certo!">
        <textarea className={textareaCls} style={inputStyle} rows={3}
          placeholder={"Com certeza!\nQue ótimo!\nEstou aqui para te ajudar"}
          value={data.frases_preferidas} onChange={e => set('frases_preferidas', e.target.value)} />
      </Field>
      <Field label="Frases ou palavras que a assistente NUNCA deve usar" hint="Uma por linha. Ex: barato, dieta, emagrecer rápido">
        <textarea className={textareaCls} style={inputStyle} rows={3}
          placeholder={"barato\ndieta relâmpago\nemagrecimento rápido"}
          value={data.frases_proibidas} onChange={e => set('frases_proibidas', e.target.value)} />
      </Field>
    </div>
  )
}

function Step3({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
  function updateService(i: number, field: string, val: string) {
    const next = [...data.services]
    next[i] = { ...next[i], [field]: val }
    set('services', next)
  }
  function addService() {
    set('services', [...data.services, { name: '', modality: 'online', price: '', duration: '50' }])
  }

  const PAYMENTS = ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Dinheiro']
  function togglePayment(p: string) {
    const cur = data.payment_methods
    set('payment_methods', cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p])
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px]" style={{ color: '#6b7280' }}>Liste os serviços que sua assistente pode oferecer e agendar para você.</p>
      <div className="space-y-3">
        {data.services.map((s, i) => (
          <div key={i} className="p-4 rounded-2xl border space-y-3" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}>
            <div className="text-[12px] font-semibold" style={{ color: '#9ca3af' }}>Serviço {i + 1}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={inputCls} style={inputStyle} placeholder="Nome do serviço" value={s.name} onChange={e => updateService(i, 'name', e.target.value)} />
              <select className={inputCls} style={inputStyle} value={s.modality} onChange={e => updateService(i, 'modality', e.target.value)}>
                <option value="online">Online</option>
                <option value="presencial">Presencial</option>
                <option value="ambos">Ambos</option>
              </select>
              <input className={inputCls} style={inputStyle} placeholder="Valor R$ (ex: 350)" value={s.price} onChange={e => updateService(i, 'price', e.target.value)} />
              <input className={inputCls} style={inputStyle} placeholder="Duração em minutos (ex: 50)" value={s.duration} onChange={e => updateService(i, 'duration', e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addService} className="text-[13px] font-semibold transition-colors" style={{ color: '#00c27c' }}>
        + Adicionar outro serviço
      </button>
      <Field label="Formas de pagamento aceitas">
        <div className="flex flex-wrap gap-2 mt-1">
          {PAYMENTS.map(p => (
            <button key={p} onClick={() => togglePayment(p)}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors border"
              style={{
                background: data.payment_methods.includes(p) ? '#013F32' : '#fff',
                color: data.payment_methods.includes(p) ? '#E7FE25' : '#374151',
                borderColor: data.payment_methods.includes(p) ? '#013F32' : '#e5e7eb',
              }}>
              {p}
            </button>
          ))}
        </div>
      </Field>
    </div>
  )
}

function Step4({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
  function updateDay(i: number, field: string, val: any) {
    const next = [...data.schedule]
    next[i] = { ...next[i], [field]: val }
    set('schedule', next)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {data.schedule.map((d, i) => (
          <div key={d.day} className="flex items-center gap-3 p-3 rounded-xl border"
            style={{ background: d.active ? '#f0fdf4' : '#f9fafb', borderColor: d.active ? '#bbf7d0' : '#e5e7eb' }}>
            <button onClick={() => updateDay(i, 'active', !d.active)}
              className="w-10 h-6 rounded-full transition-colors relative flex-shrink-0"
              style={{ background: d.active ? '#00c27c' : '#d1d5db' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: d.active ? 'calc(100% - 22px)' : '2px' }} />
            </button>
            <span className="w-28 text-[13px] font-medium" style={{ color: '#161616' }}>{d.day}</span>
            {d.active ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={d.start} onChange={e => updateDay(i, 'start', e.target.value)}
                  className="h-8 px-2 rounded-lg text-[13px] border outline-none focus:border-[#00c27c]"
                  style={{ background: '#fff', borderColor: '#e5e7eb', color: '#161616' }} />
                <span className="text-[12px]" style={{ color: '#9ca3af' }}>até</span>
                <input type="time" value={d.end} onChange={e => updateDay(i, 'end', e.target.value)}
                  className="h-8 px-2 rounded-lg text-[13px] border outline-none focus:border-[#00c27c]"
                  style={{ background: '#fff', borderColor: '#e5e7eb', color: '#161616' }} />
              </div>
            ) : (
              <span className="text-[12px]" style={{ color: '#9ca3af' }}>Não atende</span>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'slot_duration', label: 'Duração da consulta', placeholder: 'min', hint: '50 min' },
          { key: 'buffer_minutes', label: 'Intervalo entre consultas', placeholder: 'min', hint: '10 min' },
          { key: 'min_advance', label: 'Antecedência mínima', placeholder: 'horas', hint: '3 horas' },
          { key: 'max_per_day', label: 'Máximo por dia', placeholder: 'qtd', hint: '8 consultas' },
        ].map(f => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <input className={inputCls} style={inputStyle} placeholder={f.placeholder}
              value={(data as any)[f.key]} onChange={e => set(f.key as keyof FormData, e.target.value)} />
          </Field>
        ))}
      </div>
    </div>
  )
}

function Step5({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
  function updateLoc(i: number, field: string, val: string) {
    const next = [...data.locations]
    next[i] = { ...next[i], [field]: val }
    set('locations', next)
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px]" style={{ color: '#6b7280' }}>Onde você atende? A IA vai indicar o local correto ao agendar.</p>
      <div className="space-y-3">
        {data.locations.map((l, i) => (
          <div key={i} className="p-4 rounded-2xl border space-y-3" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}>
            <div className="text-[12px] font-semibold" style={{ color: '#9ca3af' }}>Local {i + 1}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className={inputCls} style={inputStyle} placeholder="Nome (ex: Consultório SP)" value={l.name} onChange={e => updateLoc(i, 'name', e.target.value)} />
              <input className={inputCls} style={inputStyle} placeholder="Endereço completo" value={l.address} onChange={e => updateLoc(i, 'address', e.target.value)} />
              <select className={inputCls} style={inputStyle} value={l.modality} onChange={e => updateLoc(i, 'modality', e.target.value)}>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => set('locations', [...data.locations, { name: '', address: '', modality: 'presencial' }])}
        className="text-[13px] font-semibold transition-colors" style={{ color: '#00c27c' }}>
        + Adicionar outro local
      </button>
      <Field label="Link de atendimento online (Google Meet, Zoom…)">
        <input className={inputCls} style={inputStyle} placeholder="meet.google.com/xxx-xxx-xxx" value={data.online_link} onChange={e => set('online_link', e.target.value)} />
      </Field>
    </div>
  )
}

function Step6({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-[13px]" style={{ color: '#6b7280' }}>Essas informações treinam a IA para conhecer sua abordagem e falar com propriedade.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Abordagem nutricional principal *" hint="Ex: Low carb, Funcional, Comportamental, Vegana…">
          <input className={inputCls} style={inputStyle} placeholder="Nutrição comportamental e funcional" value={data.approach} onChange={e => set('approach', e.target.value)} />
        </Field>
        <Field label="Público-alvo principal *" hint="Ex: Mulheres 30-50 anos, emagrecimento">
          <input className={inputCls} style={inputStyle} placeholder="Mulheres adultas com objetivo de emagrecimento" value={data.target_audience} onChange={e => set('target_audience', e.target.value)} />
        </Field>
      </div>
      <Field label="Principais objetivos dos seus pacientes" hint="Liste até 5, um por linha">
        <textarea className={textareaCls} style={inputStyle} rows={4}
          placeholder={"Perda de peso saudável\nMelhora do intestino\nGanho de massa muscular\nControle da ansiedade alimentar\nAlimentação saudável para a família"}
          value={data.patient_goals} onChange={e => set('patient_goals', e.target.value)} />
      </Field>
      <Field label="O que diferencia seu atendimento?" hint="O que você faz que outros nutricionistas não fazem">
        <textarea className={textareaCls} style={inputStyle} rows={3}
          placeholder="Atendimento humanizado, sem proibições, com acompanhamento semanal e suporte via WhatsApp entre as consultas."
          value={data.differentials} onChange={e => set('differentials', e.target.value)} />
      </Field>
      <Field label="Informações que a IA PODE compartilhar livremente">
        <textarea className={textareaCls} style={inputStyle} rows={2}
          placeholder="Preços dos serviços, dias disponíveis, modalidades de atendimento, forma de pagamento."
          value={data.can_share} onChange={e => set('can_share', e.target.value)} />
      </Field>
      <Field label="Informações que a IA NUNCA deve mencionar">
        <textarea className={textareaCls} style={inputStyle} rows={2}
          placeholder="Diagnósticos, laudos, indicações de suplementos específicos, valores de exames."
          value={data.cannot_share} onChange={e => set('cannot_share', e.target.value)} />
      </Field>
    </div>
  )
}

function Step7({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tem WhatsApp Business?">
          <select className={inputCls} style={inputStyle} value={data.has_whatsapp_business} onChange={e => set('has_whatsapp_business', e.target.value)}>
            <option value="">Selecione…</option>
            <option value="sim">Sim, já tenho</option>
            <option value="nao">Não, vamos criar</option>
          </select>
        </Field>
        <Field label="E-mail Google para sincronizar Agenda" hint="Se quiser integrar Google Calendar">
          <input className={inputCls} style={inputStyle} type="email" placeholder="ana@gmail.com" value={data.google_calendar_email} onChange={e => set('google_calendar_email', e.target.value)} />
        </Field>
      </div>
      <Field label="Horário em que você responde pessoalmente" hint="Fora desse horário a IA assume 100%">
        <input className={inputCls} style={inputStyle} placeholder="Ex: Segunda a sexta, das 8h às 12h" value={data.human_hours} onChange={e => set('human_hours', e.target.value)} />
      </Field>
      <Field label="Há situações que SEMPRE devem ser transferidas para você?" hint="Ex: paciente com histórico de transtorno alimentar, gravidez, etc.">
        <textarea className={textareaCls} style={inputStyle} rows={3}
          placeholder={"Pacientes com histórico de transtorno alimentar\nGestantes\nCriança menor de 12 anos"}
          value={data.always_transfer} onChange={e => set('always_transfer', e.target.value)} />
      </Field>
      <Field label="Observações livres" hint="Algo importante que a assistente precisa saber sobre você ou seu consultório">
        <textarea className={textareaCls} style={inputStyle} rows={4}
          placeholder="Qualquer informação adicional que você queira que a assistente saiba e que não foi abordada acima."
          value={data.extra_notes} onChange={e => set('extra_notes', e.target.value)} />
      </Field>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function FormPage() {
  const params = useParams()
  const slug = String(params?.slug ?? 'você')
  const name = slug.charAt(0).toUpperCase() + slug.slice(1)

  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function set(k: keyof FormData, v: any) {
    setData(prev => ({ ...prev, [k]: v }))
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await fetch('/api/onboarding-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...data }),
      })
    } catch (_) {}
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #013F32 0%, #025940 100%)' }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[#E7FE25] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" style={{ color: '#013F32' }} />
          </div>
          <h1 className="text-[28px] font-bold text-white mb-3">Formulário enviado!</h1>
          <p className="text-[15px] mb-2" style={{ color: '#a7f3d0' }}>
            Obrigada, {data.name || name}! 🎉
          </p>
          <p className="text-[13px]" style={{ color: '#6ee7b7' }}>
            Recebemos suas informações e em breve a equipe Frame System vai configurar tudo para você.
          </p>
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-[11px]" style={{ color: '#6ee7b7' }}>framesystem.com.br</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#013F32' }}>
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[14px]"
              style={{ background: '#E7FE25', color: '#013F32' }}>F</div>
            <span className="text-white font-semibold text-[14px]">Frame System</span>
          </div>
          <div className="text-[12px]" style={{ color: '#a7f3d0' }}>
            Onboarding · {name}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-1 transition-all duration-500" style={{ width: `${progress}%`, background: '#E7FE25' }} />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => step > s.id && setStep(s.id)}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
                  style={{
                    background: step === s.id ? '#013F32' : step > s.id ? '#00c27c' : '#e5e7eb',
                    color: step === s.id ? '#E7FE25' : step > s.id ? '#fff' : '#9ca3af',
                  }}>
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className="text-[11.5px] font-medium hidden sm:block transition-colors"
                  style={{ color: step === s.id ? '#013F32' : step > s.id ? '#00c27c' : '#9ca3af' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="w-3 h-px flex-shrink-0" style={{ background: '#e5e7eb' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 sm:p-8 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
          {/* Step title */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[22px]">{STEPS[step - 1].emoji}</span>
              <h2 className="text-[20px] font-bold" style={{ color: '#161616' }}>
                {STEPS[step - 1].label}
              </h2>
            </div>
            {step === 1 && <p className="text-[13px]" style={{ color: '#6b7280' }}>Vamos começar com suas informações básicas.</p>}
            {step === 7 && <p className="text-[13px]" style={{ color: '#6b7280' }}>Última etapa! Configure as integrações e finalize.</p>}
          </div>

          {step === 1 && <Step1 data={data} set={set} />}
          {step === 2 && <Step2 data={data} set={set} />}
          {step === 3 && <Step3 data={data} set={set} />}
          {step === 4 && <Step4 data={data} set={set} />}
          {step === 5 && <Step5 data={data} set={set} />}
          {step === 6 && <Step6 data={data} set={set} />}
          {step === 7 && <Step7 data={data} set={set} />}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
              style={{ background: '#f3f4f6', color: '#374151' }}>
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>

            <span className="text-[12px]" style={{ color: '#9ca3af' }}>{step} de {STEPS.length}</span>

            {step < STEPS.length ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
                style={{ background: '#013F32', color: '#E7FE25' }}>
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 disabled:opacity-70"
                style={{ background: '#013F32', color: '#E7FE25' }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Enviando…' : 'Enviar formulário'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] mt-6" style={{ color: '#9ca3af' }}>
          Frame System · Suas informações são confidenciais e usadas somente para configurar seu sistema.
        </p>
      </div>
    </div>
  )
}
