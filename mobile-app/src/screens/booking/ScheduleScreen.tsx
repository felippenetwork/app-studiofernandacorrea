import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { addDays, format, isSameDay, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookingStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button } from '../../components/common';
import { useBookingStore } from '../../store/bookingStore';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'Schedule'>;

// Generate the next 30 days
function generateDays(count: number) {
  const today = startOfToday();
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

const DAYS = generateDays(30);
const UNAVAILABLE_DATES = new Set(['Mon', 'Sun']); // closed days

export function ScheduleScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedProfessional, selectedService, selectedDate, selectDate } = useBookingStore();

  const [selected, setSelected] = useState<Date | null>(
    selectedDate ? new Date(selectedDate + 'T00:00:00') : null
  );

  const handleContinue = () => {
    if (!selected) return;
    selectDate(format(selected, 'yyyy-MM-dd'));
    navigation.navigate('TimeSelection');
  };

  const isUnavailable = (date: Date) => {
    const dayName = format(date, 'EEE', { locale: ptBR });
    return UNAVAILABLE_DATES.has(format(date, 'EEE'));
  };

  return (
    <View style={styles.container}>
      <Header
        title="Escolha a Data"
        subtitle={selectedService?.name}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Professional reminder */}
      <View style={styles.proBar}>
        <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.proBarText}>{selectedProfessional?.name}</Text>
      </View>

      {/* Month label */}
      <Text style={styles.monthLabel}>
        {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
      </Text>

      {/* Date grid */}
      <FlatList
        data={DAYS}
        keyExtractor={(d) => d.toISOString()}
        numColumns={7}
        renderItem={({ item: date }) => {
          const unavailable = isUnavailable(date);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const dayNum = format(date, 'd');
          const dayName = format(date, 'EEE', { locale: ptBR });

          return (
            <TouchableOpacity
              onPress={() => !unavailable && setSelected(date)}
              disabled={unavailable}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                unavailable && styles.dayCellUnavailable,
              ]}
            >
              <Text style={[styles.dayName, isSelected && styles.dayCellSelectedText, unavailable && styles.unavailableText]}>
                {dayName.slice(0, 3)}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayCellSelectedText, unavailable && styles.unavailableText]}>
                {dayNum}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Button
          label="Ver horários disponíveis"
          onPress={handleContinue}
          disabled={!selected}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  proBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primaryGhost,
    marginHorizontal: spacing[5],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
  },
  proBarText: {
    ...textStyles.bodySmall,
    color: colors.primaryDark,
  },
  monthLabel: {
    ...textStyles.h3,
    color: colors.textPrimary,
    textTransform: 'capitalize',
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  grid: {
    paddingHorizontal: spacing[4],
  },
  dayCell: {
    flex: 1,
    margin: 3,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundCard,
    ...shadows.xs,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellUnavailable: {
    backgroundColor: colors.divider,
  },
  dayCellSelectedText: {
    color: colors.textOnPrimary,
  },
  dayName: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textTransform: 'capitalize',
    fontSize: 9,
  },
  dayNum: {
    ...textStyles.labelMedium,
    color: colors.textPrimary,
    marginTop: 2,
    fontSize: 14,
  },
  unavailableText: {
    color: colors.textTertiary,
  },
  footer: {
    padding: spacing[5],
    backgroundColor: colors.background,
  },
});
