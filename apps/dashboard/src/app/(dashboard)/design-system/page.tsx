'use client'

import { Sparkles } from 'lucide-react'
import { Avatar, Badge, Btn, Card, KPI, SectionTitle } from '@/components/ui/finance-primitives'

const COLORS: Array<[string, string]> = [
  ['Background', '#F4F5F0'],
  ['Surface', '#FFFFFF'],
  ['Surface 2', '#FAFBF8'],
  ['Border', '#E5E7E2'],
  ['Brand', '#00C27C'],
  ['Brand Bright', '#00E892'],
  ['Brand Deep', '#0B2E1E'],
  ['Text 1', '#141618'],
]

export default function DesignSystemPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Design System</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Tokens, componentes e padrões visuais do Frame System</p>
      </div>

      <Card>
        <SectionTitle title="Cores" hint="Paleta oficial Frame System" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {COLORS.map(([name, hex]) => (
            <div key={name} className="surface-2 p-3">
              <div className="h-16 rounded-md mb-2" style={{ background: hex }} />
              <div className="text-[12.5px] font-medium text-t1">{name}</div>
              <div className="text-[11px] text-t3 font-mono">{hex}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Tipografia" />
        <div className="space-y-3">
          <div className="text-[28px] font-display font-semibold tracking-tight text-t1">Display · Inter 28/700</div>
          <div className="text-[18px] font-semibold text-t1">Title · Inter 18/600</div>
          <div className="text-[14px] font-medium text-t1">Body strong · 14/500</div>
          <div className="text-[13px] text-t2">Body · 13/400 — leitura confortável.</div>
          <div className="text-[11px] uppercase tracking-wider text-t3 font-mono">Caption · 11/500</div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Botões" />
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary">Primário</Btn>
          <Btn variant="secondary">Secundário</Btn>
          <Btn variant="outline">Outline</Btn>
          <Btn variant="ghost">Ghost</Btn>
          <Btn variant="primary" size="sm"><Sparkles className="h-3.5 w-3.5" /> Com ícone</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Badges" />
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Sucesso</Badge>
          <Badge variant="warning">Atenção</Badge>
          <Badge variant="danger">Erro</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="purple">Premium</Badge>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Avatares" />
        <div className="flex items-center gap-3">
          <Avatar name="Renata D" color="green" />
          <Avatar name="Marina S" color="purple" />
          <Avatar name="Felipe K" color="blue" />
          <Avatar name="Ana P" color="orange" />
          <Avatar name="Júlia C" color="pink" />
        </div>
      </Card>

      <div>
        <SectionTitle title="KPIs" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Receita" value="R$ 42.180" delta="12.4%" />
          <KPI label="Pacientes" value="284" delta="8.1%" />
          <KPI label="Resposta" value="94%" delta="17%" />
          <KPI label="Churn" value="2.1%" delta="0.4%" positive={false} />
        </div>
      </div>

      <Card>
        <SectionTitle title="Skeleton" hint="Estados de carregamento" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </Card>
    </div>
  )
}
