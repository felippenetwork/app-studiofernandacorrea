import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, textStyles } from '../../theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'accent' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'primary', style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    ...textStyles.labelSmall,
  },
  // Variants backgrounds
  primary: { backgroundColor: colors.primaryGhost },
  success: { backgroundColor: colors.successLight },
  warning: { backgroundColor: colors.warningLight },
  error: { backgroundColor: colors.errorLight },
  accent: { backgroundColor: colors.accentLight },
  neutral: { backgroundColor: colors.divider },
  // Variants text
  label_primary: { color: colors.primaryDark },
  label_success: { color: colors.success },
  label_warning: { color: colors.warning },
  label_error: { color: colors.error },
  label_accent: { color: colors.accentDark },
  label_neutral: { color: colors.textSecondary },
});
