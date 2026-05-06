import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { colors, textStyles, spacing } from '../../theme';
import { Button } from '../../components/common';
import { authService } from '../../services/api/auth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>;
  route: { params: { email: string } };
};

export function EmailVerificationScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await authService.resendVerification(email);
      setResent(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao reenviar. Tente novamente.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name="mail-outline" size={56} color={colors.primary} />
      </View>

      <Text style={styles.title}>Verifique seu e-mail</Text>

      <Text style={styles.subtitle}>
        Enviamos um link de confirmação para:
      </Text>
      <Text style={styles.email}>{email}</Text>

      <Text style={styles.instructions}>
        Abra seu e-mail e clique no link para ativar sua conta. Depois volte aqui e faça login normalmente.
      </Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {resent ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.successText}>E-mail reenviado!</Text>
        </View>
      ) : null}

      <Button
        label={resending ? 'Reenviando…' : 'Reenviar e-mail'}
        onPress={handleResend}
        loading={resending}
        variant="outline"
        style={styles.resendBtn}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.loginLink}
        activeOpacity={0.75}
      >
        <Ionicons name="arrow-back-outline" size={16} color={colors.primary} />
        <Text style={styles.loginLinkText}>Voltar para o login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...textStyles.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  subtitle: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  email: {
    ...textStyles.labelMedium,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  instructions: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[4],
    width: '100%',
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primaryGhost,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[4],
    width: '100%',
    justifyContent: 'center',
  },
  successText: {
    ...textStyles.bodySmall,
    color: colors.primary,
  },
  resendBtn: {
    width: '100%',
    marginBottom: spacing[4],
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    padding: spacing[3],
  },
  loginLinkText: {
    ...textStyles.labelMedium,
    color: colors.primary,
  },
});
