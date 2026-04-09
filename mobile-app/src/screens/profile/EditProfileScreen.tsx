import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types';
import { colors, textStyles, spacing } from '../../theme';
import { Button, Input, Header } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/api/auth';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

export function EditProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, updateUser } = useAuthStore();

  const formatBirthDate = (iso: string | null | undefined): string => {
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
  };

  const parseBirthDate = (formatted: string): string | null => {
    const parts = formatted.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) return null;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const autoFormatDate = (text: string): string => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [birthDate, setBirthDate] = useState(formatBirthDate(user?.birthDate));
  const [acceptsPush, setAcceptsPush] = useState(user?.acceptsPush ?? true);
  const [acceptsMarketing, setAcceptsMarketing] = useState(user?.acceptsMarketing ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nome não pode ser vazio.');
      return;
    }

    let birth_date: string | null | undefined = undefined;
    if (birthDate.length > 0) {
      birth_date = parseBirthDate(birthDate);
      if (!birth_date) {
        setError('Data de nascimento inválida. Use DD/MM/AAAA.');
        return;
      }
    } else {
      birth_date = null;
    }

    setError('');
    setLoading(true);

    try {
      const updated = await authService.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        birth_date,
        accepts_marketing: acceptsMarketing,
        accepts_push: acceptsPush,
      });
      updateUser(updated);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Editar perfil" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Nome completo *"
          placeholder="Seu nome"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          leftIcon="person-outline"
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
          label="Data de nascimento"
          placeholder="DD/MM/AAAA"
          value={birthDate}
          onChangeText={(t) => setBirthDate(autoFormatDate(t))}
          keyboardType="numeric"
          leftIcon="calendar-outline"
          hint="Receba cupom especial no seu aniversário"
          maxLength={10}
        />

        {/* Notification preferences */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preferências de comunicação</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Notificações push</Text>
              <Text style={styles.toggleSub}>Confirmações e lembretes de agendamentos</Text>
            </View>
            <Switch
              value={acceptsPush}
              onValueChange={setAcceptsPush}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={acceptsPush ? colors.primary : colors.textTertiary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Promoções e novidades</Text>
              <Text style={styles.toggleSub}>Ofertas exclusivas e lançamentos</Text>
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
          label="Salvar alterações"
          onPress={handleSave}
          loading={loading}
          style={styles.btn}
        />

        <Button
          label="Cancelar"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.cancelBtn}
        />
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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
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
  sectionHeader: {
    marginTop: spacing[5],
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing[5],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
  },
  toggleSub: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing[4],
  },
  btn: {
    marginBottom: spacing[3],
  },
  cancelBtn: {
    marginBottom: spacing[4],
  },
});
