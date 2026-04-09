import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ProfileStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Avatar, Card, Divider } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { MOCK_APPOINTMENTS } from '../../mocks/data';
import { settingsService } from '../../services/api/settings';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthStore();

  const completedCount = MOCK_APPOINTMENTS.filter((a) => a.status === 'concluido').length;

  const { data: config } = useQuery({
    queryKey: ['public-config'],
    queryFn: settingsService.getPublicConfig,
    staleTime: 1000 * 60 * 10, // 10 min
  });

  const handleGoogleReview = async () => {
    const url = config?.googleReviewLink;
    if (!url) {
      Alert.alert('Indisponível', 'Link de avaliação não configurado ainda.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Minha Conta',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notificações',
          onPress: () => navigation.navigate('Notifications'),
        },
        {
          icon: 'gift-outline',
          label: 'Benefícios',
          sublabel: 'Vantagens exclusivas',
          onPress: () => navigation.navigate('Benefits'),
        },
        {
          icon: 'time-outline',
          label: 'Histórico de agendamentos',
          sublabel: `${completedCount} atendimentos concluídos`,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Preferências',
      items: [
        {
          icon: 'star-outline' as keyof typeof Ionicons.glyphMap,
          label: 'Avaliar no Google',
          sublabel: 'Compartilhe sua experiência',
          onPress: handleGoogleReview,
        },
        {
          icon: 'lock-closed-outline',
          label: 'Alterar senha',
          onPress: () => {},
        },
        {
          icon: 'help-circle-outline',
          label: 'Ajuda e suporte',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Termos de uso',
          onPress: () => {},
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Sair da conta',
          onPress: handleLogout,
          variant: 'danger',
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile hero */}
      <View style={styles.hero}>
        <Avatar name={user?.name ?? ''} uri={user?.avatar} size="xl" />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.editBtn}
          activeOpacity={0.75}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.primary} />
          <Text style={styles.editBtnText}>Editar perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <Card style={styles.statsCard} shadow="sm">
        {[
          { label: 'Agendamentos', value: MOCK_APPOINTMENTS.length },
          { label: 'Concluídos', value: completedCount },
          { label: 'Cupons', value: 2 },
        ].map((stat, i, arr) => (
          <React.Fragment key={stat.label}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
            {i < arr.length - 1 && (
              <View style={styles.statDivider} />
            )}
          </React.Fragment>
        ))}
      </Card>

      {/* Menu sections */}
      {menuSections.map((section) => (
        <View key={section.title || 'actions'} style={styles.section}>
          {section.title ? (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          ) : null}
          <Card style={styles.menuCard} shadow="xs" padding={0}>
            {section.items.map((item, index) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  onPress={item.onPress}
                  activeOpacity={0.75}
                  style={styles.menuItem}
                >
                  <View style={[
                    styles.menuIcon,
                    item.variant === 'danger' && styles.menuIconDanger,
                  ]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.variant === 'danger' ? colors.error : colors.primary}
                    />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[
                      styles.menuLabel,
                      item.variant === 'danger' && styles.menuLabelDanger,
                    ]}>
                      {item.label}
                    </Text>
                    {item.sublabel && (
                      <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </TouchableOpacity>
                {index < section.items.length - 1 && (
                  <Divider indent={52 + spacing[4]} />
                )}
              </React.Fragment>
            ))}
          </Card>
        </View>
      ))}

      <Text style={styles.version}>Studio Fernanda Correa · v1.0.0</Text>
      <View style={{ height: spacing[8] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[5],
  },
  name: {
    ...textStyles.h1,
    color: colors.textPrimary,
    marginTop: spacing[3],
  },
  email: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  phone: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...textStyles.displaySmall,
    color: colors.primary,
    fontSize: 24,
  },
  statLabel: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing[2],
  },
  section: {
    paddingHorizontal: spacing[5],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  menuIconDanger: {
    backgroundColor: colors.errorLight,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
  },
  menuLabelDanger: {
    color: colors.error,
  },
  menuSublabel: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[2],
    paddingVertical: 4,
    paddingHorizontal: spacing[3],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGhost,
  },
  editBtnText: {
    ...textStyles.labelSmall,
    color: colors.primary,
    fontSize: 12,
  },
  version: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
