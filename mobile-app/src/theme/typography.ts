import { Platform } from 'react-native';

export const fontFamilies = {
  // Serif — headings, display titles
  playfair: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semiBold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
    italic: 'PlayfairDisplay_400Regular_Italic',
  },
  // Sans-serif — body, labels, buttons
  josefin: {
    thin: 'JosefinSans_100Thin',
    light: 'JosefinSans_300Light',
    regular: 'JosefinSans_400Regular',
    semiBold: 'JosefinSans_600SemiBold',
    bold: 'JosefinSans_700Bold',
  },
  // System fallback
  system: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const lineHeights = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
  loose: 2,
} as const;

export const letterSpacings = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

export const textStyles = {
  // Display — screen titles, onboarding headlines
  displayLarge: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: fontSizes['4xl'],
    lineHeight: fontSizes['4xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  displayMedium: {
    fontFamily: fontFamilies.playfair.semiBold,
    fontSize: fontSizes['3xl'],
    lineHeight: fontSizes['3xl'] * lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  },
  displaySmall: {
    fontFamily: fontFamilies.playfair.medium,
    fontSize: fontSizes['2xl'],
    lineHeight: fontSizes['2xl'] * lineHeights.snug,
  },
  // Headings
  h1: {
    fontFamily: fontFamilies.playfair.semiBold,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.snug,
  },
  h2: {
    fontFamily: fontFamilies.playfair.medium,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.snug,
  },
  h3: {
    fontFamily: fontFamilies.josefin.semiBold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
  // Body
  bodyLarge: {
    fontFamily: fontFamilies.josefin.regular,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.relaxed,
  },
  bodyMedium: {
    fontFamily: fontFamilies.josefin.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  bodySmall: {
    fontFamily: fontFamilies.josefin.light,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.relaxed,
  },
  // Labels
  labelLarge: {
    fontFamily: fontFamilies.josefin.semiBold,
    fontSize: fontSizes.md,
    letterSpacing: letterSpacings.wider,
  },
  labelMedium: {
    fontFamily: fontFamilies.josefin.semiBold,
    fontSize: fontSizes.sm,
    letterSpacing: letterSpacings.wider,
  },
  labelSmall: {
    fontFamily: fontFamilies.josefin.regular,
    fontSize: fontSizes.xs,
    letterSpacing: letterSpacings.widest,
  },
  // Caption
  caption: {
    fontFamily: fontFamilies.josefin.light,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
  },
  // Button
  button: {
    fontFamily: fontFamilies.josefin.semiBold,
    fontSize: fontSizes.md,
    letterSpacing: letterSpacings.wide,
  },
  buttonSmall: {
    fontFamily: fontFamilies.josefin.semiBold,
    fontSize: fontSizes.sm,
    letterSpacing: letterSpacings.wide,
  },
} as const;
