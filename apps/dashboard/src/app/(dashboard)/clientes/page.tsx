'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Upload, UserPlus } from 'lucide-react'
import api from '@/lib/api'
import { V4Avatar, V4Button, V4Card, V4Input, V4Page, V4Select, V4Tag } from '@/components/v4/V4Primitives'

interface Client {
  id: string
  name: string | null
  phone: string
  goal: string | null
  created_at: string
  last_contact: string | null
  appointment_count?: number
}

const fallback = [
  ['Amanda Souza', 'Emagrecimento', 'Ontem', '12 jun, 15:00', 'Alta intenção', '#8867a9'],
  ['Larissa Costa', 'Nutrição esportiva', 'há 2 dias', 'Sem data', 'Preço enviado', '#b26d54'],
  ['Marina Rocha', 'Consulta online', 'há 4 horas', 'Hoje, 18:00', 'Precisa de você', '#427fa1'],
]

export default function ClientesPage() {
  const { data } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get('/api/clients')
      return data.clients as Client[]
    },
    staleTime: 30_000,
  })
  const rows = data?.length
    ? data.slice(0, 12).map((client, index) => [
        client.name || client.phone,
        client.goal || 'Objetivo não informado',
        client.last_contact ? 'Recente' : 'Novo contato',
        client.appointment_count ? `${client.appointment_count} consulta(s)` : 'Sem data',
        index % 3 === 0 ? 'Ativa' : index % 3 === 1 ? 'Retorno pendente' : 'Nova',
        ['#8867a9', '#b26d54', '#427fa1'][index % 3],
        client.id,
      ])
    : fallback.map((row, index) => [...row, String(index)])

  return (
    <V4Page
      eyebrow="Relacionamento"
      title="Pacientes"
      subtitle="Pessoas que já agendaram ou iniciaram acompanhamento."
      actions={
        <>
          <V4Button><Upload className="h-4 w-4" />Importar</V4Button>
          <V4Button variant="primary"><UserPlus className="h-4 w-4" />Novo paciente</V4Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <V4Input placeholder="Buscar por nome, telefone ou objetivo..." className="min-w-[280px] flex-1" />
        <V4Select><option>Todos os status</option><option>Ativos</option><option>Retorno pendente</option><option>Inativos</option></V4Select>
        <V4Select><option>Todos os serviços</option></V4Select>
      </div>

      <V4Card className="overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-t3">
            <tr>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Objetivo</th>
              <th className="px-4 py-3 font-medium">Última consulta</th>
              <th className="px-4 py-3 font-medium">Próxima consulta</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map(([name, goal, last, next, status, color, id]) => (
              <tr key={id as string} className="transition hover:bg-[var(--raised)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <V4Avatar name={name as string} color={color as string} />
                    <div>
                      <div className="font-medium text-t1">{name as string}</div>
                      <div className="text-[11.5px] text-t3">WhatsApp · Frame</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-t2">{goal as string}</td>
                <td className="px-4 py-3 text-t2">{last as string}</td>
                <td className="px-4 py-3 text-t2">{next as string}</td>
                <td className="px-4 py-3"><V4Tag tone={status === 'Ativa' || status === 'Alta intenção' ? 'green' : status === 'Precisa de você' ? 'red' : 'amber'}>{status as string}</V4Tag></td>
                <td className="px-4 py-3 text-right"><Link href={`/clientes/${id}`} className="text-[12px] font-medium text-[var(--brand)]">Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </V4Card>
    </V4Page>
  )
}
