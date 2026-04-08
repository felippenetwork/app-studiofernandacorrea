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
import { Button, Input, Header } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { MOCK_USER } from '../../mocks/data';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setUser } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);

    // Simulates API call — replace with real auth later
    await new Promise((r) => setTimeout(r, 1200));
    setUser({ ...MOCK_USER, name, email, phone }, { accessToken: 'mock-token', refreshToken: 'mock-refresh' });
    setLoading(false);
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
          <Text style={styles.subtitle}>Cadastre-se para agendar e acessar benefícios exclusivos.</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Nome completo"
            placeholder="Como devemos te chamar?"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            leftIcon="person-outline"
          />

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
          />

          <Input
            label="Celular"
            placeholder="(11) 99999-0000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon="call-outline"
          />

          <Input
            label="Senha"
            placeholder="Crie uma senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
            hint="Mínimo 8 caracteres"
          />

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
