import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CouponsStackParamList } from '../types';
import { CouponsScreen } from '../screens/coupons/CouponsScreen';
import { CouponDetailsScreen } from '../screens/coupons/CouponDetailsScreen';

const Stack = createNativeStackNavigator<CouponsStackParamList>();

export function CouponsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CouponsList" component={CouponsScreen} />
      <Stack.Screen name="CouponDetails" component={CouponDetailsScreen} />
    </Stack.Navigator>
  );
}
