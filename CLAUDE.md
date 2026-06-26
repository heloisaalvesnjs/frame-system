# Frame System — Instruções do projeto (Claude Code)

@memoria-compartilhada/STATUS.md
@memoria-compartilhada/MEMORY.md

Antes de executar qualquer comando ou tarefa neste projeto, leia a pasta
[memoria-compartilhada/](memoria-compartilhada/) (importada acima):

- [STATUS.md](memoria-compartilhada/STATUS.md) — o que está em andamento
  agora (por você e pelo Codex).
- [MEMORY.md](memoria-compartilhada/MEMORY.md) — convenções ativas, decisões
  já tomadas e pendências em aberto.
- [LOG.md](memoria-compartilhada/LOG.md) — histórico cronológico de
  atividades.

Ao iniciar uma tarefa, atualize sua seção em `STATUS.md`. Ao concluir (ou
pausar) a tarefa, mova um resumo para `LOG.md` com a data, atualize
`STATUS.md` e, se relevante, adicione uma entrada datada em `MEMORY.md`
(nova convenção, decisão ou pendência que o Codex precisa saber).

Veja também [CONTEXT.md](CONTEXT.md) (contexto de produto/negócio) e
[SETUP.md](SETUP.md) (instruções de setup).

---

## Documentação estratégica (Obsidian)

O vault Obsidian está em `obsidian/` — arquitetura, estratégia, ICP, playbooks, roadmap.
Leia `obsidian/02 - Reconstrução Técnica/` para decisões de arquitetura atuais.

---

## Subagentes disponíveis (.claude/agents/)

11 agentes especializados. Use `@nome-do-agente` no Claude Code.

### Roteamento e estratégia
| Agente | Quando acionar |
|---|---|
| `orchestrator` | Não sabe qual agente usar — ele decide e delega |
| `strategist` | Decisões de negócio, priorização de roadmap, posicionamento |

### Desenvolvimento
| Agente | Quando acionar |
|---|---|
| `dev-backend` | Backend Fastify/TypeScript: endpoints, webhook, serviços, banco |
| `dev-frontend` | Dashboard Next.js: telas, componentes, integração de API |
| `prompt-engineer` | Escrever/ajustar prompts do ai.service.ts e dos agentes n8n |

### Automação e IA
| Agente | Quando acionar |
|---|---|
| `n8n-specialist` | Projetar workflows n8n, especificar nodes, documentar contratos |

### Comercial e design
| Agente | Quando acionar |
|---|---|
| `sdr` | Prospectar nutricionistas, redigir abordagens, agendar reuniões |
| `designer` | UI/UX, mockups, design system, materiais de vendas, Figma |

### Infraestrutura e qualidade
| Agente | Quando acionar |
|---|---|
| `supabase-migrator` | Migrar banco para Supabase |
| `verificador-qa` | Testar, diagnosticar, validar funcionalidades |
| `notion-specialist` | Integrações com Notion |

**Arquitetura alvo:** WhatsApp → Evolution API → Frame API (Fastify) → n8n (agentes IA) → Claude API
