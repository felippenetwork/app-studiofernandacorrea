import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { colors, textStyles, spacing } from '../../theme';
import { Button, Input, Header } from '../../components/common';
import { authService } from '../../services/api/auth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email) {
      setError('Informe seu e-mail.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.iconWrapper}>
          <Ionicons name="mail-outline" size={56} color={colors.primary} />
        </View>
        <Text style={styles.successTitle}>E-mail enviado!</Text>
        <Text style={styles.successText}>
          Se este e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
        </Text>
        <Text style={styles.successHint}>
          Verifique também a pasta de spam.
        </Text>
        <Button
          label="Voltar para o login"
          onPress={() => navigation.navigate('Login')}
          style={styles.backBtn}
        />
      </View>
    );
  }

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
        <Header title="Recuperar senha" showBack onBack={() => navigation.goBack()} />

        <View style={styles.body}>
          <View style={styles.iconWrapper}>
            <Ionicons name="lock-open-outline" size={40} color={colors.primary} />
          </View>

          <Text style={styles.title}>Esqueceu sua senha?</Text>
          <Text style={styles.subtitle}>
            Informe seu e-mail e enviaremos um link para você criar uma nova senha.
          </Text>

          {error ? (
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
            leftIcon="mail-outline"
          />

          <Button
            label={loading ? 'Enviando…' : 'Enviar link de recuperação'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.btn}
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
    paddingBottom: spacing[8],
  },
  body: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    alignSelf: 'center',
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
    lineHeight: 22,
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
  btn: {
    width: '100%',
    marginTop: spacing[2],
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
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  successTitle: {
    ...textStyles.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  successText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  successHint: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  backBtn: {
    width: '100%',
  },
});
