import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList, Benefit, BenefitType } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common';
import { MOCK_BENEFITS } from '../../mocks/data';
import { formatDateShort } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Benefits'>;

const BENEFIT_ICONS: Record<BenefitType, keyof typeof Ionicons.glyphMap> = {
  promocao: 'gift-outline',
  evento: 'calendar-outline',
  novidade: 'sparkles-outline',
  exclusivo: 'star-outline',
};

const BENEFIT_COLORS: Record<BenefitType, [string, string]> = {
  promocao: [colors.primary, colors.primaryDark],
  evento: [colors.accent, colors.accentDark],
  novidade: ['#9B7FCC', '#7B5FAC'],
  exclusivo: [colors.accent, colors.primary],
};

export function BenefitsScreen() {
  const navigation = useNavigation<Nav>();

  const renderBenefit = ({ item }: { item: Benefit }) => {
    const icon = BENEFIT_ICONS[item.type];
    const gradientColors = BENEFIT_COLORS[item.type];

    return (
      <View style={styles.card}>
        <LinearGradient
          colors={gradientColors}
          style={styles.cardHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={28} color={colors.textOnPrimary} />
          </View>
          {item.validUntil && (
            <View style={styles.validityChip}>
              <Text style={styles.validityText}>até {formatDateShort(item.validUntil)}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDesc}>{item.description}</Text>
          {item.cta && (
            <TouchableOpacity style={styles.ctaBtn}>
              <Text style={styles.ctaText}>{item.cta}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Benefícios"
        subtitle="Exclusivos para clientes do app"
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={MOCK_BENEFITS}
        keyExtractor={(item) => item.id}
        renderItem={renderBenefit}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing[4] }} />}
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
    paddingBottom: spacing[8],
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    height: 120,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing[5],
    flexDirection: 'row',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validityChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  validityText: {
    ...textStyles.caption,
    color: colors.textOnPrimary,
  },
  cardBody: {
    padding: spacing[5],
  },
  cardTitle: {
    ...textStyles.h1,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  cardDesc: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  ctaText: {
    ...textStyles.labelMedium,
    color: colors.primary,
  },
});
