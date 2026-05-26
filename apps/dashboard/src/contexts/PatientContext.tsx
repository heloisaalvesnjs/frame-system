'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const patientApi = axios.create({ baseURL: API_URL })

interface PatientClient {
  id: string
  name: string | null
  phone: string
  goal: string | null
  nutritionist_id: string
}

interface PatientContextValue {
  client: PatientClient | null
  token: string | null
  loading: boolean
  setSession: (token: string, client: PatientClient) => void
  logout: () => void
}

const PatientContext = createContext<PatientContextValue | null>(null)

const STORAGE_KEY = 'patient_token'

export function PatientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<PatientClient | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const { token: t, client: c } = JSON.parse(stored)
        setToken(t)
        setClient(c)
        patientApi.defaults.headers.common['Authorization'] = `Bearer ${t}`
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  function setSession(t: string, c: PatientClient) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, client: c }))
    patientApi.defaults.headers.common['Authorization'] = `Bearer ${t}`
    setToken(t)
    setClient(c)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    delete patientApi.defaults.headers.common['Authorization']
    setToken(null)
    setClient(null)
  }

  return (
    <PatientContext.Provider value={{ client, token, loading, setSession, logout }}>
      {children}
    </PatientContext.Provider>
  )
}

export function usePatient() {
  const ctx = useContext(PatientContext)
  if (!ctx) throw new Error('usePatient must be used inside PatientProvider')
  return ctx
}
