'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
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

function dateLabel(date?: string | null) {
  if (!date) return 'Sem registro'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(date))
}

export default function ClientesPage() {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [uploading, setUploading] = useState(false)

  const { data } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get('/api/clients')
      return data.clients as Client[]
    },
    staleTime: 30_000,
  })

  const clients = (data ?? []).filter(client => {
    const text = `${client.name ?? ''} ${client.phone} ${client.goal ?? ''}`.toLowerCase()
    const matchesSearch = text.includes(search.toLowerCase())
    const isActive = (client.appointment_count ?? 0) > 0
    const matchesStatus = status === 'todos' || (status === 'ativos' ? isActive : !isActive)
    return matchesSearch && matchesStatus
  })

  async function importFile(file?: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/clients/import-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`${data.imported ?? 0} pacientes importados`)
      qc.invalidateQueries({ queryKey: ['clients'] })
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erro ao importar pacientes')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <V4Page
      eyebrow="Relacionamento"
      title="Pacientes"
      subtitle="Pessoas que já agendaram ou iniciaram acompanhamento, usando somente dados reais do sistema."
      actions={
        <>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={event => importFile(event.target.files?.[0])} />
          <V4Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar
          </V4Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <V4Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, telefone ou objetivo..." className="min-w-[280px] flex-1" />
        <V4Select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="ativos">Com consulta</option>
          <option value="novos">Sem consulta</option>
        </V4Select>
      </div>

      <V4Card className="overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-t3">
            <tr>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Objetivo</th>
              <th className="px-4 py-3 font-medium">Último contato</th>
              <th className="px-4 py-3 font-medium">Consultas</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {clients.map((client, index) => {
              const active = (client.appointment_count ?? 0) > 0
              return (
                <tr key={client.id} className="transition hover:bg-[var(--raised)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <V4Avatar name={client.name || client.phone} color={['#8867a9', '#b26d54', '#427fa1'][index % 3]} />
                      <div>
                        <div className="font-medium text-t1">{client.name || client.phone}</div>
                        <div className="text-[11.5px] text-t3">{client.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-t2">{client.goal || 'Objetivo não informado'}</td>
                  <td className="px-4 py-3 text-t2">{dateLabel(client.last_contact)}</td>
                  <td className="px-4 py-3 text-t2">{client.appointment_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <V4Tag tone={active ? 'green' : 'default'}>{active ? 'Com consulta' : 'Novo contato'}</V4Tag>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/clientes/${client.id}`} className="text-[12px] font-medium text-[var(--brand)]">
                      Abrir
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!clients.length && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[12px] text-t3">
                  Nenhum paciente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </V4Card>
    </V4Page>
  )
}
