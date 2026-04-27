// ─── Real Trinks API response types (fields in Portuguese) ───────────────────

export interface TrinksServicoAPI {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  duracao: number; // minutos
  categoria?: string;
  ativo: boolean;
}

export interface TrinksProfissionalAPI {
  id: number;
  nome: string;
  foto?: string;
  servicos: number[]; // IDs dos serviços
  ativo: boolean;
}

export interface TrinksHorarioDisponivelAPI {
  horario: string; // "HH:MM"
  disponivel: boolean;
}

export interface TrinksDisponibilidadeResponse {
  horarios: TrinksHorarioDisponivelAPI[];
}

export interface TrinksCreateAgendamentoPayload {
  servicoId: number;
  profissionalId: number;
  data: string;   // "YYYY-MM-DD"
  horario: string; // "HH:MM"
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  observacoes?: string;
}

export interface TrinksAgendamentoAPI {
  id: number;
  servicoId: number;
  profissionalId: number;
  data: string;
  horario: string;
  status: 'agendado' | 'confirmado' | 'cancelado' | 'concluido' | 'nao_compareceu';
  clienteNome?: string;
  clienteTelefone?: string;
}

// ─── Amazon SNS Webhook types ─────────────────────────────────────────────────

export interface TrinksSNSConfirmation {
  Type: 'SubscriptionConfirmation';
  SubscribeURL: string;
  Token: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  MessageId: string;
}

export interface TrinksSNSNotification {
  Type: 'Notification';
  TopicArn: string;
  Subject?: string;
  Message: string; // JSON string containing TrinksWebhookPayload
  Timestamp: string;
  MessageId: string;
  Signature?: string;
  SigningCertURL?: string;
}

export type TrinksSNSMessage = TrinksSNSConfirmation | TrinksSNSNotification;

// ─── Trinks Webhook event payload (inside SNS Message) ───────────────────────

export interface TrinksWebhookPayload {
  Action: 'Created' | 'Updated' | 'Cancelled' | 'Completed' | 'NoShow';
  TipoDeEvento: 'Agendamento';
  Agendamento: {
    Id: number;
    Status: string;
    DataHora: string;
    Profissional: { Id: number; Nome: string };
    Servico: { Id: number; Nome: string };
    Cliente: { Id: number; Nome: string; Telefone?: string };
    Observacoes?: string;
  };
}

// ─── Normalized internal types (used by the rest of the app) ─────────────────

export interface TrinksService {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category?: string;
  active: boolean;
}

export interface TrinksProfessional {
  id: string;
  name: string;
  photo?: string;
  services: string[];
  active: boolean;
}

export interface TrinksTimeSlot {
  time: string;
  available: boolean;
}

export interface TrinksCreateAppointmentPayload {
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
}

export interface TrinksAppointment {
  id: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  clientName?: string;
  clientPhone?: string;
}

export interface TrinksWebhookEvent {
  type: 'appointment.created' | 'appointment.updated' | 'appointment.cancelled';
  payload: TrinksAppointment;
  companyId: string;
  timestamp: string;
}
