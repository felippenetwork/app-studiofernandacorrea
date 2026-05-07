import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppointmentsStackParamList, AppointmentStatus, PaymentStatus } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Divider } from '../../components/common';
import { appointmentsService } from '../../services/api/appointments';
import {
  formatCurrency,
  formatDateCalendar,
  appointmentStatusLabel,
  appointmentStatusColor,
  formatDuration,
} from '../../utils/formatters';

type Route = RouteProp<AppointmentsStackParamList, 'AppointmentDetail'>;
type Nav = NativeStackNavigationProp<AppointmentsStackParamList, 'AppointmentDetail'>;

// ─── Status Banner ────────────────────────────────────────────────────────────

const STATUS_META: Record<AppointmentStatus, {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  bg: string;
  fg: string;
}> = {
  pendente_pagamento: {
    icon: 'alert-circle-outline',
    message: 'Aguardando confirmação do pagamento da taxa de reserva.',
    bg: colors.warningLight,
    fg: colors.warning,
  },
  confirmado: {
    icon: 'checkmark-circle-outline',
    message: 'Horário confirmado! Nos vemos em breve.',
    bg: colors.successLight,
    fg: colors.success,
  },
  concluido: {
    icon: 'star-outline',
    message: 'Atendimento realizado com sucesso.',
    bg: colors.primaryGhost,
    fg: colors.primary,
  },
  cancelado: {
    icon: 'close-circle-outline',
    message: 'Este agendamento foi cancelado.',
    bg: colors.errorLight,
    fg: colors.error,
  },
  nao_compareceu: {
    icon: 'time-outline',
    message: 'Não houve comparecimento neste horário.',
    bg: colors.divider,
    fg: colors.textTertiary,
  },
};

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; color: string }> = {
  pendente:    { label: 'Pendente',    color: colors.warning },
  aprovado:    { label: 'Aprovado',    color: colors.success },
  recusado:    { label: 'Recusado',    color: colors.error },
  reembolsado: { label: 'Reembolsado', color: colors.info },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AppointmentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const { data: appointment, isLoading, isError } = useQuery({
    queryKey: ['appointment', params.appointmentId],
    queryFn: () => appointmentsService.getAppointment(params.appointmentId),
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Detalhes" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !appointment) {
    return (
      <View style={styles.container}>
        <Header title="Detalhes" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Não foi possível carregar o agendamento.</Text>
        </View>
      </View>
    );
  }

  const statusMeta = STATUS_META[appointment.status];
  const paymentMeta = PAYMENT_STATUS_META[appointment.paymentStatus];
  const statusColor = appointmentStatusColor(appointment.status);
  const statusLabel = appointmentStatusLabel(appointment.status);

  const infoItems = [
    {
      icon: 'cut-outline' as const,
      label: 'Serviço',
      value: appointment.service.name,
    },
    {
      icon: 'person-outline' as const,
      label: 'Profissional',
      value: appointment.professional.name,
    },
    {
      icon: 'calendar-outline' as const,
      label: 'Data',
      value: formatDateCalendar(appointment.appointmentDate),
    },
    {
      icon: 'time-outline' as const,
      label: 'Horário',
      value: appointment.appointmentTime,
    },
    ...(appointment.service.durationMinutes
      ? [{
          icon: 'hourglass-outline' as const,
          label: 'Duração estimada',
          value: formatDuration(appointment.service.durationMinutes),
        }]
      : []),
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Detalhes"
        subtitle={statusLabel}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusMeta.bg, borderLeftColor: statusColor }]}>
          <Ionicons name={statusMeta.icon} size={20} color={statusMeta.fg} />
          <Text style={[styles.statusMessage, { color: statusMeta.fg }]}>{statusMeta.message}</Text>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          {infoItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
              {index < infoItems.length - 1 && <Divider style={styles.rowDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Payment card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pagamento</Text>
            <View style={[styles.paymentBadge, { backgroundColor: `${paymentMeta.color}18` }]}>
              <Text style={[styles.paymentBadgeText, { color: paymentMeta.color }]}>
                {paymentMeta.label}
              </Text>
            </View>
          </View>

          <Divider style={{ marginBottom: spacing[4] }} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Valor do serviço</Text>
            <Text style={styles.priceValue}>{formatCurrency(appointment.servicePrice)}</Text>
          </View>

          <View style={[styles.priceRow, styles.feeRow]}>
            <View>
              <Text style={styles.priceLabel}>Taxa de reserva</Text>
              <Text style={styles.feeHint}>Já paga · descontada no atendimento</Text>
            </View>
            <Text style={[styles.priceValue, { color: colors.primary }]}>
              {formatCurrency(appointment.bookingFee)}
            </Text>
          </View>

          <Divider style={{ marginVertical: spacing[3] }} />

          <View style={styles.priceRow}>
            <Text style={styles.remainingLabel}>Restante no atendimento</Text>
            <Text style={styles.remainingValue}>{formatCurrency(appointment.remainingAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {!!appointment.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Observações</Text>
            <Divider style={{ marginVertical: spacing[3] }} />
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}

        {/* ID footer */}
        <Text style={styles.idText}>ID: {appointment.id}</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  errorText: { ...textStyles.bodyMedium, color: colors.textTertiary, textAlign: 'center' },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  statusMessage: { ...textStyles.bodyMedium, flex: 1, lineHeight: 22 },

  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  cardTitle: { ...textStyles.h3, color: colors.textPrimary },

  paymentBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 3,
  },
  paymentBadgeText: { ...textStyles.caption, fontWeight: '600' },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3] },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing[3],
  },
  infoText: { flex: 1 },
  infoLabel: {
    ...textStyles.caption, color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
  },
  infoValue: { ...textStyles.bodyMedium, color: colors.textPrimary, textTransform: 'capitalize' },
  rowDivider: { marginLeft: 36 + spacing[3] },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  feeRow: {
    backgroundColor: colors.primaryGhost,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    marginHorizontal: -spacing[1],
    marginBottom: spacing[2],
  },
  priceLabel: { ...textStyles.bodyMedium, color: colors.textSecondary },
  priceValue: { ...textStyles.labelLarge, color: colors.textPrimary },
  feeHint: { ...textStyles.caption, color: colors.textTertiary, marginTop: 2 },
  remainingLabel: { ...textStyles.labelLarge, color: colors.textPrimary },
  remainingValue: { ...textStyles.h2, color: colors.textPrimary },

  notesText: { ...textStyles.bodyMedium, color: colors.textSecondary, lineHeight: 22 },

  idText: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
