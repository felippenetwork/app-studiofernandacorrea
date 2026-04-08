import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Coupon } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { formatDiscount, formatDateShort } from '../../utils/formatters';

interface CouponCardProps {
  coupon: Coupon;
  onPress?: () => void;
  compact?: boolean;
}

export function CouponCard({ coupon, onPress, compact = false }: CouponCardProps) {
  const isExpired = coupon.status === 'expirado' || coupon.status === 'esgotado';
  const discountLabel = formatDiscount(coupon.discountType, coupon.discountValue);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isExpired ? 1 : 0.85}
      style={[styles.card, isExpired && styles.cardExpired, shadows.sm]}
    >
      {/* Discount accent */}
      <LinearGradient
        colors={isExpired ? ['#ABABAB', '#CACACA'] : [colors.primary, colors.primaryDark]}
        style={styles.discountBand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.discountValue}>{discountLabel}</Text>
      </LinearGradient>

      {/* Dashed divider */}
      <View style={styles.dashedLine} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{coupon.title}</Text>
        {!compact && (
          <Text style={styles.description} numberOfLines={2}>{coupon.description}</Text>
        )}
        <View style={styles.footer}>
          <View style={styles.codeChip}>
            <Text style={styles.codeText}>{coupon.code}</Text>
          </View>
          <View style={styles.validity}>
            <Ionicons
              name="time-outline"
              size={11}
              color={isExpired ? colors.textTertiary : colors.textSecondary}
            />
            <Text style={[styles.validityText, isExpired && styles.expiredText]}>
              {isExpired ? 'Expirado' : `até ${formatDateShort(coupon.validUntil)}`}
            </Text>
          </View>
        </View>
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
  },
  cardExpired: {
    opacity: 0.6,
  },
  discountBand: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
  },
  discountValue: {
    ...textStyles.labelLarge,
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  dashedLine: {
    width: 1,
    backgroundColor: colors.divider,
    borderStyle: 'dashed',
    marginVertical: spacing[3],
  },
  content: {
    flex: 1,
    padding: spacing[3],
    justifyContent: 'center',
  },
  title: {
    ...textStyles.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  codeChip: {
    backgroundColor: colors.primaryGhost,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  codeText: {
    ...textStyles.labelSmall,
    color: colors.primaryDark,
    letterSpacing: 1.5,
  },
  validity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  validityText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  expiredText: {
    color: colors.textTertiary,
  },
});
