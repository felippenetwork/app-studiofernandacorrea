import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { colors, textStyles, spacing } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Splash'>;
};

export function SplashScreen({ navigation }: Props) {
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(20);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
        <Text style={styles.brandName}>Studio</Text>
        <Text style={styles.brandSub}>Fernanda Correa</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Beleza com sofisticação</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  brandName: {
    ...textStyles.displayMedium,
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  brandSub: {
    ...textStyles.displaySmall,
    color: colors.primary,
    letterSpacing: 2,
    marginTop: -4,
  },
  divider: {
    width: 40,
    height: 1.5,
    backgroundColor: colors.accent,
    marginVertical: spacing[4],
  },
  tagline: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
