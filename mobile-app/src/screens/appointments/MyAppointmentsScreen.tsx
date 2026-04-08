import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Appointment, AppointmentStatus } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { AppointmentCard } from '../../components/common';
import { MOCK_APPOINTMENTS } from '../../mocks/data';

type Tab = 'proximos' | 'historico';

const UPCOMING_STATUSES: AppointmentStatus[] = ['pendente_pagamento', 'confirmado'];
const PAST_STATUSES: AppointmentStatus[] = ['concluido', 'cancelado', 'nao_compareceu'];

export function MyAppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('proximos');

  const list =
    activeTab === 'proximos'
      ? MOCK_APPOINTMENTS.filter((a) => UPCOMING_STATUSES.includes(a.status))
      : MOCK_APPOINTMENTS.filter((a) => PAST_STATUSES.includes(a.status));

  const renderItem = ({ item }: { item: Appointment }) => (
    <AppointmentCard appointment={item} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meus Horários</Text>
      </View>

      {/* Tabs */}
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

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Nenhum agendamento</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'proximos'
                ? 'Você não tem agendamentos próximos.'
                : 'Seu histórico de agendamentos aparecerá aqui.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  title: {
    ...textStyles.displaySmall,
    color: colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    backgroundColor: colors.divider,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing[4],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  tabActive: {
    backgroundColor: colors.backgroundCard,
  },
  tabLabel: {
    ...textStyles.labelMedium,
    color: colors.textTertiary,
    fontSize: 13,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing[12],
    gap: spacing[3],
  },
  emptyTitle: {
    ...textStyles.h2,
    color: colors.textTertiary,
  },
  emptyText: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    maxWidth: 240,
  },
});
