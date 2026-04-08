-- Studio Fernanda Correa — Seed Data
-- Run AFTER schema.sql
-- Compatible with Supabase (PostgreSQL)

-- ─── Services ────────────────────────────────────────────────────────────────

INSERT INTO services (id, trinks_service_id, name, description, price, duration_minutes, category, is_active) VALUES
  ('11111111-0001-0000-0000-000000000001', 'svc-1', 'Corte Feminino',         'Corte exclusivo com lavagem e finalização profissional.',                    120.00, 60,  'cabelo',      TRUE),
  ('11111111-0002-0000-0000-000000000001', 'svc-2', 'Coloração',              'Tintura completa com produtos de alta qualidade.',                           280.00, 180, 'cabelo',      TRUE),
  ('11111111-0003-0000-0000-000000000001', 'svc-3', 'Mechas / Luzes',         'Técnica de iluminação personalizada para cada tipo de cabelo.',              350.00, 210, 'cabelo',      TRUE),
  ('11111111-0004-0000-0000-000000000001', 'svc-4', 'Manicure & Pedicure',    'Cuidado completo para mãos e pés com esmaltes premium.',                     90.00,  90,  'unhas',       TRUE),
  ('11111111-0005-0000-0000-000000000001', 'svc-5', 'Alongamento de Unhas',   'Unhas perfeitas em gel ou fibra, com design personalizado.',                 180.00, 120, 'unhas',       TRUE),
  ('11111111-0006-0000-0000-000000000001', 'svc-6', 'Design de Sobrancelhas', 'Design e definição para valorizar o seu olhar.',                              60.00,  45,  'sobrancelha', TRUE),
  ('11111111-0007-0000-0000-000000000001', 'svc-7', 'Maquiagem Social',       'Make profissional para eventos, formaturas e ocasiões especiais.',           200.00,  90,  'maquiagem',   TRUE),
  ('11111111-0008-0000-0000-000000000001', 'svc-8', 'Limpeza de Pele',        'Higienização profunda e hidratação para uma pele renovada e saudável.',      160.00,  75,  'estetica',    TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─── Professionals ───────────────────────────────────────────────────────────

INSERT INTO professionals (id, trinks_employee_id, name, specialties, bio, rating, review_count, is_active) VALUES
  (
    '22222222-0001-0000-0000-000000000001',
    'pro-1',
    'Fernanda Correa',
    ARRAY['Corte Feminino', 'Coloração', 'Mechas / Luzes'],
    'Fundadora do estúdio, com mais de 12 anos de experiência em técnicas de coloração e corte. Especialista em cabelos cacheados.',
    5.0, 128, TRUE
  ),
  (
    '22222222-0002-0000-0000-000000000001',
    'pro-2',
    'Isabela Matos',
    ARRAY['Manicure & Pedicure', 'Alongamento de Unhas'],
    'Especialista em nail art e técnicas de alongamento. Apaixonada por criar designs únicos para cada cliente.',
    4.9, 87, TRUE
  ),
  (
    '22222222-0003-0000-0000-000000000001',
    'pro-3',
    'Camila Souza',
    ARRAY['Design de Sobrancelhas', 'Maquiagem Social', 'Limpeza de Pele'],
    'Maquiadora profissional e esteticista certificada. Especialista em maquiagem para noivas e eventos.',
    4.8, 64, TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Coupons ─────────────────────────────────────────────────────────────────

INSERT INTO coupons (
  id, code, title, description, discount_type, discount_value,
  min_order_value, max_usages, valid_from, valid_until, status, rules
) VALUES
  (
    '33333333-0001-0000-0000-000000000001',
    'BEMVINDA10',
    '10% de desconto — Primeira visita',
    'Ganhe 10% de desconto no seu primeiro serviço no Studio Fernanda Correa.',
    'percentage', 10.00,
    80.00, 100,
    '2025-01-01', '2025-12-31',
    'ativo',
    ARRAY[
      'Válido apenas para novos clientes',
      'Não cumulativo com outras promoções',
      'Válido para serviços acima de R$ 80,00',
      'Válido por 12 meses a partir da primeira visita'
    ]
  ),
  (
    '33333333-0002-0000-0000-000000000001',
    'ANIVER30',
    'R$30 no seu aniversário',
    'Presente especial de aniversário: R$30 de desconto em qualquer serviço.',
    'fixed', 30.00,
    100.00, NULL,
    '2025-01-01', '2025-12-31',
    'ativo',
    ARRAY[
      'Válido somente no mês do seu aniversário',
      'Aplicável a qualquer serviço',
      'Um uso por cliente por ano',
      'Não transferível'
    ]
  ),
  (
    '33333333-0003-0000-0000-000000000001',
    'PACOTECABELO',
    'Pacote Cabelo Completo — 15% off',
    'Agende corte + coloração ou mechas e economize 15% no total.',
    'percentage', 15.00,
    250.00, 50,
    '2025-04-01', '2025-06-30',
    'ativo',
    ARRAY[
      'Válido para combo: corte + coloração ou corte + mechas',
      'Ambos os serviços devem ser agendados na mesma visita',
      'Desconto aplicado sobre o valor total da combinação',
      'Limitado a 50 resgates'
    ]
  ),
  (
    '33333333-0004-0000-0000-000000000001',
    'INDICACAO20',
    'Indique uma amiga — R$20 off',
    'Indicou uma amiga e ela fez o primeiro agendamento? Você ganha R$20 no próximo serviço.',
    'fixed', 20.00,
    NULL, NULL,
    '2025-01-01', '2025-12-31',
    'ativo',
    ARRAY[
      'Crédito liberado após a amiga indicada concluir o primeiro serviço',
      'Sem valor mínimo de pedido',
      'Válido por 6 meses após a liberação',
      'Pode ser acumulado com outros cupons de desconto fixo'
    ]
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Benefits ────────────────────────────────────────────────────────────────

INSERT INTO benefits (id, title, description, type, cta, valid_until, is_active, sort_order) VALUES
  (
    '44444444-0001-0000-0000-000000000001',
    'Programa Fidelidade',
    'A cada 10 serviços realizados, o 11º é por nossa conta! Acumule seus carimbos e aproveite este presente exclusivo.',
    'exclusivo',
    'Ver meus pontos',
    NULL,
    TRUE, 1
  ),
  (
    '44444444-0002-0000-0000-000000000001',
    'Semana do Cabelo — Abril',
    'Durante todo o mês de abril, Coloração e Mechas com 20% de desconto. Renove seu visual com preço especial!',
    'promocao',
    'Agendar agora',
    '2025-04-30',
    TRUE, 2
  ),
  (
    '44444444-0003-0000-0000-000000000001',
    'Workshop: Cuidados com Cachos',
    'Participe do nosso workshop exclusivo sobre cuidados e definição de cachos com a Fernanda. Vagas limitadas.',
    'evento',
    'Garantir minha vaga',
    '2025-05-15',
    TRUE, 3
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Admin test user (password: Admin@123) ────────────────────────────────────
-- bcrypt hash generated with 12 rounds — change in production!
-- DO NOT use this in production without resetting the password.

INSERT INTO users (id, name, email, phone, password_hash) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Admin Studio',
    'admin@studiofernandacorrea.com.br',
    '(11) 99999-0000',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFykNdFkIinb9k2'  -- Admin@123
  )
ON CONFLICT (id) DO NOTHING;
