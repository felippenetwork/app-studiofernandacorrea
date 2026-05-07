import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStackParamList } from '../../types';
import { colors, spacing, borderRadius, textStyles } from '../../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'BoomerangCamera'>;

const MAX_DURATION = 5;

export function BoomerangCameraScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const cameraRef = useRef<CameraView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const recordingActive = useRef(false);
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const startRecording = async () => {
    if (!cameraRef.current || recordingActive.current) return;
    recordingActive.current = true;
    setIsRecording(true);

    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: MAX_DURATION * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressAnimation.current.start();

    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      if (result?.uri) {
        navigation.navigate('PostComposer', { capturedUri: result.uri, capturedType: 'boomerang' });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível gravar. Tente novamente.');
    } finally {
      recordingActive.current = false;
      setIsRecording(false);
      progressAnimation.current?.stop();
      progressAnim.setValue(0);
    }
  };

  const stopRecording = () => {
    if (!recordingActive.current) return;
    cameraRef.current?.stopRecording();
  };

  const requestPermissions = async () => {
    await requestCameraPermission();
    await requestMicPermission();
  };

  if (!cameraPermission || !micPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.container, styles.permContainer]}>
        <Ionicons name="videocam-off-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.permTitle}>Acesso necessário</Text>
        <Text style={styles.permDesc}>
          Precisamos da câmera e do microfone para gravar o boomerang.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermissions} activeOpacity={0.8}>
          <Text style={styles.permBtnText}>Permitir acesso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.permBack}>
          <Text style={styles.permBackText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      />

      {/* Overlay gradient hint */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing[3] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.titlePill}>
          <Ionicons name="refresh-outline" size={14} color="white" />
          <Text style={styles.titleText}>Boomerang · max {MAX_DURATION}s</Text>
        </View>

        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
        >
          <Ionicons name="camera-reverse-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Record button */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing[8] }]}>
        {!isRecording && (
          <Text style={styles.hint}>Segure o botão para gravar</Text>
        )}
        <TouchableOpacity
          style={[styles.recordOuter, isRecording && styles.recordOuterActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={1}
        >
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject },

  permContainer: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[8],
  },
  permTitle: { ...textStyles.h2, color: colors.textPrimary },
  permDesc: { ...textStyles.bodyMedium, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  permBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  permBtnText: { ...textStyles.button, color: 'white' },
  permBack: { marginTop: spacing[2] },
  permBackText: { ...textStyles.bodyMedium, color: colors.textTertiary },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeBtn: { padding: spacing[2] },
  flipBtn: { padding: spacing[2] },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  titleText: { ...textStyles.caption, color: 'white' },

  progressTrack: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
  },

  controls: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingTop: spacing[6],
  },
  hint: { ...textStyles.bodySmall, color: 'rgba(255,255,255,0.8)' },

  recordOuter: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },
  recordOuterActive: { borderColor: colors.primary },
  recordInner: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'white',
  },
  recordInnerActive: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#E04040',
  },
});
