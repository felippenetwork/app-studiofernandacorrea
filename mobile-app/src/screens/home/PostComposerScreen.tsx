import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Image,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStackParamList, MediaType } from '../../types';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../theme';
import { postsService } from '../../services/api/posts';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'PostComposer'>;
type Route = RouteProp<HomeStackParamList, 'PostComposer'>;

const MEDIA_OPTIONS: { type: MediaType; icon: string; label: string; color: string }[] = [
  { type: 'photo',     icon: 'image-outline',    label: 'Foto',      color: '#4A90E2' },
  { type: 'video',     icon: 'videocam-outline',  label: 'Vídeo',     color: '#E2844A' },
  { type: 'boomerang', icon: 'refresh-outline',   label: 'Boomerang', color: colors.primary },
];

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export function PostComposerScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [text, setText] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('photo');
  const consumedUri = useRef<string | null>(null);

  // Receive media captured by BoomerangCamera
  useEffect(() => {
    if (params?.capturedUri && params.capturedUri !== consumedUri.current) {
      consumedUri.current = params.capturedUri;
      setMediaUri(params.capturedUri);
      setMediaType(params.capturedType ?? 'boomerang');
    }
  }, [params?.capturedUri]);

  const { mutate: publish, isPending } = useMutation({
    mutationFn: () => postsService.createPost(text.trim(), mediaUri!, mediaType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const serverMsg: string | undefined = err?.response?.data?.message;

      if (status === 403) {
        Alert.alert(
          '🔒 Recurso exclusivo para clientes',
          serverMsg ??
            'Para publicar no feed você precisa ter pelo menos um atendimento concluído no Studio Fernanda Correa.\n\nAgende o seu horário e, após o atendimento, você poderá compartilhar sua experiência! 💕',
          [{ text: 'Entendido' }]
        );
      } else if (status === 400) {
        Alert.alert('Dados inválidos', serverMsg ?? 'Verifique o texto e a mídia e tente novamente.');
      } else if (!status) {
        Alert.alert(
          'Sem conexão',
          'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
        );
      } else {
        Alert.alert('Erro ao publicar', serverMsg ?? 'Não foi possível publicar. Tente novamente.');
      }
    },
  });

  const openCamera = async (type: MediaType) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: type === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      videoMaxDuration: 30,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(type);
    }
  };

  const openGallery = async (type: MediaType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      videoMaxDuration: 30,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(type);
    }
  };

  const handleMediaOption = (type: MediaType) => {
    if (type === 'boomerang') {
      navigation.navigate('BoomerangCamera');
      return;
    }
    const label = type === 'photo' ? 'Foto' : 'Vídeo';
    Alert.alert(label, 'Como quer adicionar?', [
      { text: 'Câmera', onPress: () => openCamera(type) },
      { text: 'Galeria', onPress: () => openGallery(type) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const canPublish = text.trim().length > 0 && !!mediaUri && !isPending;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Novo post</Text>
        <TouchableOpacity
          onPress={() => publish()}
          disabled={!canPublish}
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
          activeOpacity={0.8}
        >
          {isPending
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={styles.publishBtnText}>Publicar</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* User row */}
          <View style={styles.userRow}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>
                {user?.name ? initials(user.name) : 'EU'}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.name ?? 'Você'}</Text>
          </View>

          {/* Text input */}
          <TextInput
            style={styles.textInput}
            placeholder="Compartilhe sua experiência no estúdio..."
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={[styles.charCount, text.length > 450 && styles.charCountWarning]}>
            {text.length}/500
          </Text>

          {/* Media preview */}
          {mediaUri && (
            <View style={styles.previewWrapper}>
              {mediaType === 'photo' ? (
                <Image source={{ uri: mediaUri }} style={styles.preview} resizeMode="cover" />
              ) : (
                <Video
                  source={{ uri: mediaUri }}
                  style={styles.preview}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={mediaType === 'boomerang'}
                  isLooping={mediaType === 'boomerang'}
                  useNativeControls={mediaType === 'video'}
                  isMuted={mediaType === 'boomerang'}
                />
              )}
              <TouchableOpacity
                style={styles.removeMedia}
                onPress={() => setMediaUri(null)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Ionicons name="close-circle" size={28} color="white" />
              </TouchableOpacity>
              <View style={styles.mediaTypePill}>
                <Ionicons
                  name={mediaType === 'photo' ? 'image-outline' : mediaType === 'video' ? 'videocam-outline' : 'refresh-outline'}
                  size={11}
                  color="white"
                />
                <Text style={styles.mediaTypePillText}>{mediaType}</Text>
              </View>
            </View>
          )}

          {/* Media options */}
          <View style={styles.mediaSection}>
            <Text style={styles.mediaSectionLabel}>
              Adicionar mídia{' '}
              <Text style={styles.mediaSectionRequired}>(obrigatório)</Text>
            </Text>
            <View style={styles.mediaRow}>
              {MEDIA_OPTIONS.map((opt) => {
                const isActive = mediaType === opt.type && !!mediaUri;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.mediaBtn, isActive && { borderColor: opt.color, backgroundColor: `${opt.color}12` }]}
                    onPress={() => handleMediaOption(opt.type)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={opt.icon} size={22} color={isActive ? opt.color : colors.textSecondary} />
                    <Text style={[styles.mediaBtnLabel, isActive && { color: opt.color }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!mediaUri && (
              <Text style={styles.mediaHint}>
                Foto, vídeo (até 30s) ou boomerang (até 5s em loop)
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cancelBtn: { paddingVertical: spacing[1] },
  cancelText: { ...textStyles.bodyMedium, color: colors.textSecondary },
  topTitle: { ...textStyles.h3, color: colors.textPrimary },
  publishBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minWidth: 80,
    alignItems: 'center',
  },
  publishBtnDisabled: { backgroundColor: colors.border },
  publishBtnText: { ...textStyles.labelMedium, color: 'white' },

  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  avatarFallback: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { ...textStyles.labelMedium, color: colors.primary, fontWeight: '700' },
  userName: { ...textStyles.labelLarge, color: colors.textPrimary },

  textInput: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    minHeight: 100,
    paddingTop: 0,
    marginBottom: spacing[1],
  },
  charCount: { ...textStyles.caption, color: colors.textTertiary, textAlign: 'right', marginBottom: spacing[4] },
  charCountWarning: { color: colors.warning },

  previewWrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing[5],
  },
  preview: { width: '100%', aspectRatio: 1 },
  removeMedia: {
    position: 'absolute', top: spacing[2], right: spacing[2],
  },
  mediaTypePill: {
    position: 'absolute',
    bottom: spacing[2], left: spacing[2],
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2], paddingVertical: 3,
  },
  mediaTypePillText: { ...textStyles.caption, color: 'white', fontSize: 10, textTransform: 'capitalize' },

  mediaSection: { marginTop: spacing[2] },
  mediaSectionLabel: { ...textStyles.labelMedium, color: colors.textPrimary, marginBottom: spacing[3] },
  mediaSectionRequired: { ...textStyles.caption, color: colors.textTertiary, fontWeight: '400' },
  mediaRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[3] },
  mediaBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    ...shadows.sm,
  },
  mediaBtnLabel: { ...textStyles.labelSmall, color: colors.textSecondary },
  mediaHint: { ...textStyles.caption, color: colors.textTertiary, textAlign: 'center' },
});
