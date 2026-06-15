'use client'

import { useAuth } from '@/contexts/AuthContext'
import { V4Avatar, V4Button, V4CardPad, V4Input, V4Page, V4Tag } from '@/components/v4/V4Primitives'

export default function ConfiguracoesPage() {
  const { user } = useAuth()

  return (
    <V4Page
      eyebrow="Gestão da conta"
      title="Configurações"
      subtitle="Perfil, equipe, integrações, segurança e preferências."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Perfil profissional</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Nome" value={user?.name || 'Heloísa Rodrigues'} />
              <Field label="CRN" value="CRN-3 12345" />
              <Field label="E-mail" value={user?.email || 'heloisa@framesystem.com.br'} />
              <Field label="WhatsApp" value="+55 11 99999-0000" />
            </div>
            <V4Button variant="primary" className="mt-4">Salvar perfil</V4Button>
          </V4CardPad>

          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Segurança</div>
            <div className="mt-3 divide-y divide-[var(--border)]">
              {[
                ['Autenticação em dois fatores', 'Ativa'],
                ['Alertas de novo acesso', 'Ativo'],
                ['Histórico de sessões', 'Ver sessões'],
                ['Exportar meus dados', 'Solicitar'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3 text-[13px]">
                  <span className="text-t2">{label}</span>
                  {value === 'Ativa' || value === 'Ativo' ? <V4Tag tone="green">{value}</V4Tag> : <V4Button className="h-8 px-3">{value}</V4Button>}
                </div>
              ))}
            </div>
          </V4CardPad>
        </div>

        <div className="space-y-4">
          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Integrações</div>
            <div className="mt-3 divide-y divide-[var(--border)]">
              {[
                ['WhatsApp Business', 'Conectado'],
                ['Google Calendar', 'Conectado'],
                ['Google Meet', 'Conectar'],
                ['Pagamentos', 'Configurar'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3 text-[13px]">
                  <span className="text-t2">{label}</span>
                  {value === 'Conectado' ? <V4Tag tone="green">{value}</V4Tag> : <V4Button className="h-8 px-3">{value}</V4Button>}
                </div>
              ))}
            </div>
          </V4CardPad>

          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Equipe e permissões</div>
            <div className="mt-3 space-y-2">
              {[
                ['Heloísa', 'Proprietária', 'Acesso total', '#2f8b68'],
                ['Carla', 'Nutricionista', 'Pacientes e agenda', '#427fa1'],
                ['Rafael', 'Assistente', 'Conversas', '#b26d54'],
              ].map(([name, role, tag, color]) => (
                <div key={name} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                  <V4Avatar name={name} color={color} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-t1">{name}</div>
                    <div className="text-[11.5px] text-t3">{role}</div>
                  </div>
                  <V4Tag tone={tag === 'Acesso total' ? 'purple' : tag === 'Conversas' ? 'amber' : 'blue'}>{tag}</V4Tag>
                </div>
              ))}
            </div>
            <V4Button className="mt-4 w-full">Gerenciar equipe</V4Button>
          </V4CardPad>
        </div>
      </div>
    </V4Page>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-[12px] text-t3">{label}</span>
      <V4Input className="w-full" defaultValue={value} />
    </label>
  )
}
