-- Insere template de retenção de 15 dias com variável {{servico}}
INSERT INTO whatsapp_templates (trigger, name, message, is_active, delay_days)
VALUES (
  'retencao_15',
  'Retenção 15 dias',
  'Olá, {{nome}}! 💅 Está chegando a hora de renovar o seu {{servico}}. Que tal já garantir o seu horário? Estamos te esperando! 🌸',
  false,
  15
)
ON CONFLICT (trigger) DO NOTHING;
