import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookingStackParamList, Service } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { Header, Button, Divider, Card } from '../../components/common';
import { useBookingStore } from '../../store/bookingStore';
import { formatCurrency, formatDateCalendar } from '../../utils/formatters';

function calcBookingFee(service: Service, servicePrice: number): number {
  if (service.bookingFeeType === 'percentage' && service.bookingFeeValue != null) {
    return Math.round(servicePrice * service.bookingFeeValue) / 100;
  }
  return service.bookingFeeValue ?? 40;
}

type Nav = NativeStackNavigationProp<BookingStackParamList, 'AppointmentSummary'>;

// ─── Terms Modal ──────────────────────────────────────────────────────────────

function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Política de Cancelamento</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.termSection}>
            <View style={styles.termIconRow}>
              <View style={[styles.termIconBadge, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <Text style={styles.termSectionTitle}>Cancelamento com mais de 12 horas</Text>
            </View>
            <Text style={styles.termSectionBody}>
              Se você cancelar seu agendamento com{' '}
              <Text style={styles.termBold}>mais de 12 horas de antecedência</Text>, a taxa de
              reserva será{' '}
              <Text style={[styles.termBold, { color: colors.success }]}>devolvida integralmente</Text>{' '}
              ao seu método de pagamento original.
            </Text>
          </View>

          <Divider style={{ marginVertical: spacing[4] }} />

          <View style={styles.termSection}>
            <View style={styles.termIconRow}>
              <View style={[styles.termIconBadge, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </View>
              <Text style={styles.termSectionTitle}>Cancelamento com menos de 12 horas</Text>
            </View>
            <Text style={styles.termSectionBody}>
              Se você cancelar com{' '}
              <Text style={styles.termBold}>menos de 12 horas de antecedência</Text>, a taxa de
              reserva{' '}
              <Text style={[styles.termBold, { color: colors.error }]}>não será reembolsada</Text>.
              Isso cobre o tempo reservado pela profissional em seu atendimento.
            </Text>
          </View>

          <Divider style={{ marginVertical: spacing[4] }} />

          <View style={styles.termNote}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.termNoteText}>
              A taxa de reserva é sempre descontada do valor total do serviço no dia do
              atendimento. Você nunca paga mais do que o preço combinado.
            </Text>
          </View>

          <Button label="Entendi" onPress={onClose} style={styles.modalCta} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AppointmentSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedService, selectedVariation, selectedProfessional, selectedDate, selectedTime } = useBookingStore();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
    return null;
  }

  const servicePrice = selectedVariation?.price ?? selectedService.price;
  const bookingFee = calcBookingFee(selectedService, servicePrice);
  const remainingAmount = servicePrice - bookingFee;

  const serviceName = selectedVariation
    ? `${selectedService.name} · ${selectedVariation.name}`
    : selectedService.name;

  const infoItems = [
    { icon: 'cut-outline' as const, label: 'Serviço', value: serviceName },
    { icon: 'person-outline' as const, label: 'Profissional', value: selectedProfessional.name },
    { icon: 'calendar-outline' as const, label: 'Data', value: formatDateCalendar(selectedDate) },
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

      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />

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
            <Text style={[styles.priceValue, styles.feeValue]}>{formatCurrency(bookingFee)}</Text>
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
            {selectedService.bookingFeeType === 'percentage'
              ? `A taxa de ${selectedService.bookingFeeValue}% (${formatCurrency(bookingFee)}) garante seu horário e é descontada do valor total no dia do atendimento.`
              : `A taxa de ${formatCurrency(bookingFee)} garante seu horário e é descontada do valor total no dia do atendimento.`}
          </Text>
        </View>

        {/* Terms checkbox */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setTermsAccepted((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />}
          </View>
          <Text style={styles.termsText}>
            Li e aceito a{' '}
            <Text
              style={styles.termsLink}
              onPress={(e) => {
                e.stopPropagation?.();
                setShowTerms(true);
              }}
            >
              política de cancelamento
            </Text>
          </Text>
        </TouchableOpacity>

        <Button
          label={`Pagar taxa de reserva · ${formatCurrency(bookingFee)}`}
          onPress={() => navigation.navigate('Payment')}
          disabled={!termsAccepted}
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },

  // Info card
  infoCard: { marginBottom: spacing[4], padding: 0, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: spacing[4] },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing[3],
  },
  infoTextBlock: { flex: 1 },
  infoLabel: {
    ...textStyles.caption, color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
  },
  infoValue: { ...textStyles.bodyMedium, color: colors.textPrimary, textTransform: 'capitalize' },
  rowDivider: { marginLeft: 52 + spacing[3] },

  // Price card
  priceCard: { marginBottom: spacing[4] },
  priceCardTitle: { ...textStyles.h3, color: colors.textPrimary, marginBottom: spacing[3] },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[3] },
  priceRowHighlight: {
    backgroundColor: colors.primaryGhost,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    marginHorizontal: -spacing[1],
    marginBottom: spacing[2],
  },
  priceLabel: { ...textStyles.bodyMedium, color: colors.textSecondary },
  priceValue: { ...textStyles.labelLarge, color: colors.textPrimary },
  feeLabelBlock: { flex: 1 },
  feeHint: { ...textStyles.caption, color: colors.textTertiary, marginTop: 2 },
  feeValue: { color: colors.primary },
  remainingLabel: { ...textStyles.labelLarge, color: colors.textPrimary },
  remainingValue: { ...textStyles.h1, color: colors.textPrimary },

  // Notice
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: colors.infoLight, borderRadius: borderRadius.sm,
    padding: spacing[3], marginBottom: spacing[4],
  },
  noticeText: { ...textStyles.bodySmall, color: colors.info, flex: 1, lineHeight: 18 },

  // Terms checkbox
  termsRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[5],
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: { ...textStyles.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  termsLink: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },

  // CTA
  cta: { marginBottom: spacing[3] },
  backBtn: { marginBottom: spacing[2] },

  // Terms modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[5], paddingVertical: spacing[4],
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalTitle: { ...textStyles.h2, color: colors.textPrimary },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
  },
  modalContent: { paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[8] },
  termSection: { gap: spacing[3] },
  termIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  termIconBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  termSectionTitle: { ...textStyles.labelLarge, color: colors.textPrimary, flex: 1 },
  termSectionBody: { ...textStyles.bodyMedium, color: colors.textSecondary, lineHeight: 22 },
  termBold: { fontWeight: '700', color: colors.textPrimary },
  termNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
  },
  termNoteText: { ...textStyles.bodySmall, color: colors.textTertiary, flex: 1, lineHeight: 18 },
  modalCta: { marginTop: spacing[5] },
});
