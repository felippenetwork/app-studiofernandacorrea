import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme';

interface DividerProps {
  style?: ViewStyle;
  indent?: number;
}

export function Divider({ style, indent = 0 }: DividerProps) {
  return <View style={[styles.divider, { marginLeft: indent }, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
});
