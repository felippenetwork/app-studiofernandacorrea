import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookingStackParamList, Service, ServiceCategory } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Badge } from '../../components/common';
import { MOCK_SERVICES } from '../../mocks/data';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { useBookingStore } from '../../store/bookingStore';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'Services'>;

const CATEGORIES: { key: ServiceCategory | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'cabelo', label: 'Cabelo' },
  { key: 'unhas', label: 'Unhas' },
  { key: 'sobrancelha', label: 'Sobrancelha' },
  { key: 'maquiagem', label: 'Maquiagem' },
  { key: 'estetica', label: 'Estética' },
];

export function ServicesScreen() {
  const navigation = useNavigation<Nav>();
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'todos'>('todos');
  const selectService = useBookingStore((s) => s.selectService);

  const filtered =
    activeCategory === 'todos'
      ? MOCK_SERVICES
      : MOCK_SERVICES.filter((s) => s.category === activeCategory);

  const handleSelect = (service: Service) => {
    selectService(service);
    navigation.navigate('ProfessionalSelection');
  };

  const renderService: ListRenderItem<Service> = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleSelect(item)}
      activeOpacity={0.85}
      style={styles.serviceCard}
    >
      <View style={styles.serviceLeft}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.serviceMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.metaText}>{formatDuration(item.durationMinutes)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.serviceRight}>
        <Text style={styles.servicePrice}>{formatCurrency(item.price)}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.border} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Serviços" subtitle="Escolha o serviço" />

      {/* Category filter */}
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item.key)}
            style={[
              styles.categoryChip,
              activeCategory === item.key && styles.categoryChipActive,
            ]}
          >
            <Text
              style={[
                styles.categoryLabel,
                activeCategory === item.key && styles.categoryLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesRow}
        contentContainerStyle={styles.categoriesContent}
      />

      {/* Service list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderService}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  categoriesRow: {
    maxHeight: 52,
    marginBottom: spacing[2],
  },
  categoriesContent: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
  },
  categoryChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryLabel: {
    ...textStyles.labelMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  categoryLabelActive: {
    color: colors.textOnPrimary,
  },
  list: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    paddingTop: spacing[3],
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  serviceLeft: {
    flex: 1,
    marginRight: spacing[3],
  },
  serviceName: {
    ...textStyles.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  serviceDesc: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  servicePrice: {
    ...textStyles.labelLarge,
    color: colors.primary,
  },
});
