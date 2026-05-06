import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { colors, textStyles, spacing } from '../../theme';
import { Button, Input } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/api/auth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const { setUser } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setError('');
    setUnverifiedEmail('');
    setLoading(true);

    try {
      const { user, tokens } = await authService.login({ email, password });
      setUser(user, tokens);
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message ?? e?.message ?? 'Erro ao entrar. Verifique seus dados.';
      if (status === 403 && message.includes('não ativada')) {
        setUnverifiedEmail(email);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bem-vinda de volta</Text>
          <Text style={styles.subtitle}>Acesse sua conta para continuar</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {unverifiedEmail ? (
            <View style={styles.verifyBanner}>
              <Text style={styles.verifyText}>
                Confirme seu e-mail antes de entrar.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('EmailVerification', { email: unverifiedEmail })}
              >
                <Text style={styles.verifyLink}>Reenviar e-mail de confirmação</Text>
              </TouchableOpacity>
            </View>
          ) : error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
          />

          <Input
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <Button
            label="Entrar"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: 80,
    paddingBottom: spacing[8],
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    ...textStyles.displaySmall,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.error,
  },
  verifyBanner: {
    backgroundColor: colors.primaryGhost,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  verifyText: {
    ...textStyles.bodySmall,
    color: colors.textPrimary,
  },
  verifyLink: {
    ...textStyles.labelMedium,
    color: colors.primary,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: spacing[6],
  },
  forgotText: {
    ...textStyles.bodySmall,
    color: colors.primary,
  },
  loginBtn: {
    marginTop: spacing[2],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[6],
  },
  footerText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  footerLink: {
    ...textStyles.labelMedium,
    color: colors.primary,
  },
});
