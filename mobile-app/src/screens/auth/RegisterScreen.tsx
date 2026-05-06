import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { colors, textStyles, spacing } from '../../theme';
import { Button, Input, Header } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/api/auth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [acceptsPush, setAcceptsPush] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setUser } = useAuthStore();

  const formatBirthDate = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const parseBirthDate = (formatted: string): string | null => {
    const parts = formatted.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) return null;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      setError('Preencha nome, e-mail, celular e senha.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    let birth_date: string | null = null;
    if (birthDate.length > 0) {
      birth_date = parseBirthDate(birthDate);
      if (!birth_date) {
        setError('Data de nascimento inválida. Use DD/MM/AAAA.');
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      const result = await authService.register({
        name,
        email,
        phone,
        password,
        birth_date,
        accepts_marketing: acceptsMarketing,
        accepts_push: acceptsPush,
      });

      if (result.emailVerificationRequired) {
        navigation.replace('EmailVerification', { email: result.email });
      } else {
        setUser(result.user, result.tokens);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Erro ao criar conta. Tente novamente.');
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
        <Header
          title="Criar conta"
          showBack
          onBack={() => navigation.goBack()}
        />

        <View style={styles.body}>
          <Text style={styles.subtitle}>
            Cadastre-se para agendar e acessar benefícios exclusivos.
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Nome completo *"
            placeholder="Como devemos te chamar?"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            leftIcon="person-outline"
          />

          <Input
            label="E-mail *"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
          />

          <Input
            label="Celular *"
            placeholder="(11) 99999-0000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon="call-outline"
          />

          <Input
            label="Senha *"
            placeholder="Crie uma senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
            hint="Mínimo 8 caracteres"
          />

          <Input
            label="Data de nascimento"
            placeholder="DD/MM/AAAA"
            value={birthDate}
            onChangeText={(t) => setBirthDate(formatBirthDate(t))}
            keyboardType="numeric"
            leftIcon="calendar-outline"
            hint="Opcional — para receber cupom de aniversário"
            maxLength={10}
          />

          <View style={styles.consentSection}>
            <View style={styles.consentRow}>
              <View style={styles.consentText}>
                <Text style={styles.consentLabel}>Notificações push</Text>
                <Text style={styles.consentSub}>Receba confirmações e lembretes de agendamentos</Text>
              </View>
              <Switch
                value={acceptsPush}
                onValueChange={setAcceptsPush}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={acceptsPush ? colors.primary : colors.textTertiary}
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.consentRow}>
              <View style={styles.consentText}>
                <Text style={styles.consentLabel}>Promoções e novidades</Text>
                <Text style={styles.consentSub}>Receba ofertas exclusivas e lançamentos</Text>
              </View>
              <Switch
                value={acceptsMarketing}
                onValueChange={setAcceptsMarketing}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={acceptsMarketing ? colors.primary : colors.textTertiary}
              />
            </View>
          </View>

          <Button
            label="Criar conta"
            onPress={handleRegister}
            loading={loading}
            style={styles.btn}
          />

          <Text style={styles.terms}>
            Ao criar sua conta, você concorda com nossos{' '}
            <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
            <Text style={styles.termsLink}>Política de Privacidade</Text>.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Entrar</Text>
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
  subtitle: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing[6],
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
  consentSection: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing[2],
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  consentText: {
    flex: 1,
  },
  consentLabel: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
  },
  consentSub: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing[4],
  },
  btn: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  terms: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[6],
    paddingBottom: spacing[4],
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
