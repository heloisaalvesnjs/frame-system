import { Pool } from 'pg'
import dns from 'dns'

dns.setDefaultResultOrder('ipv4first')

const connectionString = process.env.DATABASE_URL || 'postgresql://framesystem:framesystem@localhost:5432/framesystem'

// Supabase and other hosted Postgres providers require SSL
const needsSSL = /supabase\.com|pooler\.supabase|amazonaws\.com|render\.com/.test(connectionString)

export const db = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
})

db.on('error', (err) => {
  console.error('Erro na conexão com o banco:', err)
})

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await db.query(text, params)
  return result.rows
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await db.query(text, params)
  return result.rows[0] ?? null
}
