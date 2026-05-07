import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { PostComposerScreen } from '../screens/home/PostComposerScreen';
import { BoomerangCameraScreen } from '../screens/home/BoomerangCameraScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="PostComposer" component={PostComposerScreen} />
      <Stack.Screen
        name="BoomerangCamera"
        component={BoomerangCameraScreen}
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
