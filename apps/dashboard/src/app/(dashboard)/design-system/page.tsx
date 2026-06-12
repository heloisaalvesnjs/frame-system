'use client'

import { Plus } from 'lucide-react'
import { Badge, Btn, Card, SectionTitle } from '@/components/ui/finance-primitives'

const colorSwatches: Array<{ name: string; token: string; value: string }> = [
  { name: 'Base', token: '--bg', value: '#0B0C0E' },
  { name: 'Elevated', token: '--raised', value: '#1E2124' },
  { name: 'Surface', token: '--surface', value: '#141618' },
  { name: 'Surface 2', token: '--raised-2', value: '#25282C' },
  { name: 'Brand', token: '--brand', value: '#00C27C' },
  { name: 'Brand Bright', token: '--brand-h', value: '#00E892' },
  { name: 'Brand Deep', token: '--brand-deep', value: '#00875A' },
  { name: 'Text 1', token: '--t1', value: '#F4F5F0' },
]

export default function DesignSystemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display mt-2 text-[22px] font-bold tracking-tight md:text-[26px]" style={{ color: 'var(--t1)' }}>
          Design System
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-5" style={{ color: 'var(--t2)' }}>
          Tokens visuais, tipografia e componentes que sustentam a identidade do Frame System.
        </p>
      </div>

      <Card>
        <SectionTitle title="Cores" hint="Tokens principais usados em toda a interface" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colorSwatches.map(swatch => (
            <div key={swatch.token} className="space-y-2">
              <div
                className="h-16 w-full rounded-xl border"
                style={{ background: swatch.value, borderColor: 'var(--line-1)' }}
              />
              <div>
                <div className="text-[12.5px] font-medium text-t1">{swatch.name}</div>
                <div className="font-mono text-[11px] text-t3">{swatch.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Tipografia" hint="Bricolage Grotesque para títulos, Inter para o corpo do texto" />
        <div className="space-y-4">
          <div>
            <div className="font-display text-[28px] font-bold tracking-tight text-t1">Display</div>
            <div className="mt-1 font-mono text-[11px] text-t3">font-display · 28px · bold</div>
          </div>
          <div>
            <div className="font-display text-[18px] font-semibold tracking-tight text-t1">Title</div>
            <div className="mt-1 font-mono text-[11px] text-t3">font-display · 18px · semibold</div>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-t1">Body strong</div>
            <div className="mt-1 font-mono text-[11px] text-t3">Inter · 14px · semibold</div>
          </div>
          <div>
            <div className="text-[13px] text-t2">Body</div>
            <div className="mt-1 font-mono text-[11px] text-t3">Inter · 13px · regular</div>
          </div>
          <div>
            <div className="text-[11.5px] text-t3">Caption</div>
            <div className="mt-1 font-mono text-[11px] text-t3">Inter · 11.5px · regular</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Botões" hint="Variações de botão usadas em ações primárias e secundárias" />
        <div className="flex flex-wrap items-center gap-3">
          <Btn variant="primary">Primário</Btn>
          <Btn variant="secondary">Secundário</Btn>
          <Btn variant="outline">Outline</Btn>
          <Btn variant="ghost">Ghost</Btn>
          <Btn variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Com ícone
          </Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Badges" hint="Indicadores de status e categorias" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Sucesso</Badge>
          <Badge variant="warning">Aviso</Badge>
          <Badge variant="danger">Erro</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="purple">Destaque</Badge>
        </div>
      </Card>
    </div>
  )
}
