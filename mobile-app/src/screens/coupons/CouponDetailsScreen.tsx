import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CouponsStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button, Divider } from '../../components/common';
import { MOCK_COUPONS } from '../../mocks/data';
import { formatDiscount, formatDateShort } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<CouponsStackParamList, 'CouponDetails'>;
type Route = RouteProp<CouponsStackParamList, 'CouponDetails'>;

export function CouponDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const coupon = MOCK_COUPONS.find((c) => c.id === route.params.couponId);

  if (!coupon) return null;

  const isExpired = coupon.status !== 'ativo';
  const discountLabel = formatDiscount(coupon.discountType, coupon.discountValue);

  const handleRedeem = () => {
    Alert.alert(
      'Cupom copiado!',
      `O código "${coupon.code}" foi copiado. Use-o ao finalizar seu agendamento.`,
      [{ text: 'Entendido' }]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Detalhes do Cupom"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={isExpired ? ['#ABABAB', '#CACACA'] : [colors.primary, colors.primaryDark]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
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

        {/* Validity */}
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

          {coupon.minOrderValue && (
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={16} color={colors.textTertiary} />
              <View>
                <Text style={styles.infoLabel}>Valor mínimo</Text>
                <Text style={styles.infoValue}>
                  R$ {coupon.minOrderValue.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Divider />

        {/* Rules */}
        <View style={styles.section}>
          <Text style={styles.rulesTitle}>Regras e Condições</Text>
          {coupon.rules.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={styles.ruleDot} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        {!isExpired && (
          <Button
            label="Copiar código do cupom"
            onPress={handleRedeem}
            style={styles.cta}
          />
        )}

        {isExpired && (
          <View style={styles.expiredBanner}>
            <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.expiredText}>
              Este cupom está {coupon.status === 'expirado' ? 'expirado' : 'esgotado'} e não pode mais ser utilizado.
            </Text>
          </View>
        )}
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
    paddingBottom: spacing[8],
  },
  hero: {
    marginHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginBottom: spacing[5],
    alignItems: 'center',
    ...shadows.md,
  },
  heroDiscount: {
    ...textStyles.displayMedium,
    color: colors.textOnPrimary,
    marginBottom: spacing[2],
  },
  heroTitle: {
    ...textStyles.h2,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  codeRow: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  codeLabel: {
    ...textStyles.labelSmall,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 2,
  },
  codeValue: {
    ...textStyles.h1,
    color: colors.textOnPrimary,
    letterSpacing: 3,
  },
  section: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  description: {
    ...textStyles.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
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
  },
  rulesTitle: {
    ...textStyles.h3,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  ruleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  ruleText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  cta: {
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.divider,
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
    borderRadius: borderRadius.sm,
    padding: spacing[4],
  },
  expiredText: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    flex: 1,
  },
});
