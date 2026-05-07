import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Appointment, AppointmentStatus, AppointmentsStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { AppointmentCard } from '../../components/common';
import { appointmentsService } from '../../services/api/appointments';
import { formatCurrency } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

type Nav = NativeStackNavigationProp<AppointmentsStackParamList, 'AppointmentsList'>;

type Tab = 'proximos' | 'historico';

const UPCOMING_STATUSES: AppointmentStatus[] = ['pendente_pagamento', 'confirmado'];
const PAST_STATUSES: AppointmentStatus[] = ['concluido', 'cancelado', 'nao_compareceu'];

export function MyAppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<Tab>('proximos');

  const {
    data: appointments = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['appointments'],
    queryFn: appointmentsService.getMyAppointments,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const list =
    activeTab === 'proximos'
      ? appointments.filter((a) => UPCOMING_STATUSES.includes(a.status))
      : appointments.filter((a) => PAST_STATUSES.includes(a.status));

  const renderItem = ({ item }: { item: Appointment }) => (
    <View>
      <AppointmentCard
        appointment={item}
        onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
      />
      {item.status === 'pendente_pagamento' && (
        <View style={styles.paymentAlert}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
          <Text style={styles.paymentAlertText}>
            Pague a taxa de reserva ({formatCurrency(item.bookingFee)}) para confirmar seu horário.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus Horários</Text>
        {appointments.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{appointments.length}</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {(['proximos', 'historico'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'proximos' ? 'Próximos' : 'Histórico'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Carregando agendamentos…</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>Nenhum agendamento</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'proximos'
                  ? 'Você não tem agendamentos próximos.\nAgende um serviço para começar!'
                  : 'Seu histórico de atendimentos aparecerá aqui.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  title: { ...textStyles.displaySmall, color: colors.textPrimary },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { ...textStyles.caption, color: colors.textOnPrimary, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    backgroundColor: colors.divider,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing[4],
  },
  tab: { flex: 1, paddingVertical: spacing[2], alignItems: 'center', borderRadius: borderRadius.sm - 2 },
  tabActive: { backgroundColor: colors.backgroundCard },
  tabLabel: { ...textStyles.labelMedium, color: colors.textTertiary, fontSize: 13 },
  tabLabelActive: { color: colors.textPrimary },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  paymentAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    marginTop: -spacing[2],
    marginBottom: spacing[3],
  },
  paymentAlertText: { ...textStyles.caption, color: colors.warning, flex: 1, lineHeight: 18 },
  stateCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing[8], gap: spacing[3],
  },
  stateText: { ...textStyles.bodySmall, color: colors.textTertiary, textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing[12], gap: spacing[3] },
  emptyTitle: { ...textStyles.h2, color: colors.textTertiary },
  emptyText: { ...textStyles.bodySmall, color: colors.textTertiary, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
});
