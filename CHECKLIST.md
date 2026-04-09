# Studio Fernanda Correa — QA & Launch Checklist

> Use this checklist before every production deploy and before submitting to the App Store / Google Play.

---

## 1. Backend — Configuração de Ambiente

- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` com pelo menos 32 chars (produção)
- [ ] `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` configurados
- [ ] `MP_ACCESS_TOKEN` de produção configurado (não sandbox)
- [ ] `MP_WEBHOOK_SECRET` configurado e testado
- [ ] `API_BASE_URL` apontando para o domínio público (para webhooks do MP)
- [ ] `TRINKS_API_URL`, `TRINKS_API_KEY`, `TRINKS_COMPANY_ID` configurados
- [ ] `TRINKS_WEBHOOK_SECRET` configurado
- [ ] `ALLOWED_ORIGINS` contém apenas os domínios autorizados
- [ ] `NODE_ENV=production`

---

## 2. Backend — Segurança

- [ ] `helmet()` ativo e cabeçalhos de segurança presentes nas respostas
- [ ] Rate limiting global (120 req/min) funcional
- [ ] Rate limiting de auth (20 req/15min) funcional — testar com bruteforce
- [ ] CORS rejeita origens não autorizadas
- [ ] Stack traces não expostos em produção (`NODE_ENV=production`)
- [ ] Senhas armazenadas com bcrypt 12 rounds
- [ ] Tokens JWT expiram corretamente (7d access, 30d refresh)
- [ ] Endpoint de webhook valida assinatura antes de processar
- [ ] SQL injection impossível (Supabase SDK + Zod validation)

---

## 3. Backend — Endpoints (Smoke Tests)

### Auth
- [ ] `POST /api/auth/register` — cria usuário, retorna tokens
- [ ] `POST /api/auth/login` — autentica, retorna tokens
- [ ] `POST /api/auth/refresh` — renova access token
- [ ] `POST /api/auth/logout` — invalida refresh token
- [ ] `GET /api/auth/me` — retorna dados do usuário autenticado

### Agendamentos
- [ ] `GET /api/appointments/me` — lista agendamentos do usuário
- [ ] `POST /api/appointments` — cria agendamento
- [ ] `GET /api/appointments/:id` — busca agendamento por ID
- [ ] `PATCH /api/appointments/:id/cancel` — cancela agendamento

### Serviços & Profissionais
- [ ] `GET /api/services` — lista serviços ativos
- [ ] `GET /api/professionals` — lista profissionais ativos
- [ ] `GET /api/slots` — retorna horários disponíveis

### Pagamentos
- [ ] `POST /api/payments/booking-fee` — gera cobrança PIX (retorna QR code)
- [ ] `POST /api/payments/webhook` — processa confirmação do MP
- [ ] `POST /api/payments/:id/refund` — reembolsa pagamento

### Cupons & Benefícios
- [ ] `GET /api/coupons` — lista cupons ativos
- [ ] `GET /api/coupons/:id` — busca cupom por ID
- [ ] `GET /api/benefits` — lista benefícios ativos

### Notificações
- [ ] `GET /api/notifications` — lista notificações do usuário
- [ ] `PATCH /api/notifications/:id/read` — marca como lida
- [ ] `PATCH /api/notifications/read-all` — marca todas como lidas
- [ ] `POST /api/notifications/register-token` — registra token Expo
- [ ] `DELETE /api/notifications/register-token` — remove token

### Health
- [ ] `GET /health` — retorna status das integrações (supabase, trinks, mercadopago)

---

## 4. Backend — Integrações

### Supabase
- [ ] Schema aplicado (`schema.sql`) sem erros
- [ ] Row Level Security (RLS) configurado para tabelas de usuário
- [ ] Backup automático ativo no painel Supabase

### Mercado Pago
- [ ] Testar fluxo PIX completo: criar → pagar → webhook → confirmar
- [ ] Webhook URL registrada no painel do MP: `{API_BASE_URL}/api/payments/webhook`
- [ ] Testar reembolso
- [ ] Certificar que Access Token é de **produção** (não `APP_USR-...TEST-...`)

### Trinks
- [ ] Agendamento criado no app sincroniza com Trinks
- [ ] Cancelamento sincroniza com Trinks
- [ ] Webhook do Trinks processa atualizações de status
- [ ] Fallback funciona quando Trinks indisponível (não quebra o fluxo)

### Push Notifications
- [ ] Token Expo registrado no login
- [ ] Token desativado no logout
- [ ] Notificação de confirmação de agendamento recebida no dispositivo
- [ ] Notificação de cancelamento recebida
- [ ] Lembrete de horário funcional (se configurado via cron/scheduler)

---

## 5. Mobile App — Fluxo de Agendamento (E2E)

- [ ] Selecionar serviço → avançar para seleção de profissional
- [ ] Selecionar profissional → avançar para seleção de data/hora
- [ ] Slots carregam corretamente e exibem somente horários disponíveis
- [ ] Selecionar data sem slots → mensagem "Escolha outra data"
- [ ] Avançar para pagamento → taxa de R$40 exibida
- [ ] Selecionar **PIX** → confirmar → QR Code exibido + código copia-e-cola
- [ ] Copiar código PIX funciona (Clipboard)
- [ ] Selecionar **Cartão** → confirmar → alert de confirmação
- [ ] Coupon aplicado aparece na tela de pagamento
- [ ] Após confirmar → cache de agendamentos invalidado

---

## 6. Mobile App — Meus Agendamentos

- [ ] Lista carrega agendamentos reais do backend
- [ ] Pull-to-refresh atualiza a lista
- [ ] Banner amarelo para agendamentos com `paymentStatus: pendente_pagamento`
- [ ] Cancelar agendamento → confirmação via Alert → remove da lista
- [ ] Estado vazio exibido quando sem agendamentos
- [ ] Estado de erro com opção de tentar novamente

---

## 7. Mobile App — Cupons & Benefícios

- [ ] Lista de cupons carrega com categorias/filtros
- [ ] Badge com contagem de cupons ativos
- [ ] Tela de detalhe do cupom exibe regras e botão de copiar código
- [ ] Benefícios carregam e exibem corretamente
- [ ] Pull-to-refresh funciona em ambas as telas

---

## 8. Mobile App — Auth

- [ ] Cadastro com validação de campos
- [ ] Login → tokens armazenados com segurança
- [ ] Logout → tokens limpos, token push desativado
- [ ] Navegação protegida: telas autenticadas redirecionam para login se não autenticado
- [ ] Refresh automático de token funcional (interceptor Axios)
- [ ] Erros de auth (401) redirecionam para login

---

## 9. Mobile App — UX/UI

- [ ] Loading states em todas as telas com dados assíncronos
- [ ] Estados de erro com mensagem amigável
- [ ] Estados vazios com ícone e texto explicativo
- [ ] Fontes carregam corretamente antes do splash
- [ ] Splash screen exibida com backgroundColor correto (#F8F5F2)
- [ ] Teclado não sobrepõe campos de input (KeyboardAvoidingView)
- [ ] ScrollView com padding suficiente no bottom (safe area)
- [ ] Animações suaves (sem jank perceptível)

---

## 10. Mobile App — Notificações Push

- [ ] Permissão solicitada na primeira abertura após login
- [ ] Token registrado no backend após concessão de permissão
- [ ] Notificação recebida com app em foreground (banner)
- [ ] Notificação recebida com app em background
- [ ] Notificação recebida com app fechado (cold start)

---

## 11. Build & Publicação

### EAS Build
- [ ] `eas.json` configurado com perfis `development`, `preview`, `production`
- [ ] `app.json` com `projectId` do EAS preenchido
- [ ] Build de preview testado em dispositivo físico (iOS e Android)
- [ ] Build de produção gerado sem erros

### iOS (App Store)
- [ ] Ícone 1024x1024 sem transparência
- [ ] Splash screen configurado
- [ ] Permissões com descrição em `infoPlist` (câmera, galeria, notificações)
- [ ] `bundleIdentifier`: `com.studiofernandacorrea.app`
- [ ] Versão e build number incrementados
- [ ] Testflight: build enviado e aprovado por beta testers
- [ ] Screenshots em todos os tamanhos obrigatórios
- [ ] Texto de privacidade configurado no App Store Connect

### Android (Google Play)
- [ ] Ícone adaptativo configurado (`adaptive-icon.png`)
- [ ] `package`: `com.studiofernandacorrea.app`
- [ ] `versionCode` incrementado
- [ ] Permissões declaradas no `android.permissions`
- [ ] APK/AAB testado em dispositivo físico
- [ ] Internal testing track configurado no Google Play Console
- [ ] Screenshots em todos os tamanhos obrigatórios

---

## 12. Pós-Deploy

- [ ] Smoke tests em produção (endpoints críticos)
- [ ] Monitoramento de erros configurado (ex: Sentry)
- [ ] Logs do servidor revisados nas primeiras horas
- [ ] Webhook do Mercado Pago disparando e sendo processado
- [ ] Notificações push chegando a dispositivos reais
- [ ] Confirmar que `USE_MOCK=false` no ambiente de produção
- [ ] README atualizado com instruções de deploy

---

*Última atualização: ETAPA 4 — Produção*
