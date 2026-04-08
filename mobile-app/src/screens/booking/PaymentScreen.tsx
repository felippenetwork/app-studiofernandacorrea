import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookingStackParamList, PaymentMethod } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button, Card, Divider } from '../../components/common';
import { useBookingStore } from '../../store/bookingStore';
import { formatCurrency } from '../../utils/formatters';
import { BOOKING_FEE } from '../../mocks/data';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'Payment'>;

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string; description: string }[] = [
  {
    key: 'pix',
    label: 'Pix',
    icon: 'qr-code-outline',
    description: 'Aprovação instantânea',
  },
  {
    key: 'credit_card',
    label: 'Cartão de Crédito',
    icon: 'card-outline',
    description: 'Em até 3x sem juros',
  },
  {
    key: 'debit_card',
    label: 'Cartão de Débito',
    icon: 'card-outline',
    description: 'Aprovação instantânea',
  },
];

export function PaymentScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedService, selectedProfessional, selectedDate, selectedTime, resetBooking } =
    useBookingStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  if (!selectedService) return null;

  const handleConfirmPayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Forma de pagamento', 'Selecione uma forma de pagamento.');
      return;
    }
    setLoading(true);

    // Simulate payment processing — replace with Mercado Pago integration later
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);

    Alert.alert(
      'Agendamento Confirmado!',
      `Seu ${selectedService.name} foi confirmado para ${selectedDate} às ${selectedTime}. A taxa de reserva de ${formatCurrency(BOOKING_FEE)} foi processada com sucesso.`,
      [
        {
          text: 'Ver meus agendamentos',
          onPress: () => {
            resetBooking();
            navigation.getParent()?.navigate('MyAppointments');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Pagamento"
        subtitle="Taxa de reserva"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount card */}
        <Card style={styles.amountCard} shadow="md">
          <Text style={styles.amountLabel}>Taxa de reserva</Text>
          <Text style={styles.amount}>{formatCurrency(BOOKING_FEE)}</Text>
          <Divider style={styles.divider} />
          <Text style={styles.amountNote}>
            Este valor será descontado do serviço no dia do atendimento.
          </Text>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Serviço</Text>
            <Text style={styles.serviceValue}>{selectedService.name}</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Restante no dia</Text>
            <Text style={styles.serviceValue}>
              {formatCurrency(selectedService.price - BOOKING_FEE)}
            </Text>
          </View>
        </Card>

        {/* Payment methods */}
        <Text style={styles.sectionTitle}>Forma de pagamento</Text>

        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.key;
          return (
            <TouchableOpacity
              key={method.key}
              onPress={() => setSelectedMethod(method.key)}
              activeOpacity={0.85}
              style={[styles.methodCard, isSelected && styles.methodCardSelected]}
            >
              <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
                <Ionicons
                  name={method.icon as any}
                  size={22}
                  color={isSelected ? colors.textOnPrimary : colors.primary}
                />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>
                  {method.label}
                </Text>
                <Text style={styles.methodDesc}>{method.description}</Text>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* PIX notice */}
        {selectedMethod === 'pix' && (
          <View style={styles.pixNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.pixNoticeText}>
              Você será direcionada para concluir o pagamento via Pix. O agendamento será confirmado automaticamente após a aprovação.
            </Text>
          </View>
        )}

        {/* Mercado Pago badge */}
        <View style={styles.mpBadge}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
          <Text style={styles.mpText}>Pagamento seguro via Mercado Pago</Text>
        </View>

        <Button
          label={loading ? 'Processando...' : `Confirmar pagamento · ${formatCurrency(BOOKING_FEE)}`}
          onPress={handleConfirmPayment}
          loading={loading}
          disabled={!selectedMethod}
          style={styles.cta}
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
  amountCard: {
    alignItems: 'center',
    marginBottom: spacing[6],
    paddingVertical: spacing[6],
  },
  amountLabel: {
    ...textStyles.labelMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  amount: {
    ...textStyles.displayMedium,
    color: colors.primary,
    marginBottom: spacing[3],
  },
  divider: {
    width: '100%',
    marginBottom: spacing[3],
  },
  amountNote: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing[1],
  },
  serviceLabel: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  serviceValue: {
    ...textStyles.labelMedium,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...textStyles.h3,
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.xs,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  methodIconSelected: {
    backgroundColor: colors.primary,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  methodLabelSelected: {
    color: colors.primaryDark,
  },
  methodDesc: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  pixNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  pixNoticeText: {
    ...textStyles.bodySmall,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
  mpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[5],
  },
  mpText: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  cta: {
    marginTop: spacing[2],
  },
});
