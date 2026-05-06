import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button, Divider, Card } from '../../components/common';
import { useBookingStore } from '../../store/bookingStore';
import { formatCurrency, formatDateCalendar } from '../../utils/formatters';
import { BOOKING_FEE } from '../../mocks/data';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'AppointmentSummary'>;

export function AppointmentSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedService, selectedVariation, selectedProfessional, selectedDate, selectedTime } = useBookingStore();

  if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
    return null;
  }

  const servicePrice = selectedVariation?.price ?? selectedService.price;
  const remainingAmount = servicePrice - BOOKING_FEE;

  const serviceName = selectedVariation
    ? `${selectedService.name} · ${selectedVariation.name}`
    : selectedService.name;

  const infoItems = [
    { icon: 'cut-outline' as const, label: 'Serviço', value: serviceName },
    { icon: 'person-outline' as const, label: 'Profissional', value: selectedProfessional.name },
    {
      icon: 'calendar-outline' as const,
      label: 'Data',
      value: formatDateCalendar(selectedDate),
    },
    { icon: 'time-outline' as const, label: 'Horário', value: selectedTime },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Resumo"
        subtitle="Confirme seu agendamento"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <Card style={styles.infoCard} shadow="sm">
          {infoItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.infoTextBlock}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
              {index < infoItems.length - 1 && <Divider style={styles.rowDivider} />}
            </React.Fragment>
          ))}
        </Card>

        {/* Payment breakdown */}
        <Card style={styles.priceCard} shadow="sm">
          <Text style={styles.priceCardTitle}>Detalhes do Pagamento</Text>
          <Divider style={{ marginBottom: spacing[4] }} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Valor do serviço</Text>
            <Text style={styles.priceValue}>{formatCurrency(servicePrice)}</Text>
          </View>

          <View style={[styles.priceRow, styles.priceRowHighlight]}>
            <View style={styles.feeLabelBlock}>
              <Text style={styles.priceLabel}>Taxa de reserva</Text>
              <Text style={styles.feeHint}>Descontada no atendimento</Text>
            </View>
            <Text style={[styles.priceValue, styles.feeValue]}>{formatCurrency(BOOKING_FEE)}</Text>
          </View>

          <Divider style={{ marginVertical: spacing[3] }} />

          <View style={styles.priceRow}>
            <Text style={styles.remainingLabel}>Restante no atendimento</Text>
            <Text style={styles.remainingValue}>{formatCurrency(remainingAmount)}</Text>
          </View>
        </Card>

        {/* Notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <Text style={styles.noticeText}>
            A taxa de R$ {BOOKING_FEE},00 garante seu horário e é descontada do valor total no dia do atendimento.
          </Text>
        </View>

        <Button
          label={`Pagar taxa de reserva · ${formatCurrency(BOOKING_FEE)}`}
          onPress={() => navigation.navigate('Payment')}
          style={styles.cta}
        />

        <Button
          label="Voltar e editar"
          onPress={() => navigation.goBack()}
          variant="ghost"
          style={styles.backBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
  },
  infoCard: {
    marginBottom: spacing[4],
    padding: 0,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  rowDivider: {
    marginLeft: 52 + spacing[3],
  },
  priceCard: {
    marginBottom: spacing[4],
  },
  priceCardTitle: {
    ...textStyles.h3,
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  priceRowHighlight: {
    backgroundColor: colors.primaryGhost,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    marginHorizontal: -spacing[1],
    marginBottom: spacing[2],
  },
  priceLabel: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
  },
  priceValue: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
  },
  feeLabelBlock: {
    flex: 1,
  },
  feeHint: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  feeValue: {
    color: colors.primary,
  },
  remainingLabel: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
  },
  remainingValue: {
    ...textStyles.h1,
    color: colors.textPrimary,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    marginBottom: spacing[5],
  },
  noticeText: {
    ...textStyles.bodySmall,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
  cta: {
    marginBottom: spacing[3],
  },
  backBtn: {
    marginBottom: spacing[2],
  },
});
