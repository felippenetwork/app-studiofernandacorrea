import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppointmentsStackParamList } from '../types';
import { MyAppointmentsScreen } from '../screens/appointments/MyAppointmentsScreen';
import { AppointmentDetailScreen } from '../screens/appointments/AppointmentDetailScreen';
import { ReviewScreen } from '../screens/appointments/ReviewScreen';

const Stack = createNativeStackNavigator<AppointmentsStackParamList>();

export function AppointmentsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppointmentsList" component={MyAppointmentsScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen name="AppointmentReview" component={ReviewScreen} />
    </Stack.Navigator>
  );
}
