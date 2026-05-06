import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../types';
import { ServicesScreen } from '../screens/booking/ServicesScreen';
import { ServiceVariationScreen } from '../screens/booking/ServiceVariationScreen';
import { ProfessionalSelectionScreen } from '../screens/booking/ProfessionalSelectionScreen';
import { ScheduleScreen } from '../screens/booking/ScheduleScreen';
import { TimeSelectionScreen } from '../screens/booking/TimeSelectionScreen';
import { AppointmentSummaryScreen } from '../screens/booking/AppointmentSummaryScreen';
import { PaymentScreen } from '../screens/booking/PaymentScreen';

const Stack = createNativeStackNavigator<BookingStackParamList>();

export function BookingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="ServiceVariation" component={ServiceVariationScreen} />
      <Stack.Screen name="ProfessionalSelection" component={ProfessionalSelectionScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="TimeSelection" component={TimeSelectionScreen} />
      <Stack.Screen name="AppointmentSummary" component={AppointmentSummaryScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
}
