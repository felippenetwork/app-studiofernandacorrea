import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appointment } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import {
  formatDateRelative,
  formatCurrency,
  appointmentStatusLabel,
  appointmentStatusColor,
} from '../../utils/formatters';
import { Badge } from './Badge';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress?: () => void;
}

export function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const statusColor = appointmentStatusColor(appointment.status);
  const statusLabel = appointmentStatusLabel(appointment.status);

  const badgeVariant =
    appointment.status === 'confirmado' ? 'success'
    : appointment.status === 'pendente_pagamento' ? 'warning'
    : appointment.status === 'cancelado' ? 'error'
    : appointment.status === 'concluido' ? 'primary'
    : 'neutral';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.card}
    >
      <View style={[styles.accent, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.serviceName}>{appointment.service.name}</Text>
          <Badge label={statusLabel} variant={badgeVariant} />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.infoText}>{appointment.professional.name}</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.infoText}>
              {formatDateRelative(appointment.appointmentDate)} · {appointment.appointmentTime}
            </Text>
          </View>
          <Text style={styles.price}>{formatCurrency(appointment.servicePrice)}</Text>
        </View>

        {appointment.status === 'pendente_pagamento' && (
          <View style={styles.paymentBanner}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
            <Text style={styles.paymentBannerText}>
              Taxa de reserva pendente · {formatCurrency(appointment.bookingFee)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  serviceName: {
    ...textStyles.h3,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  infoText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  price: {
    ...textStyles.labelMedium,
    color: colors.primary,
  },
  paymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.sm,
    padding: spacing[2],
  },
  paymentBannerText: {
    ...textStyles.caption,
    color: colors.warning,
  },
});
