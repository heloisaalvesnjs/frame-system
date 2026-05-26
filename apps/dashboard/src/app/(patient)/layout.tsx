'use client'

import { PatientProvider } from '@/contexts/PatientContext'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      <div className="min-h-screen bg-ui-bg">
        {children}
      </div>
    </PatientProvider>
  )
}
