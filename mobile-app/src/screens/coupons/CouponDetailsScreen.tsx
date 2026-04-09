import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { CouponsStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { Header, Button, Divider } from '../../components/common';
import { couponsService } from '../../services/api/coupons';
import { formatDiscount, formatDateShort } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<CouponsStackParamList, 'CouponDetails'>;
type Route = RouteProp<CouponsStackParamList, 'CouponDetails'>;

export function CouponDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const couponId = route.params.couponId;

  const { data: coupon, isLoading } = useQuery({
    queryKey: ['coupon', couponId],
    queryFn: () => couponsService.getCouponById(couponId),
    staleTime: 1000 * 60 * 5,
  });

  const handleCopy = async () => {
    if (!coupon) return;
    await Clipboard.setStringAsync(coupon.code);
    Alert.alert(
      'Código copiado!',
      `O código "${coupon.code}" foi copiado para a área de transferência. Use-o ao selecionar um serviço no agendamento.`,
      [{ text: 'Entendido' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Detalhes do Cupom" showBack onBack={() => navigation.goBack()} />
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!coupon) {
    return (
      <View style={styles.container}>
        <Header title="Detalhes do Cupom" showBack onBack={() => navigation.goBack()} />
        <View style={styles.stateCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.border} />
          <Text style={styles.stateTitle}>Cupom não encontrado</Text>
          <Button label="Voltar" onPress={() => navigation.goBack()} variant="outline" style={styles.retryBtn} />
        </View>
      </View>
    );
  }

  const isExpired = coupon.status !== 'ativo';
  const discountLabel = formatDiscount(coupon.discountType, coupon.discountValue);

  return (
    <View style={styles.container}>
      <Header title="Detalhes do Cupom" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero gradient */}
        <LinearGradient
          colors={isExpired ? ['#ABABAB', '#CACACA'] : [colors.primary, colors.primaryDark]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isExpired && (
            <View style={styles.expiredChip}>
              <Text style={styles.expiredText}>Expirado</Text>
            </View>
          )}
          <Text style={styles.heroDiscount}>{discountLabel}</Text>
          <Text style={styles.heroTitle}>{coupon.title}</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>CÓDIGO</Text>
            <Text style={styles.codeValue}>{coupon.code}</Text>
          </View>
        </LinearGradient>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.description}>{coupon.description}</Text>
        </View>

        <Divider />

        {/* Info rows */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
            <View>
              <Text style={styles.infoLabel}>Validade</Text>
              <Text style={styles.infoValue}>
                {formatDateShort(coupon.validFrom)} até {formatDateShort(coupon.validUntil)}
              </Text>
            </View>
          </View>

          {coupon.minOrderValue != null && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color={colors.textTertiary} />
              <View>
                <Text style={styles.infoLabel}>Pedido mínimo</Text>
                <Text style={styles.infoValue}>
                  R$ {coupon.minOrderValue.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
          )}

          {coupon.maxUsages != null && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color={colors.textTertiary} />
              <View>
                <Text style={styles.infoLabel}>Usos</Text>
                <Text style={styles.infoValue}>
                  {coupon.usedCount} / {coupon.maxUsages} utilizados
                </Text>
              </View>
            </View>
          )}
        </View>

        <Divider />

        {/* Rules */}
        {coupon.rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.rulesTitle}>Regras de uso</Text>
            {coupon.rules.map((rule, i) => (
              <View key={i} style={styles.ruleRow}>
                <View style={styles.ruleDot} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {!isExpired && (
          <Button label="Copiar código" onPress={handleCopy} style={styles.cta} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing[8] },
  hero: {
    margin: spacing[5],
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  expiredChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 3,
    marginBottom: spacing[2],
  },
  expiredText: { ...textStyles.caption, color: colors.textOnPrimary },
  heroDiscount: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 48,
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  heroTitle: { ...textStyles.h2, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  codeRow: { alignItems: 'center', marginTop: spacing[3] },
  codeLabel: {
    ...textStyles.caption,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  codeValue: {
    fontFamily: 'JosefinSans_700Bold',
    fontSize: 28,
    color: colors.textOnPrimary,
    letterSpacing: 6,
    marginTop: 4,
  },
  section: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  description: { ...textStyles.bodyMedium, color: colors.textSecondary, lineHeight: 22 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  infoLabel: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: { ...textStyles.bodyMedium, color: colors.textPrimary },
  rulesTitle: { ...textStyles.h3, color: colors.textPrimary, marginBottom: spacing[3] },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  ruleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  ruleText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  cta: { marginHorizontal: spacing[5], marginTop: spacing[2] },
  stateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  stateTitle: { ...textStyles.h2, color: colors.textSecondary },
  retryBtn: { marginTop: spacing[2] },
});
