'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import api from '@/lib/api'

interface Nutritionist {
  id: string
  name: string
  email: string
  phone?: string
  bio?: string
  specialty?: string
  [key: string]: unknown
}

interface AuthContextType {
  user: Nutritionist | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Nutritionist | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function refreshUser() {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data.nutritionist)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const token = Cookies.get('token')
    if (token) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post('/api/auth/login', { email, password })
    Cookies.set('token', data.token, { expires: 7 })
    setUser(data.nutritionist)
  }

  function logout() {
    Cookies.remove('token')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
