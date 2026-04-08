import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button } from '../../components/common';
import { MOCK_TIME_SLOTS } from '../../mocks/data';
import { formatDateCalendar } from '../../utils/formatters';
import { useBookingStore } from '../../store/bookingStore';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'TimeSelection'>;

export function TimeSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedDate, selectedService, selectedTime, selectTime } = useBookingStore();
  const [selected, setSelected] = useState<string | null>(selectedTime);

  const handleContinue = () => {
    if (!selected) return;
    selectTime(selected);
    navigation.navigate('AppointmentSummary');
  };

  const numColumns = 4;

  return (
    <View style={styles.container}>
      <Header
        title="Escolha o Horário"
        subtitle={selectedService?.name}
        showBack
        onBack={() => navigation.goBack()}
      />

      {selectedDate && (
        <Text style={styles.dateLabel}>
          {formatDateCalendar(selectedDate)}
        </Text>
      )}

      <FlatList
        data={MOCK_TIME_SLOTS}
        keyExtractor={(item) => item.time}
        numColumns={numColumns}
        renderItem={({ item }) => {
          const isSelected = selected === item.time;
          return (
            <TouchableOpacity
              onPress={() => item.available && setSelected(item.time)}
              disabled={!item.available}
              style={[
                styles.slot,
                isSelected && styles.slotSelected,
                !item.available && styles.slotUnavailable,
              ]}
            >
              <Text
                style={[
                  styles.slotTime,
                  isSelected && styles.slotTimeSelected,
                  !item.available && styles.slotTimeUnavailable,
                ]}
              >
                {item.time}
              </Text>
              {!item.available && (
                <Text style={styles.slotSubLabel}>Ocupado</Text>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Button
          label="Continuar"
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
  dateLabel: {
    ...textStyles.h3,
    color: colors.textPrimary,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[4],
    textTransform: 'capitalize',
  },
  grid: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  slot: {
    flex: 1,
    margin: spacing[1],
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotUnavailable: {
    backgroundColor: colors.divider,
    borderColor: colors.divider,
    opacity: 0.6,
  },
  slotTime: {
    ...textStyles.labelMedium,
    color: colors.textPrimary,
  },
  slotTimeSelected: {
    color: colors.textOnPrimary,
  },
  slotTimeUnavailable: {
    color: colors.textTertiary,
  },
  slotSubLabel: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: 2,
    fontSize: 9,
  },
  footer: {
    padding: spacing[5],
  },
});
