import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookingStackParamList, PaymentMethod } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button, Card, Divider } from '../../components/common';
import { useBookingStore } from '../../store/bookingStore';
import { appointmentsService, CreateAppointmentResult, CardData } from '../../services/api/appointments';
import { formatCurrency } from '../../utils/formatters';
import { Service } from '../../types';

function calcBookingFee(service: Service, servicePrice: number): number {
  if (service.bookingFeeType === 'percentage' && service.bookingFeeValue != null) {
    return Math.round(servicePrice * service.bookingFeeValue) / 100;
  }
  return service.bookingFeeValue ?? 40;
}

function detectBrand(number: string): string {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(n)) return 'Elo';
  if (/^(606282|3841)/.test(n)) return 'Hipercard';
  return '';
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

type Nav = NativeStackNavigationProp<BookingStackParamList, 'Payment'>;

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string; description: string }[] = [
  { key: 'pix',         label: 'Pix',              icon: 'qr-code-outline', description: 'Aprovação instantânea' },
  { key: 'credit_card', label: 'Cartão de Crédito', icon: 'card-outline',    description: 'Aprovado na hora' },
  { key: 'debit_card',  label: 'Cartão de Débito',  icon: 'card-outline',    description: 'Autenticação pelo banco' },
];

export function PaymentScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { selectedService, selectedVariation, selectedProfessional, selectedDate, selectedTime, selectedCoupon, resetBooking } =
    useBookingStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [pixResult, setPixResult] = useState<{ qrCode?: string; copyPaste?: string } | null>(null);
  const [debitPending, setDebitPending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const isCardMethod = selectedMethod === 'credit_card' || selectedMethod === 'debit_card';
  const cardBrand = detectBrand(cardNumber);

  function buildCardData(): CardData | undefined {
    if (!isCardMethod) return undefined;
    const [mm, yy] = cardExpiry.split('/');
    return {
      number: cardNumber.replace(/\s/g, ''),
      holderName: cardHolder.trim(),
      expiryMonth: (mm ?? '').padStart(2, '0'),
      expiryYear: yy ? `20${yy}` : '',
      cvv: cardCvv,
      brand: cardBrand || undefined,
    };
  }

  function validateCard(): string | null {
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 14) return 'Número de cartão inválido.';
    if (cardHolder.trim().length < 3) return 'Nome do titular obrigatório.';
    const [mm, yy] = cardExpiry.split('/');
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return 'Validade inválida (MM/AA).';
    const month = parseInt(mm, 10);
    if (month < 1 || month > 12) return 'Mês de validade inválido.';
    if (cardCvv.length < 3) return 'CVV inválido.';
    return null;
  }

  const { mutate: confirmPayment, isPending: loading } = useMutation({
    mutationFn: () =>
      appointmentsService.createAppointment({
        booking: { selectedService, selectedVariation, selectedProfessional, selectedDate, selectedTime, selectedCoupon },
        paymentMethod: selectedMethod!,
        cardData: buildCardData(),
      }),
    onSuccess: (result: CreateAppointmentResult) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      if (result.pixQrCode || result.pixCopyPaste) {
        setPixResult({ qrCode: result.pixQrCode, copyPaste: result.pixCopyPaste });
      } else if (result.redirectUrl) {
        // Debit 3DS: open bank authentication in browser
        setDebitPending(true);
        Linking.openURL(result.redirectUrl).catch(() => {
          Alert.alert('Erro', 'Não foi possível abrir a autenticação. Tente novamente.');
          setDebitPending(false);
        });
      } else {
        Alert.alert(
          '✓ Agendamento Confirmado',
          `${selectedService?.name} confirmado para ${selectedDate} às ${selectedTime}.\n\nTaxa de reserva de ${formatCurrency(bookingFee)} processada com sucesso.`,
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
      }
    },
    onError: (error: Error) => {
      Alert.alert(
        'Erro no pagamento',
        error.message || 'Não foi possível processar o pagamento. Tente novamente.',
        [{ text: 'OK' }]
      );
    },
  });

  const handleConfirm = () => {
    if (!selectedMethod) {
      Alert.alert('Forma de pagamento', 'Selecione uma forma de pagamento para continuar.');
      return;
    }
    if (isCardMethod) {
      const err = validateCard();
      if (err) { Alert.alert('Dados do cartão', err); return; }
    }
    confirmPayment();
  };

  const handleCopyPaste = async () => {
    if (!pixResult?.copyPaste) return;
    await Clipboard.setStringAsync(pixResult.copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePixDone = () => {
    resetBooking();
    navigation.getParent()?.navigate('MyAppointments');
  };

  if (!selectedService) return null;

  const servicePrice = selectedVariation?.price ?? selectedService.price;
  const bookingFee = calcBookingFee(selectedService, servicePrice);

  // ─── Debit 3DS Pending Screen ─────────────────────────────────────────────

  if (debitPending) {
    return (
      <View style={styles.container}>
        <Header title="Autenticação do Banco" subtitle="Aguardando confirmação" showBack={false} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.pixCard} shadow="md">
            <View style={styles.pixHeader}>
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
              <Text style={styles.pixTitle}>Autenticação necessária</Text>
              <Text style={styles.pixSubtitle}>
                Seu banco abrirá no navegador para confirmar o pagamento de{' '}
                <Text style={{ fontWeight: '700' }}>{formatCurrency(bookingFee)}</Text>.
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.pixInstructions}>
              {[
                'O navegador abriu com a página do seu banco',
                'Autentique o pagamento conforme solicitado',
                'Após confirmar, volte ao app',
                'Seu agendamento será confirmado automaticamente',
              ].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNumber}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </Card>
          <Button label="Ir para meus agendamentos" onPress={() => { resetBooking(); navigation.getParent()?.navigate('MyAppointments'); }} style={styles.cta} />
        </ScrollView>
      </View>
    );
  }

  // ─── PIX QR Code Screen ───────────────────────────────────────────────────

  if (pixResult) {
    return (
      <View style={styles.container}>
        <Header title="Pagamento via Pix" subtitle="Escaneie o QR code" showBack={false} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.pixCard} shadow="md">
            <View style={styles.pixHeader}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
              <Text style={styles.pixTitle}>Agendamento criado!</Text>
              <Text style={styles.pixSubtitle}>
                Aguardando pagamento da taxa de reserva de{' '}
                <Text style={{ fontWeight: '700' }}>{formatCurrency(bookingFee)}</Text>
              </Text>
            </View>

            <Divider style={styles.divider} />

            {/* QR Code image */}
            {pixResult.qrCode ? (
              <Image
                source={{ uri: `data:image/png;base64,${pixResult.qrCode}` }}
                style={styles.qrImage}
                resizeMode="contain"
                accessibilityLabel="QR Code Pix"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={80} color={colors.border} />
                <Text style={styles.qrPlaceholderText}>QR Code não disponível em modo mock</Text>
              </View>
            )}

            {/* Copy-paste code */}
            {pixResult.copyPaste && (
              <View style={styles.copySection}>
                <Text style={styles.copyLabel}>Pix Copia e Cola</Text>
                <View style={styles.copyBox}>
                  <Text style={styles.copyCode} numberOfLines={2} ellipsizeMode="middle">
                    {pixResult.copyPaste}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyPaste}
                    style={[styles.copyButton, copied && styles.copyButtonDone]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={copied ? 'checkmark-outline' : 'copy-outline'}
                      size={18}
                      color={copied ? colors.success : colors.primary}
                    />
                    <Text style={[styles.copyButtonText, copied && styles.copyButtonTextDone]}>
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>

          {/* Instructions */}
          <View style={styles.pixInstructions}>
            {[
              'Abra o app do seu banco',
              'Escolha pagar via Pix e escaneie o QR code ou use o código acima',
              'Confirme o pagamento de ' + formatCurrency(bookingFee),
              'Seu agendamento será confirmado automaticamente',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.mpBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
            <Text style={styles.mpText}>Pagamento seguro via Getnet (Santander)</Text>
          </View>

          <Button
            label="Ir para meus agendamentos"
            onPress={handlePixDone}
            style={styles.cta}
          />
        </ScrollView>
      </View>
    );
  }

  // ─── Payment Selection Screen ─────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Header title="Pagamento" subtitle="Taxa de reserva" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount card */}
        <Card style={styles.amountCard} shadow="md">
          <Text style={styles.amountLabel}>Taxa de reserva</Text>
          <Text style={styles.amount}>{formatCurrency(bookingFee)}</Text>
          <Divider style={styles.divider} />
          <Text style={styles.amountNote}>
            Este valor é descontado do serviço no dia do atendimento.
          </Text>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Serviço</Text>
            <Text style={styles.serviceValue}>{selectedService.name}</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Restante no dia</Text>
            <Text style={styles.serviceValue}>{formatCurrency(servicePrice - bookingFee)}</Text>
          </View>
          {selectedCoupon && (
            <View style={[styles.serviceRow, styles.couponRow]}>
              <Text style={styles.couponLabel}>
                <Ionicons name="pricetag-outline" size={12} color={colors.success} /> {selectedCoupon.code}
              </Text>
              <Text style={styles.couponValue}>Aplicado ✓</Text>
            </View>
          )}
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
                <Ionicons name={method.icon as any} size={22} color={isSelected ? colors.textOnPrimary : colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>{method.label}</Text>
                <Text style={styles.methodDesc}>{method.description}</Text>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {selectedMethod === 'pix' && (
          <View style={styles.pixNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.pixNoticeText}>
              Após confirmar, o QR Code Pix será gerado. O agendamento é confirmado automaticamente após a aprovação.
            </Text>
          </View>
        )}

        {selectedMethod === 'debit_card' && (
          <View style={styles.pixNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.pixNoticeText}>
              O débito exige autenticação pelo seu banco. Após confirmar, você será redirecionado para concluir.
            </Text>
          </View>
        )}

        {/* Card form */}
        {isCardMethod && (
          <View style={styles.cardForm}>
            <Text style={styles.cardFormTitle}>Dados do cartão</Text>

            <View style={styles.cardNumberRow}>
              <TextInput
                style={[styles.cardInput, { flex: 1 }]}
                placeholder="Número do cartão"
                placeholderTextColor={colors.textTertiary}
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                keyboardType="numeric"
                maxLength={19}
              />
              {cardBrand ? (
                <Text style={styles.cardBrandBadge}>{cardBrand}</Text>
              ) : null}
            </View>

            <TextInput
              style={styles.cardInput}
              placeholder="Nome impresso no cartão"
              placeholderTextColor={colors.textTertiary}
              value={cardHolder}
              onChangeText={setCardHolder}
              autoCapitalize="characters"
            />

            <View style={styles.cardRow}>
              <TextInput
                style={[styles.cardInput, styles.cardInputHalf]}
                placeholder="Validade (MM/AA)"
                placeholderTextColor={colors.textTertiary}
                value={cardExpiry}
                onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={[styles.cardInput, styles.cardInputHalf]}
                placeholder="CVV"
                placeholderTextColor={colors.textTertiary}
                value={cardCvv}
                onChangeText={(t) => setCardCvv(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>
        )}

        <View style={styles.mpBadge}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
          <Text style={styles.mpText}>Pagamento seguro via Getnet (Santander)</Text>
        </View>

        <Button
          label={loading ? 'Processando…' : `Confirmar pagamento · ${formatCurrency(bookingFee)}`}
          onPress={handleConfirm}
          loading={loading}
          disabled={!selectedMethod || loading}
          style={styles.cta}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },

  // Amount card
  amountCard: { alignItems: 'center', marginBottom: spacing[6], paddingVertical: spacing[6] },
  amountLabel: {
    ...textStyles.labelMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  amount: { ...textStyles.displayMedium, color: colors.primary, marginBottom: spacing[3] },
  divider: { width: '100%', marginBottom: spacing[3] },
  amountNote: { ...textStyles.bodySmall, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing[3] },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: spacing[1] },
  serviceLabel: { ...textStyles.bodySmall, color: colors.textSecondary },
  serviceValue: { ...textStyles.labelMedium, color: colors.textPrimary },
  couponRow: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  couponLabel: { ...textStyles.bodySmall, color: colors.success },
  couponValue: { ...textStyles.labelMedium, color: colors.success },

  // Method selection
  sectionTitle: { ...textStyles.h3, color: colors.textPrimary, marginBottom: spacing[3] },
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
  methodCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryGhost },
  methodIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing[3],
  },
  methodIconSelected: { backgroundColor: colors.primary },
  methodInfo: { flex: 1 },
  methodLabel: { ...textStyles.labelLarge, color: colors.textPrimary, marginBottom: 2 },
  methodLabelSelected: { color: colors.primaryDark },
  methodDesc: { ...textStyles.caption, color: colors.textTertiary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  // PIX notice (before payment)
  pixNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  pixNoticeText: { ...textStyles.bodySmall, color: colors.info, flex: 1, lineHeight: 18 },

  // MP badge + CTA
  mpBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginBottom: spacing[5] },
  mpText: { ...textStyles.caption, color: colors.textTertiary },
  cta: { marginTop: spacing[2] },

  // PIX QR Code result screen
  pixCard: { alignItems: 'center', marginBottom: spacing[5], paddingVertical: spacing[5] },
  pixHeader: { alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] },
  pixTitle: { ...textStyles.h2, color: colors.textPrimary },
  pixSubtitle: { ...textStyles.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  qrImage: { width: 200, height: 200, marginBottom: spacing[4] },
  qrPlaceholder: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  qrPlaceholderText: { ...textStyles.caption, color: colors.textTertiary, textAlign: 'center', paddingHorizontal: spacing[4] },
  copySection: { width: '100%' },
  copyLabel: { ...textStyles.labelMedium, color: colors.textSecondary, marginBottom: spacing[2] },
  copyBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    gap: spacing[2],
  },
  copyCode: { ...textStyles.bodySmall, color: colors.textPrimary, fontFamily: 'monospace' },
  copyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primaryGhost,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignSelf: 'flex-start',
  },
  copyButtonDone: { backgroundColor: colors.successLight },
  copyButtonText: { ...textStyles.labelMedium, color: colors.primary },
  copyButtonTextDone: { color: colors.success },

  // Card form
  cardForm: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  cardFormTitle: { ...textStyles.labelLarge, color: colors.textPrimary, marginBottom: spacing[1] },
  cardNumberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardBrandBadge: {
    ...textStyles.caption,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  cardInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[3],
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  cardRow: { flexDirection: 'row', gap: spacing[3] },
  cardInputHalf: { flex: 1 },

  // Step instructions
  pixInstructions: { gap: spacing[3], marginBottom: spacing[5] },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  stepBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumber: { ...textStyles.labelMedium, color: colors.textOnPrimary },
  stepText: { ...textStyles.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 20, paddingTop: 4 },
});
