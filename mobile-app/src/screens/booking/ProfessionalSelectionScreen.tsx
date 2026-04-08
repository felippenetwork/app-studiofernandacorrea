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
import { BookingStackParamList, Professional } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Avatar } from '../../components/common';
import { MOCK_PROFESSIONALS } from '../../mocks/data';
import { formatRating } from '../../utils/formatters';
import { useBookingStore } from '../../store/bookingStore';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'ProfessionalSelection'>;

export function ProfessionalSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedService, selectProfessional } = useBookingStore();

  const handleSelect = (professional: Professional) => {
    selectProfessional(professional);
    navigation.navigate('Schedule');
  };

  const renderProfessional: ListRenderItem<Professional> = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleSelect(item)}
      activeOpacity={0.85}
      style={styles.card}
    >
      <Avatar name={item.name} uri={item.avatarUrl} size="lg" />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color={colors.accent} />
          <Text style={styles.rating}>{formatRating(item.rating)}</Text>
          <Text style={styles.reviews}>({item.reviewCount} avaliações)</Text>
        </View>
        <View style={styles.specialties}>
          {item.specialties.map((s) => (
            <View key={s} style={styles.specialtyChip}>
              <Text style={styles.specialtyText}>{s}</Text>
            </View>
          ))}
        </View>
        {item.bio && (
          <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Profissional"
        subtitle={selectedService?.name}
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={MOCK_PROFESSIONALS}
        keyExtractor={(item) => item.id}
        renderItem={renderProfessional}
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
  list: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    ...shadows.sm,
  },
  info: {
    flex: 1,
    marginLeft: spacing[4],
    marginRight: spacing[2],
  },
  name: {
    ...textStyles.h2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing[2],
  },
  rating: {
    ...textStyles.labelMedium,
    color: colors.textPrimary,
  },
  reviews: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  specialtyChip: {
    backgroundColor: colors.primaryGhost,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  specialtyText: {
    ...textStyles.caption,
    color: colors.primaryDark,
  },
  bio: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
