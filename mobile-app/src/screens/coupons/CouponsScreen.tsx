import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { CouponsStackParamList, Coupon } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { CouponCard, Button } from '../../components/common';
import { couponsService } from '../../services/api/coupons';

type Nav = NativeStackNavigationProp<CouponsStackParamList, 'CouponsList'>;
type FilterTab = 'ativos' | 'todos';

export function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ativos');

  const { data: coupons = [], isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['coupons'],
    queryFn: couponsService.getCoupons,
    staleTime: 1000 * 60 * 5,
  });

  const list =
    activeFilter === 'ativos'
      ? coupons.filter((c) => c.status === 'ativo')
      : coupons;

  const activeCount = coupons.filter((c) => c.status === 'ativo').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cupons</Text>
          <Text style={styles.subtitle}>Suas vantagens exclusivas</Text>
        </View>
        {activeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeCount} disponíveis</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {(['ativos', 'todos'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveFilter(tab)}
            style={[styles.tab, activeFilter === tab && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, activeFilter === tab && styles.tabLabelActive]}>
              {tab === 'ativos' ? 'Disponíveis' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Carregando cupons…</Text>
        </View>
      ) : isError ? (
        <View style={styles.stateCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.border} />
          <Text style={styles.stateTitle}>Erro ao carregar</Text>
          <Text style={styles.stateText}>Verifique sua conexão e tente novamente.</Text>
          <Button label="Tentar novamente" onPress={() => refetch()} variant="outline" style={styles.retryBtn} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CouponCard
              coupon={item}
              onPress={() => navigation.navigate('CouponDetails', { couponId: item.id })}
            />
          )}
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
              <Ionicons name="pricetag-outline" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>Nenhum cupom</Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'ativos'
                  ? 'Você não tem cupons ativos no momento.'
                  : 'Nenhum cupom disponível ainda.'}
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
    paddingTop: spacing[4],
    marginBottom: spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { ...textStyles.displaySmall, color: colors.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: colors.textTertiary, marginTop: 4 },
  badge: {
    backgroundColor: colors.primaryGhost,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  badgeText: { ...textStyles.caption, color: colors.primaryDark, fontWeight: '600' },
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
  stateCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing[8], gap: spacing[3],
  },
  stateTitle: { ...textStyles.h2, color: colors.textSecondary, textAlign: 'center' },
  stateText: { ...textStyles.bodySmall, color: colors.textTertiary, textAlign: 'center' },
  retryBtn: { marginTop: spacing[2] },
  empty: { alignItems: 'center', paddingTop: spacing[12], gap: spacing[3] },
  emptyTitle: { ...textStyles.h2, color: colors.textTertiary },
  emptyText: { ...textStyles.bodySmall, color: colors.textTertiary, textAlign: 'center', maxWidth: 240 },
});
