import { Pool } from 'pg'

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://framesystem:framesystem@localhost:5432/framesystem',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
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
