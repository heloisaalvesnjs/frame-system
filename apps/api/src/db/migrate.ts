import { readFileSync } from 'fs'
import path from 'path'
import { db } from './index'

async function migrate() {
  console.log('🗄️  Executando migrations...')
  try {
    const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
    await db.query(schema)
    console.log('✅ Schema aplicado com sucesso!')
  } catch (err) {
    console.error('❌ Erro na migration:', err)
    process.exit(1)
  } finally {
    await db.end()
  }
}

migrate()
