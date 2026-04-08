import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Card, Badge, CouponCard } from '../../components/common';
import {
  MOCK_APPOINTMENTS,
  MOCK_COUPONS,
  MOCK_BENEFITS,
} from '../../mocks/data';
import { formatDateRelative, formatCurrency, appointmentStatusLabel, appointmentStatusColor } from '../../utils/formatters';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<any>();

  const nextAppointment = MOCK_APPOINTMENTS.find(
    (a) => a.status === 'confirmado' || a.status === 'pendente_pagamento'
  );
  const activeCoupons = MOCK_COUPONS.filter((c) => c.status === 'ativo').slice(0, 2);

  const firstName = user?.name?.split(' ')[0] ?? 'Bem-vinda';

  const quickActions = [
    { icon: 'calendar-outline' as const, label: 'Agendar', route: 'Booking' },
    { icon: 'time-outline' as const, label: 'Horários', route: 'MyAppointments' },
    { icon: 'pricetag-outline' as const, label: 'Cupons', route: 'Coupons' },
    { icon: 'person-outline' as const, label: 'Perfil', route: 'Profile' },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
          <Text style={styles.greetingSub}>Que bom ter você aqui</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { screen: 'Notifications' })}
          style={styles.notifBtn}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.route}
            onPress={() => navigation.navigate(action.route)}
            style={styles.quickActionBtn}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name={action.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Next Appointment */}
      {nextAppointment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximo Agendamento</Text>
          <Card style={styles.nextApptCard} shadow="md">
            <View style={styles.nextApptAccent} />
            <View style={styles.nextApptContent}>
              <View style={styles.nextApptTop}>
                <Text style={styles.nextApptService}>{nextAppointment.service.name}</Text>
                <Badge
                  label={appointmentStatusLabel(nextAppointment.status)}
                  variant={nextAppointment.status === 'confirmado' ? 'success' : 'warning'}
                />
              </View>
              <View style={styles.nextApptRow}>
                <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.nextApptInfo}>{nextAppointment.professional.name}</Text>
              </View>
              <View style={styles.nextApptRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.nextApptInfo}>
                  {formatDateRelative(nextAppointment.appointmentDate)} · {nextAppointment.appointmentTime}
                </Text>
              </View>
              <View style={styles.nextApptFooter}>
                <Text style={styles.nextApptPrice}>{formatCurrency(nextAppointment.servicePrice)}</Text>
                {nextAppointment.status === 'pendente_pagamento' && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Booking', { screen: 'Payment' })}
                    style={styles.payBtn}
                  >
                    <Text style={styles.payBtnText}>Pagar taxa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Featured Coupon */}
      {activeCoupons.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cupom em Destaque</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Coupons')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <CouponCard
            coupon={activeCoupons[0]}
            onPress={() =>
              navigation.navigate('Coupons', {
                screen: 'CouponDetails',
                params: { couponId: activeCoupons[0].id },
              })
            }
            compact
          />
        </View>
      )}

      {/* Benefits */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Benefícios</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile', { screen: 'Benefits' })}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.benefitsScroll}>
          {MOCK_BENEFITS.map((benefit) => (
            <Card key={benefit.id} style={styles.benefitCard} shadow="sm">
              <View style={styles.benefitIcon}>
                <Ionicons
                  name={
                    benefit.type === 'promocao' ? 'gift-outline'
                    : benefit.type === 'novidade' ? 'sparkles-outline'
                    : 'star-outline'
                  }
                  size={24}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.benefitTitle} numberOfLines={2}>{benefit.title}</Text>
              <Text style={styles.benefitDesc} numberOfLines={3}>{benefit.description}</Text>
            </Card>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: spacing[8] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[4],
    marginBottom: spacing[6],
  },
  greeting: {
    ...textStyles.displaySmall,
    color: colors.textPrimary,
  },
  greetingSub: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    marginTop: 4,
  },
  notifBtn: {
    padding: spacing[2],
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[6],
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    ...shadows.sm,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: spacing[2],
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...textStyles.labelSmall,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...textStyles.h3,
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },
  sectionLink: {
    ...textStyles.bodySmall,
    color: colors.primary,
  },
  nextApptCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  nextApptAccent: {
    width: 4,
    backgroundColor: colors.primary,
  },
  nextApptContent: {
    flex: 1,
    padding: spacing[4],
  },
  nextApptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  nextApptService: {
    ...textStyles.h3,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing[2],
  },
  nextApptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  nextApptInfo: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  nextApptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  nextApptPrice: {
    ...textStyles.labelLarge,
    color: colors.primary,
  },
  payBtn: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  payBtnText: {
    ...textStyles.buttonSmall,
    color: colors.warning,
  },
  benefitsScroll: {
    marginHorizontal: -spacing[5],
    paddingHorizontal: spacing[5],
  },
  benefitCard: {
    width: 180,
    marginRight: spacing[3],
    padding: spacing[4],
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  benefitTitle: {
    ...textStyles.h3,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  benefitDesc: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
