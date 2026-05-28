'use client'

import { useQuery } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { FileText, Download, Loader2, FolderOpen, File } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Doc {
  id: string
  original_name: string
  description: string | null
  mimetype: string
  size_bytes: number
  created_at: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileIcon(mimetype: string) {
  if (mimetype.includes('pdf')) return '📄'
  if (mimetype.includes('image')) return '🖼️'
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝'
  if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊'
  return '📎'
}

export default function PatientDocumentsPage() {
  const { client } = usePatient()

  const { data: docs, isLoading } = useQuery<Doc[]>({
    queryKey: ['patient-documents'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/documents')
      return data.documents
    },
    enabled: !!client,
    staleTime: 30_000,
  })

  function downloadDoc(doc: Doc) {
    const token = localStorage.getItem('patient_token')
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/patient/documents/${doc.id}/file`
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', doc.original_name)
    // Use fetch with auth header to trigger download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = doc.original_name
        link.click()
      })
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      <h1 className="text-[22px] font-bold text-white mb-1 tracking-tight">Documentos</h1>
      <p className="text-sm text-white/35 mb-6">Arquivos enviados pela sua nutricionista</p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : !docs || docs.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhum documento ainda</p>
          <p className="text-xs text-white/20 mt-1">Sua nutricionista pode enviar exames, materiais e PDFs por aqui</p>
        </div>
      ) : (
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
          <ul className="divide-y divide-white/[0.04]">
            {docs.map(doc => (
              <li key={doc.id} className="flex items-center gap-4 px-4 py-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-lg">
                  {fileIcon(doc.mimetype)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/85 truncate">{doc.original_name}</p>
                  {doc.description && (
                    <p className="text-xs text-white/40 truncate mt-0.5">{doc.description}</p>
                  )}
                  <p className="text-[10px] text-white/20 mt-1">
                    {formatSize(doc.size_bytes)} · {format(new Date(doc.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => downloadDoc(doc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 text-brand-400 text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                  title="Baixar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PatientNav />
    </div>
  )
}
