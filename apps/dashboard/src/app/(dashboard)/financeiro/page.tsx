'use client'

import { useState } from 'react'
import {
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MoreHorizontal,
  Search,
  CheckCircle2,
  CreditCard,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Card, SectionTitle, Btn, KPI, Badge, Avatar } from '@/components/ui/finance-primitives'

const monthly = [
  { m: 'Jan', r: 12840, c: 1820 },
  { m: 'Fev', r: 13120, c: 1910 },
  { m: 'Mar', r: 14380, c: 2040 },
  { m: 'Abr', r: 15690, c: 2110 },
  { m: 'Mai', r: 15940, c: 2230 },
  { m: 'Jun', r: 16842, c: 2312 },
]

const planMix = [
  { name: 'Premium', value: 38, color: 'var(--brand)' },
  { name: 'Essencial', value: 42, color: 'var(--info)' },
  { name: 'Pré-Natal', value: 12, color: 'var(--purple)' },
  { name: 'Performance', value: 8, color: 'var(--warning)' },
]

const plans = [
  {
    name: 'Acompanhamento Premium',
    price: 'R$ 890',
    cycle: '/mês',
    clients: 12,
    mrr: 'R$ 10.680',
    features: ['Consultas quinzenais', 'WhatsApp prioritário', 'Plano personalizado'],
    status: 'Ativo',
    color: 'success' as const,
  },
  {
    name: 'Plano Essencial',
    price: 'R$ 390',
    cycle: '/mês',
    clients: 24,
    mrr: 'R$ 9.360',
    features: ['Consultas mensais', 'Suporte por chat', 'Plano padrão'],
    status: 'Ativo',
    color: 'success' as const,
  },
  {
    name: 'Pré-Natal Completo',
    price: 'R$ 1.290',
    cycle: '/mês',
    clients: 4,
    mrr: 'R$ 5.160',
    features: ['Consultas semanais', 'Equipe multidisciplinar'],
    status: 'Ativo',
    color: 'success' as const,
  },
  {
    name: 'Performance Atleta',
    price: 'R$ 1.490',
    cycle: '/mês',
    clients: 3,
    mrr: 'R$ 4.470',
    features: ['Bioimpedância mensal', 'Plano periodizado'],
    status: 'Rascunho',
    color: 'warning' as const,
  },
]

type PayStatus = 'paid' | 'pending' | 'overdue'
const clients: Array<{
  name: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink'
  plan: string
  nextAppt: string
  value: string
  due: string
  status: PayStatus
  method: string
}> = [
  { name: 'Marina Costa', color: 'purple', plan: 'Acompanhamento Premium', nextAppt: '11 Jun · 14:00', value: 'R$ 890', due: '05 Jun', status: 'paid', method: 'Cartão · final 4242' },
  { name: 'Rafael Lima', color: 'blue', plan: 'Plano Essencial', nextAppt: '12 Jun · 09:30', value: 'R$ 390', due: '10 Jun', status: 'paid', method: 'Pix' },
  { name: 'Beatriz Souza', color: 'pink', plan: 'Pré-Natal Completo', nextAppt: '13 Jun · 16:00', value: 'R$ 1.290', due: '15 Jun', status: 'pending', method: 'Boleto' },
  { name: 'Carlos Mendes', color: 'green', plan: 'Acompanhamento Premium', nextAppt: '14 Jun · 10:00', value: 'R$ 890', due: '01 Jun', status: 'overdue', method: 'Cartão · final 1184' },
  { name: 'Helena Prado', color: 'orange', plan: 'Plano Essencial', nextAppt: '15 Jun · 11:00', value: 'R$ 390', due: '12 Jun', status: 'paid', method: 'Pix' },
  { name: 'Pedro Almeida', color: 'blue', plan: 'Performance Atleta', nextAppt: '17 Jun · 08:00', value: 'R$ 1.490', due: '20 Jun', status: 'pending', method: 'Cartão · final 9012' },
  { name: 'Sofia Ramos', color: 'purple', plan: 'Plano Essencial', nextAppt: '18 Jun · 15:30', value: 'R$ 390', due: '08 Jun', status: 'paid', method: 'Pix' },
  { name: 'Lucas Tavares', color: 'green', plan: 'Acompanhamento Premium', nextAppt: '19 Jun · 09:00', value: 'R$ 890', due: '28 Mai', status: 'overdue', method: 'Boleto' },
]

