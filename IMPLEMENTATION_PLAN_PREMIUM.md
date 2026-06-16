# Frame System — Implementation Plan Premium
**Data:** 2026-06-16 | **Executor:** Claude Code

## Auditoria (concluída)

### Stack existente
- **Frontend:** Next.js 14 App Router, TanStack Query, Tailwind CSS, Zod, react-hook-form, Sonner
- **Backend:** Fastify + PostgreSQL (query direto), JWT auth, bcrypt
- **Integrações:** Evolution API (WhatsApp), Claude API, Google Calendar OAuth
- **Deploy:** Vercel (frontend) + EasyPanel (API)

### Schema atual (tabelas relevantes)
- `nutritionists` — tenant/usuário principal
- `assistants` — config da IA por nutri
- `availability` — horários semanais (7 dias)
- `blocked_dates` — datas bloqueadas (dia inteiro, sem horário)
- `calendar_blocks` — bloqueios com starts_at/ends_at (suporta parcial)
- `appointments` — consultas
- `conversations` + `messages` — inbox
- `clients` — pacientes
- `locations` — locais de atendimento
- `services` — serviços e preços
- `team` — equipe

### Endpoints-chave existentes
- `GET/PUT /api/nutritionists/profile`
- `POST /api/nutritionists/change-password`
- `GET/PUT /api/availability`
- `GET/POST/DELETE /api/availability/blocked`
- `GET /api/locations/blocks?start&end` + `POST/DELETE /api/locations/blocks/:id`
- `GET/POST/PUT/DELETE /api/locations`
- `GET/POST/PUT/DELETE /api/services` (via services.routes.ts)
- `GET/POST/DELETE /api/team`
- `GET/POST /api/whatsapp/connect|qr|status|disconnect`
- `GET /api/google-calendar/auth-url` + `DELETE /api/google-calendar/disconnect`

### Gaps críticos vs spec
- Configurações: tem 4 seções, precisa de 13
- Disponibilidade: tem lista de bloqueios mas sem calendário mensal visual real
- Muitas seções de Config não têm backend (notificações, privacidade, plano) — tratar com UI informativa

---

## Fases de implementação

### Fase 0 — Auditoria ✅ (concluída)

### Fase 1 — Design system (status: OK)
Tokens CSS, sidebar, topbar — já aplicados nas sessões anteriores. Ajustes menores inline.

### Fase 2 — Navegação e domínio ✅ (concluída)
`/oportunidades` removida do filesystem e sidebar. Referências textuais menores em relatorios/page.tsx (não são links funcionais — ok).

### Fase 3 — Configurações (13 seções) 🔄 AGORA
Reconstruir `apps/dashboard/src/app/(dashboard)/configuracoes/page.tsx` com subnav lateral e 13 seções:
1. Minha conta → `PUT /api/nutritionists/profile` (name, email, phone)
2. Perfil profissional → mesmo endpoint (specialty, bio, avatar_url)
3. Consultório e marca → sem backend dedicado (formulário com savestate local)
4. Serviços e preços → redirecionar para `/servicos` ou integrar CRUD inline
5. WhatsApp → `POST /api/whatsapp/connect|disconnect` + QR
6. Assistente e atendimento → toggle IA + horário
7. Integrações → Google Calendar connect/disconnect
8. Equipe e permissões → `GET/POST/DELETE /api/team`
9. Notificações → UI informativa (sem backend)
10. Segurança → `POST /api/nutritionists/change-password`
11. Privacidade e dados → UI informativa (LGPD)
12. Plano e cobrança → UI informativa
13. Preferências → toggle tema (ThemeContext), futuras preferências

### Fase 4 — Disponibilidade (calendário mensal de bloqueios) 🔄 AGORA
Reconstruir `apps/dashboard/src/app/(dashboard)/disponibilidade/page.tsx`:
- Sub-abas: Horários semanais | Calendário de bloqueios | Locais | Regras
- Calendário de bloqueios: navegar mês, clicar dia, criar bloqueio (dia inteiro ou parcial), editar/excluir
- Usar `calendar_blocks` (starts_at/ends_at) via `GET/POST/DELETE /api/locations/blocks`
- Detectar conflito com appointments (query local ao criar bloqueio)
- Mostrar bloqueios no calendário com cor/badge

### Fase 5 — Páginas operacionais (próxima sessão se necessário)
Dashboard, Conversas, Agenda, Pacientes, Assistente, Automações, Relatórios.
A maioria já tem estrutura funcional. Ajustes incrementais.

### Fase 6+ — Qualidade, testes, build final
Após implementação de fases 3-4, rodar `npx tsc --noEmit` e `npm run build`.

---

## Critérios de aceite para esta sessão
- [ ] Configurações tem 13 seções com subnav funcional
- [ ] Pelo menos 8 seções têm formulários reais (com save, validação, toast)
- [ ] Disponibilidade tem calendário mensal visual real de bloqueios
- [ ] Criar/deletar bloqueio funciona via API real
- [ ] Build passa sem erros TypeScript
