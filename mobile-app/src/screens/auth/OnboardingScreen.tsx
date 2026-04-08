import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStackParamList } from '../../types';
import { colors, textStyles, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
};

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'calendar-outline',
    title: 'Agende com facilidade',
    subtitle: 'Escolha seu serviço, profissional e horário preferidos em poucos toques.',
  },
  {
    id: '2',
    icon: 'pricetag-outline',
    title: 'Cupons exclusivos',
    subtitle: 'Acesse promoções e descontos especiais disponíveis apenas para clientes do app.',
  },
  {
    id: '3',
    icon: 'star-outline',
    title: 'Benefícios premium',
    subtitle: 'Faça parte do nosso programa de vantagens e seja sempre bem atendida.',
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const renderSlide: ListRenderItem<Slide> = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[colors.primaryLight, colors.primaryGhost]}
          style={styles.iconGradient}
        >
          <Ionicons name={item.icon} size={48} color={colors.primary} />
        </LinearGradient>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.replace('Login')}
        style={styles.skipBtn}
      >
        <Text style={styles.skipText}>Pular</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.list}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          label={currentIndex === SLIDES.length - 1 ? 'Começar' : 'Próximo'}
          onPress={handleNext}
        />
        {currentIndex === SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>Não tem conta? <Text style={styles.registerHighlight}>Cadastre-se</Text></Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: spacing[5],
    zIndex: 10,
  },
  skipText: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
  },
  list: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  iconContainer: {
    marginBottom: spacing[8],
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: {
    ...textStyles.displaySmall,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  slideSubtitle: {
    ...textStyles.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[8],
  },
  dot: {
    height: 6,
    borderRadius: borderRadius.full,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.border,
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  registerLink: {
    alignItems: 'center',
  },
  registerText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  registerHighlight: {
    color: colors.primary,
    ...textStyles.labelMedium,
  },
});
