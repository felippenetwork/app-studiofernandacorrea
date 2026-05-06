import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { BookingStackParamList, Service, ServiceCategory } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button } from '../../components/common';
import { servicesService } from '../../services/api/services';
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

  const { data: services = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['services'],
    queryFn: servicesService.getServices,
    staleTime: 1000 * 60 * 10,
  });

  const filtered =
    activeCategory === 'todos'
      ? services
      : services.filter((s) => s.category === activeCategory);

  const handleSelect = (service: Service) => {
    selectService(service);
    if (service.variations && service.variations.length > 0) {
      navigation.navigate('ServiceVariation');
    } else {
      navigation.navigate('ProfessionalSelection');
    }
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
        <Text style={styles.servicePrice}>
          {item.variations && item.variations.length > 0
            ? `a partir de ${formatCurrency(Math.min(...item.variations.map((v) => v.price)))}`
            : formatCurrency(item.price)}
        </Text>
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
            style={[styles.categoryChip, activeCategory === item.key && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryLabel, activeCategory === item.key && styles.categoryLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesRow}
        contentContainerStyle={styles.categoriesContent}
      />

      {isLoading ? (
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Carregando serviços…</Text>
        </View>
      ) : isError ? (
        <View style={styles.stateCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.border} />
          <Text style={styles.stateTitle}>Não foi possível carregar</Text>
          <Text style={styles.stateText}>Verifique sua conexão e tente novamente.</Text>
          <Button label="Tentar novamente" onPress={() => refetch()} variant="outline" style={styles.retryBtn} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.stateCenter}>
          <Ionicons name="cut-outline" size={48} color={colors.border} />
          <Text style={styles.stateTitle}>Nenhum serviço</Text>
          <Text style={styles.stateText}>Nenhum serviço nesta categoria no momento.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderService}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  categoriesRow: { maxHeight: 52, marginBottom: spacing[2] },
  categoriesContent: { paddingHorizontal: spacing[5], gap: spacing[2] },
  categoryChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryLabel: { ...textStyles.labelMedium, color: colors.textSecondary, fontSize: 13 },
  categoryLabelActive: { color: colors.textOnPrimary },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[8], paddingTop: spacing[3] },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.sm,
  },
  serviceLeft: { flex: 1, marginRight: spacing[3] },
  serviceName: { ...textStyles.h3, color: colors.textPrimary, marginBottom: 4 },
  serviceDesc: { ...textStyles.bodySmall, color: colors.textSecondary, marginBottom: spacing[2] },
  serviceMeta: { flexDirection: 'row', gap: spacing[3] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...textStyles.caption, color: colors.textTertiary },
  serviceRight: { alignItems: 'flex-end', gap: spacing[2] },
  servicePrice: { ...textStyles.labelLarge, color: colors.primary },
  stateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  stateTitle: { ...textStyles.h2, color: colors.textSecondary, textAlign: 'center' },
  stateText: { ...textStyles.bodySmall, color: colors.textTertiary, textAlign: 'center' },
  retryBtn: { marginTop: spacing[2] },
});
