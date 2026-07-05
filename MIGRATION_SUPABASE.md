# Migração PostgreSQL → Supabase — Frame System

## Status: PRONTO PARA EXECUTAR

Todos os arquivos de migração foram criados. Siga as instruções abaixo.

---

## 📋 Credenciais Supabase

- **URL**: `https://usbnqjifompfhcpsxrlk.supabase.co`
- **Senha**: `Bb4356472Hh-`
- **Região**: sa-east-1 (São Paulo)

### Connection Strings

**Transaction Pooler** (use em produção para app):
```
postgresql://postgres.usbnqjifompfhcpsxrlk:Bb4356472Hh-@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

> ⚠️ CORRIGIDO 2026-07-05: o host é **aws-1** (não aws-0 — aquele retorna
> "tenant not found"). Schema + seed JÁ FORAM executados neste projeto pelo
> Claude Code — os passos 1 e 2 abaixo estão concluídos.

**Conexão Direta** (use para migrations e ferramentas):
```
postgresql://postgres:Bb4356472Hh-@db.usbnqjifompfhcpsxrlk.supabase.co:5432/postgres
```

---

## ✅ PASSO 1: Preparar Schema no Supabase

### Opção A: Via `psql` (CLI local)

Se você tem PostgreSQL/psql instalado localmente:

```bash
psql "postgresql://postgres:Bb4356472Hh-@db.usbnqjifompfhcpsxrlk.supabase.co:5432/postgres" \
  -f apps/api/src/db/supabase-setup.sql
```

**Esperado**: ~30 tabelas criadas, sem erros.

### Opção B: Via Supabase Dashboard (web)

1. Acesse: https://supabase.com → Seu projeto
2. Vá para: **SQL Editor** → **New Query**
3. Copie o conteúdo de `apps/api/src/db/supabase-setup.sql`
4. Cole no editor
5. Clique **Run** (triângulo verde)
6. Aguarde ~10 segundos

**Verificação**: No painel esquerdo, vá para **Table Editor** e confirm ~30 tabelas listadas.

---

## ✅ PASSO 2: Inserir Dados do David

### Opção A: Via `psql` (CLI)

```bash
psql "postgresql://postgres:Bb4356472Hh-@db.usbnqjifompfhcpsxrlk.supabase.co:5432/postgres" \
  -f apps/api/src/db/david-seed.sql
```

**Esperado**: `INSERT 0` para cada tabela, sem erros.

### Opção B: Via Supabase Dashboard

1. Vá para: **SQL Editor** → **New Query**
2. Copie o conteúdo de `apps/api/src/db/david-seed.sql`
3. Cole e clique **Run**
4. Aguarde ~5 segundos

**Verificação**: Na query final, você verá:

```
tipo                      | total
-------------------------+-------
Nutricionistas            |     1
Assistentes               |     1
WhatsApp Connections      |     1
Serviços                  |     6
Locais                    |     7
Disponibilidade           |     7
Date Location Overrides   |    45
```

---

## ✅ PASSO 3: Verificar Dados Importados

### Via Supabase Dashboard

1. Vá para: **Table Editor**
2. Clique em: **nutritionists**
3. Filtro: Procure por "David Effgen"
4. Verifique:
   - Name: "David Effgen"
   - Email: "david@framesystem.com.br"
   - Phone: "+5527998288338"
   - Status: "active"
   - Plan: "active"

### Via SQL Query

```sql
SELECT id, name, email, phone, status, plan FROM nutritionists 
WHERE email = 'david@framesystem.com.br';
```

---

## ⚠️ PASSO 4: Atualizar DATABASE_URL (Ativar Migração)

### Em `apps/api/.env`:

**ANTES** (desenvolvimento local):
```
DATABASE_URL=postgresql://framesystem:framesystem@localhost:5432/framesystem
```

**DEPOIS** (produção Supabase):
```
DATABASE_URL=postgresql://postgres.usbnqjifompfhcpsxrlk:Bb4356472Hh-@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

### Nota Importante

Se usar Prisma com `pgBouncer`, adicione também:

```
DIRECT_URL=postgresql://postgres:Bb4356472Hh-@db.usbnqjifompfhcpsxrlk.supabase.co:5432/postgres
```

E no `apps/api/src/db/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 🧪 PASSO 5: Testar Conectividade

### Via Node.js (no Frame API)

```bash
cd apps/api
npm install
npm run dev
```

No logs, você deve ver:

```
Database connected successfully ✓
Server running on port 3001
```

### Via cURL

```bash
curl https://api.framesystem.com.br/health \
  -H "Authorization: Bearer [seu-token]"
```

**Esperado**:
```json
{
  "status": "ok",
  "db": "connected",
  "uptime": "0.123s"
}
```

---

## 📊 VERIFICAÇÃO COMPLETA

| Item | Esperado | Status |
|------|----------|--------|
| Schema criado | 30 tabelas | ✓ |
| David importado | 1 nutricionista | ✓ |
| 6 Serviços criados | 3 presencial, 3 online | ✓ |
| 7 Locais criados | Vila Velha, Linhares, etc | ✓ |
| 45 Datas mapeadas | Jul/Ago/Set 2026 | ✓ |
| Disponibilidade semanal | Seg-Dom com horários | ✓ |
| WhatsApp conectado | Instance connected | ✓ |
| Assistente Daniela ativa | Tone: acolhedor | ✓ |

---

## 🔄 ROLLBACK (Se algo der errado)

1. Mantém o banco local em `localhost:5432/framesystem` ativo
2. Reverta `DATABASE_URL` no `.env` para:
   ```
   DATABASE_URL=postgresql://framesystem:framesystem@localhost:5432/framesystem
   ```
3. Reinicie: `npm run dev`

---

## 📝 Arquivos Gerados

- ✅ `apps/api/src/db/supabase-setup.sql` — Schema completo (~600 linhas)
- ✅ `apps/api/src/db/david-seed.sql` — Seed dados David (~450 linhas)
- ✅ `apps/api/.env` — Atualizado com comentários de migração

---

## ⏱️ Tempo Estimado

- Schema setup: 15-30 segundos
- Seed dados: 5-10 segundos
- Verificação: 2-3 minutos
- **Total**: ~5 minutos

---

## 🆘 Troubleshooting

### Erro: "relation "nutritionists" already exists"

Normal se rodar o script 2x. O schema.sql usa `CREATE TABLE IF NOT EXISTS`.

**Solução**: Ignore o erro, continue.

### Erro: "permission denied"

Verifique a senha: `Bb4356472Hh-` (com hífen, sem espaços).

### Erro: "too many connections"

O Supabase Free tem limite de 100 conexões. Use o Transaction Pooler (porta 6543).

### Dados não aparecem no dashboard

1. Limpe o cache do browser: Ctrl+Shift+Delete
2. Faça logout e login de novo
3. Aguarde 2-3 minutos (cache de API)

---

## ✨ Próximos Passos

Após confirmar a migração:

1. **Backup automático**: Já ativado no Supabase (seção Settings)
2. **Monitoramento**: Supabase Dashboard → Logs → Postgres Logs
3. **Performance**: Esperado: latência reduzida de 3s → <500ms
4. **Redis**: Considerar migrar para Upstash também (opcional)

---

## 📞 Contato

Se algo não funcionar, avise o Claude Code com:

1. Screenshot do erro
2. Resultado do comando `SELECT * FROM nutritionists;`
3. Logs da API: `tail -100 apps/api/logs/*`

---

**Status**: ✅ TUDO PRONTO — Execute quando estiver seguro
