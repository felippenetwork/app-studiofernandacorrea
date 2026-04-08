import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  JosefinSans_100Thin,
  JosefinSans_300Light,
  JosefinSans_400Regular,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
} from '@expo-google-fonts/josefin-sans';
import * as SplashScreen from 'expo-splash-screen';
import * as ExpoNotifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import { useAuthStore } from './src/store/authStore';
import { pushNotificationsService } from './src/services/api/notifications';

SplashScreen.preventAutoHideAsync();

// Configure how notifications appear when the app is in the foreground
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

// Inner component so it can access auth store hooks
function AppInner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Register push token when user logs in; deregister on logout
  useEffect(() => {
    if (isAuthenticated && Platform.OS !== 'web') {
      pushNotificationsService.registerPushToken().catch(() => {
        // Non-fatal — user can still use the app without push notifications
      });
    }
  }, [isAuthenticated]);

  return <AppNavigator />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    JosefinSans_100Thin,
    JosefinSans_300Light,
    JosefinSans_400Regular,
    JosefinSans_600SemiBold,
    JosefinSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <View style={styles.root} onLayout={onLayoutRootView}>
              <StatusBar style="dark" backgroundColor={colors.background} />
              <AppInner />
            </View>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
