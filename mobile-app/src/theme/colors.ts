export const colors = {
  // Brand — rose/mauve
  primary: '#C9A4A0',
  primaryLight: '#E8D0CE',
  primaryDark: '#A67B77',
  primaryGhost: '#F5ECEA',

  // Accent — champagne gold
  accent: '#C9A87C',
  accentLight: '#E8D9B8',
  accentDark: '#A68650',

  // Backgrounds
  background: '#F8F5F2',
  backgroundCard: '#FFFFFF',
  backgroundModal: '#FFFFFF',
  backgroundOverlay: 'rgba(0, 0, 0, 0.45)',

  // Text
  textPrimary: '#2C2C2C',
  textSecondary: '#7A7A7A',
  textTertiary: '#ABABAB',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',
  textLink: '#C9A4A0',

  // States
  success: '#7DB87D',
  successLight: '#D4EDD4',
  error: '#D47070',
  errorLight: '#F5DEDE',
  warning: '#D4A84B',
  warningLight: '#F5EAD0',
  info: '#7A9EC9',
  infoLight: '#D0DFF0',

  // Borders & Dividers
  border: '#EDE8E4',
  borderFocus: '#C9A4A0',
  divider: '#F0EBE8',

  // Navigation
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#C9A4A0',
  tabBarInactive: '#ABABAB',

  // Misc
  shadow: '#B8A09C',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof colors;
