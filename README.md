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

### Rodar em desenvolvimento (modo mock — sem backend)

```bash
npx expo start
```

Escanear o QR Code com o Expo Go no celular.

### Rodar conectado ao backend real

1. Criar `mobile-app/.env.local` baseado em `.env.example`
2. Preencher `EXPO_PUBLIC_API_URL` com o IP da máquina (ex: `http://192.168.0.10:3000/api`)
3. Definir `EXPO_PUBLIC_USE_MOCK=false`
4. Rodar `npx expo start`

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api` | URL do backend |
| `EXPO_PUBLIC_USE_MOCK` | `true` | `false` para usar API real |

### Telas disponíveis (17)

| Tela | Rota |
|------|------|
| Splash | AuthStack > Splash |
| Onboarding | AuthStack > Onboarding |
| Login | AuthStack > Login |
| Cadastro | AuthStack > Register |
| Home | Tab: Home |
| Serviços | Tab: Agendar > Services |
| Profissional | Tab: Agendar > Professional |
| Calendário | Tab: Agendar > Schedule |
| Horários | Tab: Agendar > TimeSelection |
| Resumo | Tab: Agendar > Summary |
| Pagamento | Tab: Agendar > Payment |
| Meus Agendamentos | Tab: Horários |
| Cupons | Tab: Cupons |
| Detalhes do Cupom | Tab: Cupons > CouponDetails |
| Benefícios | Tab: Perfil > Benefits |
| Notificações | Tab: Perfil > Notifications |
| Perfil | Tab: Perfil |

---

## Backend API

### Pré-requisitos

- Node.js 18+
- npm 9+
- Supabase account (ou rodar sem Supabase em modo mock)

### Instalação

```bash
cd backend-api
npm install
```

### Configuração

```bash
cp .env.example .env
# Editar .env com suas credenciais
```

**Mínimo para rodar em desenvolvimento (sem Supabase):**

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=qualquer-string-longa-aqui
JWT_REFRESH_SECRET=outra-string-longa-aqui
```

> Sem `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`, o backend usa dados mockados em memória.

### Rodar em desenvolvimento

```bash
npm run dev
```

### Build para produção

```bash
npm run build
npm start
```

### Endpoints da API

#### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro de cliente |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Renovar token |
| POST | `/api/auth/logout` | Logout |

#### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/users/me` | Perfil da usuária |
| PATCH | `/api/users/me` | Atualizar perfil |
| POST | `/api/users/me/push-token` | Registrar push token |

#### Agendamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/appointments/me` | Meus agendamentos |
| POST | `/api/appointments` | Criar agendamento |
| PATCH | `/api/appointments/:id/cancel` | Cancelar |
| GET | `/api/appointments/available-slots` | Horários disponíveis |

#### Trinks
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/trinks/services` | Lista de serviços |
| GET | `/api/trinks/professionals` | Lista de profissionais |
| POST | `/api/trinks/webhooks` | Webhook Trinks |

#### Cupons
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/coupons` | Cupons disponíveis |
| POST | `/api/coupons/validate` | Validar cupom |
| POST | `/api/coupons/redeem` | Resgatar cupom |

#### Benefícios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/benefits` | Lista de benefícios |

#### Pagamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/payments/booking-fee` | Pagar taxa de reserva (R$40) |
| POST | `/api/payments/webhook` | Webhook Mercado Pago |

#### Notificações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notifications` | Minhas notificações |
| PATCH | `/api/notifications/:id/read` | Marcar como lida |

---

## Banco de Dados (Supabase)

### Setup inicial

1. Criar projeto no [Supabase](https://supabase.com)
2. Acessar **SQL Editor** no painel
3. Executar `backend-api/src/database/schema.sql`
4. Executar `backend-api/src/database/seed.sql` (dados iniciais)

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Clientes cadastradas |
| `services` | Serviços do estúdio |
| `professionals` | Profissionais |
| `appointments` | Agendamentos |
| `payments` | Pagamentos (taxa de reserva R$40) |
| `coupons` | Cupons de desconto |
| `coupon_redemptions` | Resgates de cupons |
| `benefits` | Benefícios e promoções |
| `push_tokens` | Tokens para push notifications |
| `trinks_webhook_events` | Log de eventos Trinks |

---

## Integrações Externas

### Trinks (agendamento)

Configure em `.env`:

```env
TRINKS_API_URL=https://api.trinks.com
TRINKS_API_KEY=sua-chave-aqui
TRINKS_COMPANY_ID=seu-id-aqui
```

> Sem essas variáveis, o backend usa dados mockados automaticamente.

### Mercado Pago (pagamentos)

Configure em `.env`:

```env
MP_ACCESS_TOKEN=seu-access-token
MP_PUBLIC_KEY=sua-public-key
MP_WEBHOOK_SECRET=seu-webhook-secret
```

> Sem o `MP_ACCESS_TOKEN`, o pagamento é simulado (aprovado instantaneamente).

---

## Fluxo de Agendamento

```
Cliente escolhe serviço
        ↓
Escolhe profissional
        ↓
Escolhe data no calendário
        ↓
Escolhe horário disponível (via Trinks)
        ↓
Revisa resumo (preço serviço + taxa R$40)
        ↓
Paga a taxa de reserva R$40 (Mercado Pago)
        ↓
Agendamento confirmado no Trinks
        ↓
Cliente recebe push notification de confirmação
        ↓
No dia do serviço: paga o restante presencialmente
```

---

## Tecnologias

### Mobile
- React Native + Expo SDK
- TypeScript
- React Navigation v6
- Zustand (estado global)
- TanStack Query v5 (cache e sincronização)
- Axios (HTTP)
- Expo Notifications

### Backend
- Node.js + Express
- TypeScript
- Supabase (PostgreSQL)
- JWT (jsonwebtoken)
- bcryptjs
- Zod (validação)
- Axios (cliente Trinks)

---

## Desenvolvimento

### Scripts úteis

```bash
# Mobile — iniciar Expo
cd mobile-app && npx expo start

# Mobile — TypeScript check
cd mobile-app && npx tsc --noEmit

# Backend — dev com hot reload
cd backend-api && npm run dev

# Backend — build
cd backend-api && npm run build

# Backend — TypeScript check
cd backend-api && npx tsc --noEmit
```

### Convenções

- Commits em português, imperativo: "Adiciona tela de perfil"
- Branch principal: `main`
- Feature branches: `feature/nome-da-feature`
- Todo código backend em TypeScript estrito
- Validação de inputs com Zod em todos os endpoints
