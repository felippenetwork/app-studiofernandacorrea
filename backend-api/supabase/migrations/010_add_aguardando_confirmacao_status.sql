-- Add 'aguardando_confirmacao' to appointments status constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'pendente_pagamento',
    'confirmado',
    'cancelado',
    'concluido',
    'nao_compareceu',
    'aguardando_confirmacao'
  ));
