import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius, textStyles } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textOnPrimary}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`labelVariant_${variant}`], styles[`labelSize_${size}`], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryGhost,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    opacity: 0.45,
  },
  // Sizes
  size_sm: {
    height: 40,
    paddingHorizontal: 16,
  },
  size_md: {
    height: 52,
    paddingHorizontal: 24,
  },
  size_lg: {
    height: 60,
    paddingHorizontal: 32,
  },
  // Label base
  label: {
    ...textStyles.button,
  },
  // Label variants
  labelVariant_primary: {
    color: colors.textOnPrimary,
  },
  labelVariant_secondary: {
    color: colors.primary,
  },
  labelVariant_outline: {
    color: colors.primary,
  },
  labelVariant_ghost: {
    color: colors.primary,
  },
  labelVariant_danger: {
    color: colors.textOnPrimary,
  },
  // Label sizes
  labelSize_sm: {
    ...textStyles.buttonSmall,
  },
  labelSize_md: {
    ...textStyles.button,
  },
  labelSize_lg: {
    ...textStyles.button,
    fontSize: 17,
  },
});
