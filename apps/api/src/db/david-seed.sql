-- ============================================================================
-- FRAME SYSTEM — Seed Data para David Effgen
-- ============================================================================
-- Este arquivo insere todos os dados do David Effgen no banco Supabase
-- Usar: psql "postgresql://postgres:[SENHA]@db.usbnqjifompfhcpsxrlk.supabase.co:5432/postgres" -f david-seed.sql
--
-- IMPORTANTE:
-- - Todos os INSERTs usam ON CONFLICT DO NOTHING para idempotência
-- - UUIDs são fixos para facilitar referências futuras
-- - A senha é um placeholder — ALTERAR NO BANCO APÓS SEED
--
-- UUIDs Fixos:
-- - nutritionist_id: a0000000-0000-0000-0000-000000000001
-- - assistant_id: b0000000-0000-0000-0000-000000000001
-- - whatsapp_connection_id: c0000000-0000-0000-0000-000000000001
-- - service_ids: d1000000-0000-0000-0000-000000000001 até d6000000-0000-0000-0000-000000000006
-- - location_ids: e1000000-0000-0000-0000-000000000001 até e7000000-0000-0000-0000-000000000007
--
-- ============================================================================

-- Desabilitar triggers temporariamente para melhor performance
ALTER TABLE nutritionists DISABLE TRIGGER trg_nutritionists_updated;
ALTER TABLE assistants DISABLE TRIGGER trg_assistants_updated;

-- ============================================================================
-- 1. NUTRICIONISTA: DAVID EFFGEN
-- ============================================================================

