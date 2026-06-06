'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

function PatientEntry() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setSession, client } = usePatient()
  const [status, setStatus] = useState<'verifying' | 'error' | 'done'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (client) {
      router.replace('/p/home')
      return
    }

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('Link inválido. Peça um novo link à sua nutricionista.')
      return
    }

    patientApi.post('/api/patient/auth/verify', { token })
      .then(({ data }) => {
        setSession(data.token, data.client)
        setStatus('done')
        setTimeout(() => router.replace('/p/home'), 600)
      })
      .catch((err) => {
        const msg = err.response?.data?.error ?? 'Erro ao validar link'
        setStatus('error')
        setErrorMsg(
          msg === 'Link já utilizado'
            ? 'Este link já foi usado. Peça um novo link à sua nutricionista.'
            : msg === 'Link expirado'
              ? 'Este link expirou (válido por 72h). Peça um novo link.'
              : 'Link inválido. Peça um novo link à sua nutricionista.'
        )
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-ui-bg">
      <div className="mb-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/30">
          <span className="text-white text-2xl font-bold">F</span>
        </div>
        <p className="text-white/40 text-sm">Seu portal de acompanhamento</p>
      </div>

      {status === 'verifying' && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-white/60 text-sm">Verificando link…</p>
        </div>
      )}

      {status === 'done' && (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          <p className="text-white/80 text-sm font-medium">Tudo certo! Entrando…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{errorMsg}</p>
        </div>
      )}
    </div>
  )
}

export default function PatientEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-ui-bg">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    }>
      <PatientEntry />
    </Suspense>
  )
}
