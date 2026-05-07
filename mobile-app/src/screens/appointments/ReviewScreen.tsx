import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { Header, Button } from '../../components/common';
import { reviewsService } from '../../services/api/reviews';

type Route = RouteProp<AppointmentsStackParamList, 'AppointmentReview'>;
type Nav = NativeStackNavigationProp<AppointmentsStackParamList, 'AppointmentReview'>;

const STAR_LABELS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente!'];

export function ReviewScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => reviewsService.submit(params.appointmentId, rating, comment.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', params.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['review', params.appointmentId] });
      Alert.alert(
        '⭐ Obrigada!',
        'Sua avaliação foi registrada. Seu feedback nos ajuda a melhorar sempre!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (err: Error) => {
      Alert.alert('Erro', err.message || 'Não foi possível enviar a avaliação.', [{ text: 'OK' }]);
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Selecione uma nota', 'Toque nas estrelas para avaliar.');
      return;
    }
    submit();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Header
          title="Avaliação"
          subtitle={params.serviceName}
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="star" size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Como foi seu atendimento?</Text>
            <Text style={styles.heroSubtitle}>
              Sua avaliação ajuda a Fernanda a continuar oferecendo o melhor serviço.
            </Text>
          </View>

          {/* Stars */}
          <View style={styles.starsCard}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={44}
                    color={star <= rating ? '#F5A623' : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{STAR_LABELS[rating]}</Text>
            )}
          </View>

          {/* Comment */}
          <View style={styles.commentCard}>
            <Text style={styles.commentLabel}>Comentário <Text style={styles.optional}>(opcional)</Text></Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Conte como foi sua experiência..."
              placeholderTextColor={colors.textTertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          <Button
            label={isPending ? 'Enviando…' : 'Enviar avaliação'}
            onPress={handleSubmit}
            loading={isPending}
            disabled={rating === 0 || isPending}
            style={styles.cta}
          />

          <Button
            label="Agora não"
            onPress={() => navigation.goBack()}
            variant="ghost"
          />

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },

  hero: { alignItems: 'center', paddingVertical: spacing[6], gap: spacing[3] },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { ...textStyles.h2, color: colors.textPrimary, textAlign: 'center' },
  heroSubtitle: {
    ...textStyles.bodyMedium, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, maxWidth: 280,
  },

  starsCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[5],
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[3],
    ...shadows.sm,
  },
  starsRow: { flexDirection: 'row', gap: spacing[2] },
  ratingLabel: { ...textStyles.labelLarge, color: '#F5A623' },

  commentCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[5],
    ...shadows.sm,
  },
  commentLabel: { ...textStyles.labelMedium, color: colors.textPrimary, marginBottom: spacing[2] },
  optional: { ...textStyles.caption, color: colors.textTertiary, fontWeight: '400' },
  commentInput: {
    minHeight: 100,
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing[3],
    backgroundColor: colors.background,
  },
  charCount: { ...textStyles.caption, color: colors.textTertiary, textAlign: 'right', marginTop: spacing[1] },

  cta: { marginBottom: spacing[3] },
});
