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
import { colors, textStyles, spacing } from '../../theme';
import { Avatar, Card, Divider } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { appointmentsService } from '../../services/api/appointments';
import { settingsService } from '../../services/api/settings';
import { loyaltyService, LoyaltyInfo } from '../../services/api/loyalty';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

// ─── Loyalty Card ─────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  bronze: { label: 'Bronze', icon: '🥉', color: '#B45309', bg: '#FEF3C7' },
  prata:  { label: 'Prata',  icon: '🥈', color: '#475569', bg: '#F1F5F9' },
  ouro:   { label: 'Ouro',   icon: '🥇', color: '#B45309', bg: '#FEF9C3' },
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={loyaltyStyles.progressTrack}>
      <View style={[loyaltyStyles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function LoyaltyCard({ info }: { info: LoyaltyInfo }) {
  const tier = TIER_CONFIG[info.tier];

  const visitProgress = info.visitRewardActive ? info.visitCount % info.visitRewardCount : 0;
  const visitGoal = info.visitRewardCount;
  const rewardLabel = info.visitRewardDiscountType === 'percentage' && info.visitRewardDiscountValue >= 100
    ? 'serviço grátis'
    : info.visitRewardDiscountType === 'percentage'
    ? `${info.visitRewardDiscountValue}% de desconto`
    : `R$ ${info.visitRewardDiscountValue.toFixed(2)} de desconto`;

  return (
    <View style={loyaltyStyles.card}>
      {/* Header */}
      <View style={loyaltyStyles.header}>
        <View>
          <Text style={loyaltyStyles.title}>Programa de Fidelidade</Text>
          <Text style={loyaltyStyles.subtitle}>Studio Fernanda Correa</Text>
        </View>
        <View style={[loyaltyStyles.tierBadge, { backgroundColor: tier.bg }]}>
          <Text style={loyaltyStyles.tierIcon}>{tier.icon}</Text>
          <Text style={[loyaltyStyles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={loyaltyStyles.divider} />

      {/* Points section */}
      {info.pointsActive && (
        <View style={loyaltyStyles.section}>
          <View style={loyaltyStyles.row}>
            <Text style={loyaltyStyles.sectionLabel}>Pontos disponíveis</Text>
            <Text style={loyaltyStyles.sectionValue}>{info.balance} pts</Text>
          </View>
          <ProgressBar value={info.balance} max={info.redemptionThreshold} color={colors.primary} />
          <Text style={loyaltyStyles.hint}>
            {info.balance >= info.redemptionThreshold
              ? '🎉 Parabéns! Você ganhou um cupom de desconto!'
              : `Faltam ${info.redemptionThreshold - info.balance} pts para ganhar um cupom`}
          </Text>
          {info.nextTierPoints && (
            <View style={loyaltyStyles.tierRow}>
              <Text style={loyaltyStyles.tierHint}>
                Progresso para {info.tier === 'bronze' ? 'Prata 🥈' : 'Ouro 🥇'}
              </Text>
              <Text style={loyaltyStyles.tierHint}>
                {info.lifetimePoints}/{info.nextTierPoints} pts
              </Text>
            </View>
          )}
          {info.nextTierPoints && (
            <ProgressBar value={info.lifetimePoints} max={info.nextTierPoints} color="#94A3B8" />
          )}
        </View>
      )}

      {/* Visit reward section */}
      {info.visitRewardActive && (
        <>
          {info.pointsActive && <View style={loyaltyStyles.divider} />}
          <View style={loyaltyStyles.section}>
            <View style={loyaltyStyles.row}>
              <Text style={loyaltyStyles.sectionLabel}>Visitas neste ciclo</Text>
              <Text style={loyaltyStyles.sectionValue}>{visitProgress}/{visitGoal}</Text>
            </View>
            <ProgressBar value={visitProgress} max={visitGoal} color="#10B981" />
            <Text style={loyaltyStyles.hint}>
              {visitProgress >= visitGoal
                ? `🎁 Você ganhou um ${rewardLabel}!`
                : `Faltam ${visitGoal - visitProgress} visita${visitGoal - visitProgress !== 1 ? 's' : ''} para ganhar ${rewardLabel}`}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const loyaltyStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F3E8E7',
    overflow: 'hidden',
    shadowColor: '#C9A4A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: '#FDF8F8',
  },
  title: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tierIcon: { fontSize: 14 },
  tierLabel: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F9F0EF' },
  section: { padding: spacing[4] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { ...textStyles.caption, color: colors.textSecondary },
  sectionValue: { ...textStyles.labelSmall, color: colors.primary, fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: '#F3E8E7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  hint: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: 6,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    marginBottom: 6,
  },
  tierHint: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});

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

  const { data: appointments = [] } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: appointmentsService.getMyAppointments,
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const { data: config } = useQuery({
    queryKey: ['public-config'],
    queryFn: settingsService.getPublicConfig,
    staleTime: 1000 * 60 * 10,
  });

  const { data: loyalty } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: loyaltyService.getMyLoyalty,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const completedCount = appointments.filter((a) => a.status === 'concluido').length;

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
          { label: 'Agendamentos', value: appointments.length },
          { label: 'Concluídos', value: completedCount },
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

      {/* Loyalty card */}
      {loyalty && (loyalty.pointsActive || loyalty.visitRewardActive) && (
        <LoyaltyCard info={loyalty} />
      )}

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
