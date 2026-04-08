# Studio Fernanda Correa — App

Aplicativo mobile de agendamento de serviços de beleza para o Studio Fernanda Correa.

## Estrutura do Projeto

```
app-studiofernandacorrea/
├── mobile-app/        # React Native + Expo (TypeScript)
└── backend-api/       # Node.js + Express + Supabase (TypeScript)
```

---

## Mobile App

### Pré-requisitos

- Node.js 18+
- npm 9+
- [Expo Go](https://expo.dev/client) instalado no celular

### Instalação

```bash
cd mobile-app
npm install
```

### Rodar em modo mock (sem backend)

```bash
npx expo start
```

Escanear o QR Code com o Expo Go. Todos os dados são locais — nenhuma configuração extra necessária.

### Ligar/desligar mocks

| Arquivo | Variável | Valor | Efeito |
|---------|----------|-------|--------|
| `mobile-app/.env.local` | `EXPO_PUBLIC_USE_MOCK` | `true` | Dados locais (padrão) |
| `mobile-app/.env.local` | `EXPO_PUBLIC_USE_MOCK` | `false` | API real |

### Conectar ao backend real

1. Copiar: `cp mobile-app/.env.example mobile-app/.env.local`
2. Editar `EXPO_PUBLIC_API_URL` com o IP da sua máquina (ex: `http://192.168.0.10:3000/api`)
3. Definir `EXPO_PUBLIC_USE_MOCK=false`
4. Rodar: `npx expo start`

> O celular e o computador precisam estar na mesma rede Wi-Fi.

---

## Backend API

### Pré-requisitos

- Node.js 18+

### Instalação

```bash
cd backend-api
npm install
```

### Configuração mínima (sem integrações externas)

```bash
cp backend-api/.env.example backend-api/.env
```

Edite o `.env` com pelo menos:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=qualquer-string-secreta-longa
JWT_REFRESH_SECRET=outra-string-secreta-longa
```

Sem `SUPABASE_URL`, o backend usa dados em memória. Sem `TRINKS_API_KEY`, usa horários mockados. Sem `MP_ACCESS_TOKEN`, os pagamentos são simulados automaticamente.

### Rodar

```bash
cd backend-api
npm run dev      # desenvolvimento com hot reload
npm run build    # build de produção
npm start        # rodar build de produção
```

---

## Configurar Supabase

1. Criar projeto em [supabase.com](https://supabase.com)
2. Acessar **SQL Editor** no painel
3. Executar `backend-api/src/database/schema.sql`
4. Executar `backend-api/src/database/seed.sql` (dados iniciais)
5. Copiar **URL** e **service_role key** para o `.env`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key
```

### O que é persistido no banco

| Tabela | Dados |
|--------|-------|
| `users` | Clientes cadastradas |
| `services` | Serviços do estúdio |
| `professionals` | Profissionais |
| `appointments` | Agendamentos |
| `payments` | Pagamentos (taxa R$40) |
| `coupons` | Cupons de desconto |
| `coupon_redemptions` | Histórico de resgates |
| `benefits` | Benefícios e campanhas |
| `push_tokens` | Tokens para push notifications |
| `trinks_webhook_events` | Log de eventos Trinks |

---

## Configurar Trinks

```env
TRINKS_API_URL=https://api.trinks.com
TRINKS_API_KEY=sua-chave-aqui
TRINKS_COMPANY_ID=seu-id-aqui
```

Sem essas variáveis, o backend usa serviços, profissionais e slots mockados.
O app mobile **nunca** acessa a Trinks diretamente — sempre via backend.

---

## Configurar Mercado Pago

```env
MP_ACCESS_TOKEN=seu-access-token
MP_PUBLIC_KEY=sua-public-key
MP_WEBHOOK_SECRET=seu-webhook-secret
```

Sem `MP_ACCESS_TOKEN`, os pagamentos são **simulados** com aprovação instantânea — ideal para desenvolvimento e testes.

---

## Fluxo completo de agendamento

```
1. Cliente escolhe o serviço
2. Escolhe a profissional
3. Escolhe a data no calendário
4. Escolhe o horário disponível  ← consultado via Trinks
5. Revisa o resumo:
   - Valor do serviço: R$ X,00
   - Taxa de reserva:  R$ 40,00  ← paga agora
   - Restante no dia:  R$ X-40   ← pago presencialmente
6. Seleciona forma de pagamento (Pix / crédito / débito)
7. Paga R$40 via Mercado Pago    ← ou simulado em dev
8. Agendamento confirmado no Trinks
9. Push notification de confirmação enviada
10. No dia: paga o restante presencialmente
```

---

## Endpoints da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Renovar token |
| POST | `/api/auth/logout` | Logout |

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/users/me` | Meu perfil |
| PATCH | `/api/users/me` | Atualizar perfil |
| POST | `/api/users/me/push-token` | Registrar push token |

### Agendamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/appointments/me` | Meus agendamentos |
| GET | `/api/appointments/:id` | Detalhes |
| POST | `/api/appointments` | Criar agendamento |
| PATCH | `/api/appointments/:id/cancel` | Cancelar |
| GET | `/api/appointments/available-slots` | Horários disponíveis |

### Trinks (serviços e profissionais)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/trinks/services` | Lista de serviços |
| GET | `/api/trinks/professionals` | Lista de profissionais |
| POST | `/api/trinks/webhooks` | Webhook Trinks |

### Pagamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/payments/booking-fee` | Pagar taxa R$40 |
| POST | `/api/payments/webhook` | Webhook Mercado Pago |

### Cupons
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/coupons` | Listar cupons |
| GET | `/api/coupons/:id` | Detalhes do cupom |
| POST | `/api/coupons/validate` | Validar código |
| POST | `/api/coupons/redeem` | Resgatar cupom |

### Benefícios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/benefits` | Listar benefícios |

### Notificações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notifications` | Minhas notificações |
| PATCH | `/api/notifications/:id/read` | Marcar como lida |
| POST | `/api/notifications/register-token` | Registrar push token |
| DELETE | `/api/notifications/register-token` | Remover token |

---

## Status dos agendamentos

| Status | Descrição |
|--------|-----------|
| `pendente_pagamento` | Criado, aguardando taxa de reserva |
| `confirmado` | Taxa paga, horário garantido |
| `cancelado` | Cancelado pela cliente ou sistema |
| `concluido` | Atendimento realizado |
| `nao_compareceu` | Cliente não compareceu |

---

## Tecnologias

### Mobile
- React Native + Expo SDK
- TypeScript
- React Navigation v6
- Zustand (estado global)
- TanStack Query v5 (cache e sincronização com pull-to-refresh)
- Axios (HTTP + interceptors de auth e 401)
- Expo Notifications (push tokens)

### Backend
- Node.js + Express + TypeScript
- Supabase (PostgreSQL) com fallback em memória
- JWT (access 7d + refresh 30d)
- bcryptjs (12 rounds)
- Zod (validação de todos os inputs)
- Axios (cliente Trinks)

---

## Scripts úteis

```bash
# Mobile
cd mobile-app
npx expo start           # iniciar dev server
npx tsc --noEmit         # verificar TypeScript

# Backend
cd backend-api
npm run dev              # hot reload
npm run build            # compilar
npx tsc --noEmit         # verificar TypeScript
```

---

## Matriz de modos de operação

| Cenário | Supabase | Trinks | Mercado Pago | Comportamento |
|---------|----------|--------|--------------|---------------|
| Dev local | ✗ | ✗ | ✗ | Tudo mockado em memória |
| Staging | ✓ | ✗ | ✗ | DB real, slots mock, pagamento simulado |
| Produção | ✓ | ✓ | ✓ | Fluxo completo real |
