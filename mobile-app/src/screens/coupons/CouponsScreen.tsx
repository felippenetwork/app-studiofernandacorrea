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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CouponsStackParamList, Coupon } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { CouponCard } from '../../components/common';
import { MOCK_COUPONS } from '../../mocks/data';

type Nav = NativeStackNavigationProp<CouponsStackParamList, 'CouponsList'>;

type FilterTab = 'ativos' | 'todos';

export function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ativos');

  const list =
    activeFilter === 'ativos'
      ? MOCK_COUPONS.filter((c) => c.status === 'ativo')
      : MOCK_COUPONS;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Cupons</Text>
        <Text style={styles.subtitle}>Suas vantagens exclusivas</Text>
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

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CouponCard
            coupon={item}
            onPress={() =>
              navigation.navigate('CouponDetails', { couponId: item.id })
            }
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Nenhum cupom</Text>
            <Text style={styles.emptyText}>Novos cupons aparecerão aqui quando disponíveis.</Text>
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
    paddingTop: spacing[4],
    marginBottom: spacing[4],
  },
  title: {
    ...textStyles.displaySmall,
    color: colors.textPrimary,
  },
  subtitle: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    marginTop: 4,
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