INSERT INTO nutritionists (
  id, name, email, phone, specialty, bio, password_hash, is_active, plan, status, is_master,
  buffer_between_minutes, min_advance_hours, max_appointments_per_day,
  created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'David Effgen',
  'david@framesystem.com.br',
  '+5527998288338',
  'Emagrecimento e Hipertrofia',
  'Nutricionista com 15 anos de clínica, especializado em emagrecimento e hipertrofia',
  '$2b$10$placeholder.hash.do.david.effgen.senha.real.aqui.nao.mostre',
  true,
  'active',
  'active',
  false,
  0,
  3,
  12,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ASSISTENTE IA: DANIELA
-- ============================================================================

INSERT INTO assistants (
  id, nutritionist_id, name, tone, greeting_message, farewell_message,
  pdf_content, is_active, emoji_level,
  func_prospeccao, func_triagem, func_agendamento,
  frases_proibidas, frases_preferidas,
  created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Daniela',
  'acolhedor',
  'Oi! Que bom ter você aqui! Esse é o WhatsApp de agendamentos do David Effgen — é por aqui que a gente marca sua avaliação e tira as dúvidas sobre os planos. Me conta rapidinho: 1️⃣ Você prefere atendimento presencial (ES) ou online? 2️⃣ Tem algum dia ou horário que funciona melhor pra você? Já te respondo com as opções disponíveis. 😊',
  'Tudo certo por aqui! Qualquer coisa que precisar, pode chamar sem cerimônia. 😊 A gente se vê em breve para o começo de uma transformação de verdade. 💚',
  'Me chamo David Effgen. Sou nutricionista com 15 anos de clínica, especializado em emagrecimento e hipertrofia. Atendo homens e mulheres de 20 a 50 anos que querem resultados reais — não dietas genéricas que duram duas semanas.

O que faço de diferente: Aqui você não recebe uma dieta. Você recebe um processo. Faço avaliação completa do seu histórico e construo um plano alimentar em torno da sua rotina real. Se você viaja, tem jantar de negócios, passa por uma semana fora do normal, você não some e volta do zero. Você ajusta em tempo real com suporte pelo WhatsApp. No final do ciclo você recebe um dossiê completo com evolução, ajustes feitos e próximos passos.

Para quem atendo: Homens e mulheres entre 20 e 50 anos. Quem quer emagrecer com saúde, ganhar massa, ter alta performance, melhorar o estilo de vida ou simplesmente ter mais qualidade de vida.

REGRAS CLÍNICAS — nunca mencionar diagnósticos, laudos médicos, substâncias prejudiciais. Transferir imediatamente ao David: pacientes com histórico de transtorno alimentar, gestantes, crianças menores de 12 anos, situações que exijam avaliação médica.

Quando não souber responder: dizer "vou verificar com o David e retorno em breve".',
  true,
  3,
  true,
  true,
  true,
  '["barato", "dieta relâmpago", "seca rápido"]'::jsonb,
  '["Bacana", "Que ótimo", "Perfeito", "Entendi", "manda a dúvida"]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. INSTÂNCIA WHATSAPP
-- ============================================================================

-- instance_token é OBRIGATÓRIO: é por ele que o webhook roteia as mensagens
-- recebidas da uazapi (webhook.routes.ts busca WHERE instance_token = $1).
-- Valor real da instância do David na uazapi (confirmado no contexto de produção).
INSERT INTO whatsapp_connections (
  id, nutritionist_id, instance_name, instance_token, phone_number, status, connected_at,
  created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'nutri-2dedeb18-6695-4b6d-a49b-09b7f8b340e0',
  '3041108b-c9a6-42fa-b9cc-6b390fd0e587',
  '+5527998288338',
  'connected',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (instance_name) DO NOTHING;

-- ============================================================================
-- 4. SERVIÇOS (6 planos: 3 presencial, 3 online)
-- ============================================================================

-- PRESENCIAL
INSERT INTO services (
  id, nutritionist_id, name, price, description, modality, is_active, sort_order,
  created_at
) VALUES
  -- Presencial 1: Mensal
  (
    'd1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Consultoria Premium - Mensal',
    '600.00',
    '1 consulta presencial, avaliação física, plano personalizado e Dossiê Evolutivo. Suporte no WhatsApp.',
    'presencial',
    true,
    1,
    NOW()
  ),
  -- Presencial 2: Trimestral
  (
    'd2000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Consultoria Premium - Trimestral',
    '414.63',
    '3 consultas + 3 avaliações físicas + treino individual + check-in quinzenal + Dossiê Evolutivo. Parcelado em 3x.',
    'presencial',
    true,
    2,
    NOW()
  ),
  -- Presencial 3: Semestral
  (
    'd3000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Consultoria Premium - Semestral',
    '362.73',
    '6 consultas + 6 monitoramentos + treino + ficha de treino + Dossiê Evolutivo semestral. Parcelado em 6x.',
    'presencial',
    true,
    3,
    NOW()
  ),
  -- Online 1: Trimestral
  (
    'd4000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Consultoria Online Performance Real - Trimestral',
    '248.84',
    '90 dias, plataforma completa + suporte. Parcelado em 3x.',
    'online',
    true,
    4,
    NOW()
  ),
  -- Online 2: Semestral
  (
    'd5000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'Consultoria Online Performance Real - Semestral',
    '206.79',
    '6 meses + grupo com David e equipe + área fitness. Parcelado em 6x. Melhor custo-benefício.',
    'online',
    true,
    5,
    NOW()
  ),
  -- Online 3: Anual
  (
    'd6000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'Consultoria Online Performance Real - Anual',
    '156.27',
    '12 meses, tudo incluso. Parcelado em 12x. Maior transformação.',
    'online',
    true,
    6,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. LOCAIS DE ATENDIMENTO (7 cidades)
-- ============================================================================

INSERT INTO locations (
  id, nutritionist_id, name, city, address, color, modality, is_active, sort_order,
  created_at
) VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Consultório Vila Velha',
    'Vila Velha',
    'Av. Est. José Júlio de Souza, 2100 - Praia de Itaparica - Estudio Essence, Vila Velha/ES',
    'blue',
    'presencial',
    true,
    1,
    NOW()
  ),
  (
    'e2000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Clínica Instituto Oral',
    'Barra de São Francisco',
    'Avenida Edson Henrique Pereira, 206 - Centro, Barra de São Francisco/ES',
    'green',
    'presencial',
    true,
    2,
    NOW()
  ),
  (
    'e3000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Clínica Letícia Magalhães',
    'Domingos Martins',
    'Avenida Presidente Vargas, 628 - Centro, Domingos Martins/ES',
    'purple',
    'presencial',
    true,
    3,
    NOW()
  ),
  (
    'e4000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Instituto Imenni +',
    'Linhares',
    'Avenida Vasco Fernandes Coutinho, 945 - Interlagos, Linhares/ES',
    'orange',
    'presencial',
    true,
    4,
    NOW()
  ),
  (
    'e5000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'Instituto Brenda Carvalho',
    'Nova Venécia',
    'Rua Euríco Sáles, 81 - Nova Venécia/ES',
    'yellow',
    'presencial',
    true,
    5,
    NOW()
  ),
  (
    'e6000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'Clínica Renovalis',
    'São Mateus',
    'Rodovia Othovarino Duarte Santos, 255 - Guriri Sul, São Mateus/ES',
    'red',
    'presencial',
    true,
    6,
    NOW()
  ),
  (
    'e7000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000001',
    'Centro Empresarial da Serra',
    'Serra',
    'Rua Cecília Meireles, 55, sala 1122 - Parque Residencial Laranjeiras, Serra/ES. Estacionamento gratuito - solicitar carimbo do ticket.',
    'teal',
    'presencial',
    true,
    7,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. DISPONIBILIDADE SEMANAL (PADRÃO)
-- ============================================================================
-- Segunda a sexta: 08:00-18:00 com pausa 13:00-14:00, 30 min slots
-- Sábado: 08:00-12:00, 30 min slots (sem pausa)
-- Domingo: 08:00-12:00, 30 min slots

-- Segunda (1)
INSERT INTO availability (
  nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end, location_id,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001', 1, '08:00'::time, '18:00'::time, 30, true, '13:00'::time, '14:00'::time, 'e1000000-0000-0000-0000-000000000001', NOW()
) ON CONFLICT DO NOTHING;

-- Terça (2)
INSERT INTO availability (
  nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end, location_id,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001', 2, '08:00'::time, '18:00'::time, 30, true, '13:00'::time, '14:00'::time, 'e1000000-0000-0000-0000-000000000001', NOW()
) ON CONFLICT DO NOTHING;

-- Quarta (3)
INSERT INTO availability (
  nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end, location_id,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001', 3, '08:00'::time, '18:00'::time, 30, true, '13:00'::time, '14:00'::time, 'e1000000-0000-0000-0000-000000000001', NOW()
) ON CONFLICT DO NOTHING;

-- Quinta (4)
INSERT INTO availability (
  nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end, location_id,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001', 4, '08:00'::time, '18:00'::time, 30, true, '13:00'::time, '14:00'::time, 'e1000000-0000-0000-0000-000000000001', NOW()
) ON CONFLICT DO NOTHING;

-- Sexta (5)
INSERT INTO availability (
  nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end, location_id,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001', 5, '08:00'::time, '18:00'::time, 30, true, '13:00'::time, '14:00'::time, 'e1000000-0000-0000-0000-000000000001', NOW()
) ON CONFLICT DO NOTHING;

-- Sábado (6)
INSERT INTO availability (
  nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end, location_id,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001', 6, '08:00'::time, '12:00'::time, 30, true, NULL, NULL, 'e1000000-0000-0000-0000-000000000001', NOW()
) ON CONFLICT DO NOTHING;

-- Domingo (0)
INSERT INTO availability (
  nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end, location_id,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001', 0, '08:00'::time, '12:00'::time, 30, true, NULL, NULL, 'e1000000-0000-0000-0000-000000000001', NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. DATAS DE ATENDIMENTO POR CIDADE (date_location_overrides)
-- ============================================================================
-- JULHO 2026

INSERT INTO date_location_overrides (nutritionist_id, date, location_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '2026-07-02', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-06', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-07', 'e4000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-08', 'e5000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-09', 'e5000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-10', 'e6000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-11', 'e6000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-13', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-15', 'e2000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-16', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-20', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-21', 'e3000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-23', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-27', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-07-30', 'e1000000-0000-0000-0000-000000000001')
ON CONFLICT (nutritionist_id, date) DO NOTHING;

-- AGOSTO 2026

INSERT INTO date_location_overrides (nutritionist_id, date, location_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '2026-08-03', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-05', 'e2000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-06', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-07', 'e7000000-0000-0000-0000-000000000007'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-10', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-11', 'e4000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-12', 'e5000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-13', 'e5000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-14', 'e6000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-15', 'e6000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-17', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-18', 'e3000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-27', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-08-31', 'e1000000-0000-0000-0000-000000000001')
ON CONFLICT (nutritionist_id, date) DO NOTHING;

-- SETEMBRO 2026

INSERT INTO date_location_overrides (nutritionist_id, date, location_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '2026-09-03', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-04', 'e7000000-0000-0000-0000-000000000007'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-08', 'e4000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-09', 'e5000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-10', 'e5000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-11', 'e6000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-12', 'e6000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-14', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-16', 'e2000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-17', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-21', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-22', 'e3000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-24', 'e1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-28', 'e1000000-0000-0000-0000-000000000001')
ON CONFLICT (nutritionist_id, date) DO NOTHING;

-- ============================================================================
-- 8. RE-HABILITAR TRIGGERS
-- ============================================================================

ALTER TABLE nutritionists ENABLE TRIGGER trg_nutritionists_updated;
ALTER TABLE assistants ENABLE TRIGGER trg_assistants_updated;

-- ============================================================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar dados inseridos com:
SELECT 'Nutricionistas' AS tipo, COUNT(*) as total FROM nutritionists WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Assistentes', COUNT(*) FROM assistants WHERE nutritionist_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'WhatsApp Connections', COUNT(*) FROM whatsapp_connections WHERE nutritionist_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Serviços', COUNT(*) FROM services WHERE nutritionist_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Locais', COUNT(*) FROM locations WHERE nutritionist_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Disponibilidade', COUNT(*) FROM availability WHERE nutritionist_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Date Location Overrides', COUNT(*) FROM date_location_overrides WHERE nutritionist_id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- FIM DO SEED DATA
-- ============================================================================