function StatusPill({ s }: { s: PayStatus }) {
  const map = {
    paid: { v: 'success' as const, t: 'Pago', Icon: CheckCircle2 },
    pending: { v: 'info' as const, t: 'Aguardando', Icon: Clock },
    overdue: { v: 'danger' as const, t: 'Atrasado', Icon: AlertCircle },
  }
  const it = map[s]
  const Icon = it.Icon
  return (
    <Badge variant={it.v}>
      <Icon className="size-2.5" /> {it.t}
    </Badge>
  )
}

type Tab = 'overview' | 'plans' | 'payments'

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--line-2)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--t1)',
}

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [filter, setFilter] = useState<'all' | PayStatus>('all')

  const filtered = clients.filter(c => filter === 'all' || c.status === filter)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Financeiro</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Receita, planos e pagamentos dos clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm">
            <Filter className="size-3.5" /> Filtros
          </Btn>
          <Btn variant="secondary" size="sm">Últimos 6 meses</Btn>
          <Btn variant="primary" size="sm">
            <Download className="size-3.5" /> Exportar
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPI label="MRR" value="R$ 16.842" delta="9.1%" />
        <KPI label="Receita 6m" value="R$ 88.812" delta="14.8%" />
        <KPI label="Inadimplência" value="3.2%" delta="0.4%" positive={false} />
        <KPI label="Ticket médio" value="R$ 632" delta="3.1%" />
      </div>

      <div className="flex items-center gap-1 surface-2 p-0.5 rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Visão geral' },
          { id: 'plans', label: 'Planos' },
          { id: 'payments', label: 'Pagamentos' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={cn(
              'h-7 px-3 rounded-md text-[12.5px] font-medium transition-colors',
              tab === t.id ? 'bg-[var(--raised)] text-t1 shadow-sm' : 'text-t3 hover:text-t1',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <SectionTitle
                title="Receita × Custos"
                hint="Mensal"
                action={
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className="flex items-center gap-1.5 text-t2">
                      <span className="size-2 rounded-full" style={{ background: 'var(--brand)' }} /> Receita
                    </span>
                    <span className="flex items-center gap-1.5 text-t2">
                      <span className="size-2 rounded-full" style={{ background: '#FF8FB3' }} /> Custos
                    </span>
                  </div>
                }
              />
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <LineChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" vertical={false} />
                    <XAxis dataKey="m" stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="r" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--brand)' }} />
                    <Line type="monotone" dataKey="c" stroke="#FF8FB3" strokeWidth={2} dot={{ r: 3, fill: '#FF8FB3' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <SectionTitle title="Mix por plano" hint="% MRR" />
              <div className="h-[200px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={planMix} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
                      {planMix.map(s => (
                        <Cell key={s.name} fill={s.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {planMix.map(s => (
                  <div key={s.name} className="flex items-center gap-2 text-[12px]">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-t2 flex-1">{s.name}</span>
                    <span className="text-t1 font-mono tabular-nums">{s.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle title="Recebimentos por método" hint="Últimos 30 dias" />
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <BarChart
                    layout="vertical"
                    data={[
                      { s: 'Pix', v: 8420 },
                      { s: 'Cartão', v: 6140 },
                      { s: 'Boleto', v: 1890 },
                      { s: 'Transferência', v: 392 },
                    ]}
                    margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" horizontal={false} />
                    <XAxis type="number" stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="s" stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="v" fill="var(--brand)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--line-1)' }}>
                <h2 className="text-[13px] font-semibold text-t1">Indicadores</h2>
                <p className="text-[11.5px] text-t3">Comparado ao mês anterior</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--line-1)' }}>
                {[
                  { t: 'Receita reconhecida', v: 'R$ 16.842', delta: '+9.1%', up: true },
                  { t: 'Receita a receber', v: 'R$ 4.218', delta: '+12%', up: true },
                  { t: 'Inadimplência', v: 'R$ 542', delta: '-0.4%', up: false },
                  { t: 'Churn de receita', v: 'R$ 389', delta: '-1.1%', up: false },
                  { t: 'LTV médio', v: 'R$ 2.840', delta: '+6.8%', up: true },
                ].map(r => (
                  <div key={r.t} className="flex items-center gap-4 px-5 py-3 border-t first:border-t-0" style={{ borderColor: 'var(--line-1)' }}>
                    <div className="flex-1 min-w-0 text-[13px] text-t2">{r.t}</div>
                    <div className="text-[13px] font-semibold text-t1 tabular-nums">{r.v}</div>
                    <Badge variant={r.up ? 'success' : 'danger'}>
                      {r.up ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
                      {r.delta}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === 'plans' && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 surface-2 px-3 h-9 rounded-lg flex-1 max-w-md">
              <Search className="size-3.5 text-t3" />
              <input
                className="bg-transparent text-[13px] text-t1 placeholder:text-t3 outline-none flex-1"
                placeholder="Buscar plano…"
              />
            </div>
            <Btn variant="outline" size="sm">
              <Filter className="size-3.5" /> Filtros
            </Btn>
            <Btn variant="primary" size="sm">
              <Plus className="size-3.5" /> Novo plano
            </Btn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(p => (
              <Card key={p.name} className="!p-5">
                <SectionTitle
                  title={p.name}
                  hint={`${p.price}${p.cycle} · MRR ${p.mrr}`}
                  action={<Badge variant={p.color}>{p.status}</Badge>}
                />
                <ul className="space-y-2 mb-4">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[12.5px] text-t2">
                      <CheckCircle2 className="size-3.5" style={{ color: 'var(--brand)' }} /> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--line-1)' }}>
                  <div className="text-[12px] text-t3">
                    <span className="text-t1 font-semibold">{p.clients}</span> clientes ativos
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Btn variant="ghost" size="sm">Editar</Btn>
                    <Btn variant="ghost" size="sm">
                      <MoreHorizontal className="size-3.5" />
                    </Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--line-1)' }}>
            <div>
              <h2 className="text-[13px] font-semibold text-t1">Clientes & pagamentos</h2>
              <p className="text-[11.5px] text-t3">
                {filtered.length} de {clients.length} · agenda e status financeiro
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'paid', label: 'Pagos' },
                { id: 'pending', label: 'Aguardando' },
                { id: 'overdue', label: 'Atrasados' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={cn(
                    'h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors',
                    filter === f.id ? 'bg-[var(--raised)] text-t1' : 'text-t3 hover:text-t1 hover:bg-[var(--raised)]',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-t3 text-[11px] uppercase tracking-wider border-b" style={{ borderColor: 'var(--line-1)' }}>
                  <th className="font-medium px-5 py-2.5">Cliente</th>
                  <th className="font-medium px-3 py-2.5">Plano</th>
                  <th className="font-medium px-3 py-2.5">Próxima consulta</th>
                  <th className="font-medium px-3 py-2.5 text-right">Valor</th>
                  <th className="font-medium px-3 py-2.5">Vencimento</th>
                  <th className="font-medium px-3 py-2.5">Método</th>
                  <th className="font-medium px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--line-1)' }}>
                {filtered.map(c => (
                  <tr key={c.name} className="hover:bg-[var(--raised)] transition cursor-pointer border-t" style={{ borderColor: 'var(--line-1)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} color={c.color} size={28} />
                        <span className="text-t1 font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-t2">{c.plan}</td>
                    <td className="px-3 py-3 text-t2 tabular-nums">{c.nextAppt}</td>
                    <td className="px-3 py-3 text-t1 font-semibold text-right tabular-nums">{c.value}</td>
                    <td className="px-3 py-3 text-t2 tabular-nums">{c.due}</td>
                    <td className="px-3 py-3 text-t2">
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="size-3 text-t3" />
                        {c.method}
                      </span>
                    </td>
                    <td className="px-3 py-3"><StatusPill s={c.status} /></td>
                    <td className="px-3 py-3 text-right">
                      <button className="size-7 grid place-items-center rounded-md text-t2 hover:bg-[var(--raised-2)] hover:text-t1">
                        <MoreHorizontal className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
