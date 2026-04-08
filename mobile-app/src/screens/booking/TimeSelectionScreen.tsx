import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { BookingStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { Header, Button } from '../../components/common';
import { servicesService } from '../../services/api/services';
import { formatDateCalendar } from '../../utils/formatters';
import { useBookingStore } from '../../store/bookingStore';

type Nav = NativeStackNavigationProp<BookingStackParamList, 'TimeSelection'>;

export function TimeSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedDate, selectedService, selectedProfessional, selectedTime, selectTime } =
    useBookingStore();
  const [selected, setSelected] = useState<string | null>(selectedTime);

  const { data: slots = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['slots', selectedProfessional?.id, selectedService?.id, selectedDate],
    queryFn: () =>
      servicesService.getAvailableSlots(
        selectedProfessional!.id,
        selectedService!.id,
        selectedDate!
      ),
    enabled: !!(selectedProfessional && selectedService && selectedDate),
    staleTime: 1000 * 60 * 2, // slots expire quickly
  });

  const handleContinue = () => {
    if (!selected) return;
    selectTime(selected);
    navigation.navigate('AppointmentSummary');
  };

  return (
    <View style={styles.container}>
      <Header
        title="Escolha o Horário"
        subtitle={selectedService?.name}
        showBack
        onBack={() => navigation.goBack()}
      />

      {selectedDate && (
        <Text style={styles.dateLabel}>{formatDateCalendar(selectedDate)}</Text>
      )}

      {isLoading ? (
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Verificando disponibilidade…</Text>
        </View>
      ) : isError ? (
        <View style={styles.stateCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.border} />
          <Text style={styles.stateTitle}>Erro ao carregar horários</Text>
          <Text style={styles.stateText}>Não foi possível consultar a agenda. Tente novamente.</Text>
          <Button label="Tentar novamente" onPress={() => refetch()} variant="outline" style={styles.retryBtn} />
        </View>
      ) : slots.length === 0 ? (
        <View style={styles.stateCenter}>
          <Ionicons name="calendar-outline" size={48} color={colors.border} />
          <Text style={styles.stateTitle}>Sem horários disponíveis</Text>
          <Text style={styles.stateText}>Não há horários disponíveis para esta data. Tente outra data.</Text>
          <Button label="Escolher outra data" onPress={() => navigation.goBack()} variant="outline" style={styles.retryBtn} />
        </View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.time}
          numColumns={4}
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
      )}

      {!isLoading && !isError && slots.length > 0 && (
        <View style={styles.footer}>
          <Button label="Continuar" onPress={handleContinue} disabled={!selected} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dateLabel: {
    ...textStyles.h3,
    color: colors.textPrimary,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[4],
    textTransform: 'capitalize',
  },
  grid: { paddingHorizontal: spacing[4], gap: spacing[3] },
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
  slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotUnavailable: { backgroundColor: colors.divider, borderColor: colors.divider, opacity: 0.6 },
  slotTime: { ...textStyles.labelMedium, color: colors.textPrimary },
  slotTimeSelected: { color: colors.textOnPrimary },
  slotTimeUnavailable: { color: colors.textTertiary },
  slotSubLabel: { ...textStyles.caption, color: colors.textTertiary, marginTop: 2, fontSize: 9 },
  footer: { padding: spacing[5] },
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
