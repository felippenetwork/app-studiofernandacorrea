import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from '../types';
import { AppointmentsNavigator } from './AppointmentsNavigator';
import { BookingNavigator } from './BookingNavigator';
import { CouponsNavigator } from './CouponsNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { colors, shadows, textStyles, borderRadius } from '../theme';
import { HomeNavigator } from './HomeNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<keyof MainTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Booking: { active: 'calendar', inactive: 'calendar-outline' },
  MyAppointments: { active: 'time', inactive: 'time-outline' },
  Coupons: { active: 'pricetag', inactive: 'pricetag-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: 'Início',
  Booking: 'Agendar',
  MyAppointments: 'Horários',
  Coupons: 'Cupons',
  Profile: 'Perfil',
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const routeName = route.name as keyof MainTabParamList;
        return {
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            { paddingBottom: insets.bottom + 4 },
          ],
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[routeName];
            const name = focused ? icons.active : icons.inactive;
            return <Ionicons name={name} size={22} color={color} />;
          },
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, { color }]}>
              {TAB_LABELS[routeName]}
            </Text>
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Booking" component={BookingNavigator} />
      <Tab.Screen name="MyAppointments" component={AppointmentsNavigator} />
      <Tab.Screen name="Coupons" component={CouponsNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopWidth: 0,
    height: 64,
    paddingTop: 8,
    ...shadows.md,
  },
  tabLabel: {
    ...textStyles.labelSmall,
    marginTop: 2,
    fontSize: 10,
  },
});
