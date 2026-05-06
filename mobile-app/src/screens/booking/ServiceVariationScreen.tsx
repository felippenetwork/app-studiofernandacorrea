import React from 'react';
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
import { BookingStackParamList, ServiceVariation } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button } from '../../components/common';
import { useBookingStore } from '../../store/bookingStore';
import { formatCurrency, formatDuration } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'ServiceVariation'>;

export function ServiceVariationScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedService, selectedVariation, selectVariation } = useBookingStore();

  if (!selectedService) return null;

  const variations = selectedService.variations ?? [];

  const handleSelect = (variation: ServiceVariation) => {
    selectVariation(variation);
  };

  const handleContinue = () => {
    navigation.navigate('ProfessionalSelection');
  };

  const renderVariation: ListRenderItem<ServiceVariation> = ({ item }) => {
    const isSelected = selectedVariation?.id === item.id;
    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        activeOpacity={0.85}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioDot} />}
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.varName, isSelected && styles.varNameSelected]}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.varDesc}>{item.description}</Text>
          ) : null}
          <View style={styles.varMeta}>
            {item.durationMinutes ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.metaText}>{formatDuration(item.durationMinutes)}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.varPrice, isSelected && styles.varPriceSelected]}>
            {formatCurrency(item.price)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title={selectedService.name}
        subtitle="Selecione uma modalidade"
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={variations}
        keyExtractor={(item) => item.id}
        renderItem={renderVariation}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        ListFooterComponent={
          <Button
            label="Continuar"
            onPress={handleContinue}
            disabled={!selectedVariation}
            style={styles.cta}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  cardLeft: {
    marginRight: spacing[3],
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  cardBody: { flex: 1 },
  varName: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  varNameSelected: {
    color: colors.primary,
  },
  varDesc: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  varMeta: { flexDirection: 'row', gap: spacing[3] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...textStyles.caption, color: colors.textTertiary },
  cardRight: { marginLeft: spacing[3] },
  varPrice: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
  },
  varPriceSelected: {
    color: colors.primary,
  },
  cta: { marginTop: spacing[6] },
});
