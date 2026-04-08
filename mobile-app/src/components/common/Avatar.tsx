import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, textStyles } from '../../theme';
import { getInitials } from '../../utils/formatters';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 80,
};

const FONT_MAP: Record<AvatarSize, number> = {
  xs: 10,
  sm: 13,
  md: 17,
  lg: 22,
  xl: 28,
};

export function Avatar({ name, uri, size = 'md', style }: AvatarProps) {
  const px = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: px, height: px, borderRadius: px / 2 }, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: px, height: px, borderRadius: px / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...textStyles.labelMedium,
    color: colors.primaryDark,
  },
});
