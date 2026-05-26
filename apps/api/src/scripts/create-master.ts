/**
 * Script de configuração da conta mestre
 * Uso: npx tsx src/scripts/create-master.ts
 *
 * Cria ou atualiza a conta da Heloísa como conta mestre do sistema.
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import * as readline from 'readline'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

async function main() {
  console.log('\n🛡️  Frame System — Setup Conta Mestre\n')

  const email = (await prompt('E-mail da conta mestre [heloisaalvesnjs@gmail.com]: ')).trim()
    || 'heloisaalvesnjs@gmail.com'

  const name = (await prompt('Nome completo [Heloísa Alves]: ')).trim()
    || 'Heloísa Alves'

  const password = (await prompt('Senha (mínimo 8 caracteres): ')).trim()
  if (password.length < 8) {
    console.error('❌ Senha muito curta. Mínimo 8 caracteres.')
    process.exit(1)
  }

  const confirm = (await prompt('Confirme a senha: ')).trim()
  if (password !== confirm) {
    console.error('❌ Senhas não coincidem.')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)

  const existing = await pool.query(
    'SELECT id, email, status, is_master FROM nutritionists WHERE email = $1',
    [email]
  )

  if (existing.rows.length > 0) {
    // Update existing account → make master
    await pool.query(
      `UPDATE nutritionists
       SET is_master = true, status = 'active', password_hash = $1, name = $2, updated_at = NOW()
       WHERE email = $3`,
      [hash, name, email]
    )
    console.log(`\n✅ Conta existente atualizada!`)
    console.log(`   E-mail:  ${email}`)
    console.log(`   Status:  active`)
    console.log(`   Master:  true\n`)
  } else {
    // Create new master account
    await pool.query(
      `INSERT INTO nutritionists (name, email, password_hash, status, is_master, plan)
       VALUES ($1, $2, $3, 'active', true, 'master')`,
      [name, email, hash]
    )
    console.log(`\n✅ Conta mestre criada com sucesso!`)
    console.log(`   E-mail:  ${email}`)
    console.log(`   Status:  active`)
    console.log(`   Master:  true\n`)
  }

  console.log('🚀 Agora você pode entrar no sistema com essa conta.\n')
  console.log('   Acesse: http://localhost:3000/login → aba Nutricionista\n')

  await pool.end()
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
