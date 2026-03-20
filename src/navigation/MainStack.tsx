import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { MainStackParamList } from './types';

import MainTabs from './MainTabs';

// ── Screens that do NOT show the bottom tab bar (focused/checkout flows) ──────
import HostelBookingScreen from '../screens/hostels/HostelBookingScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import PaymentProcessingScreen from '../screens/payment/PaymentProcessingScreen';
import BookingSuccessScreen from '../screens/payment/BookingSuccessScreen';
// Global utility screens accessible from deep links / other stacks
import AadhaarVerifyScreen from '../screens/verification/AadhaarVerifyScreen';
import UploadDLScreen from '../screens/verification/UploadDLScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import ExtendBookingScreen from '../screens/bookings/ExtendBookingScreen';
import SearchScreen from '../screens/home/SearchScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';

const Stack = createStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* MainTabs renders the bottom tab bar for all nested screens */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* ── Focused checkout / payment flow (no tab bar) ── */}
      <Stack.Screen name="HostelBooking" component={HostelBookingScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />

      {/* ── Global utility screens (accessible from any navigator via upward traversal) ── */}
      <Stack.Screen name="AadhaarVerify" component={AadhaarVerifyScreen} />
      <Stack.Screen name="UploadDL" component={UploadDLScreen} />
      {/* BookingDetail / ExtendBooking kept here so BookingSuccess can navigate to them */}
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="ExtendBooking" component={ExtendBookingScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ExploreTab" component={ExploreScreen} />
    </Stack.Navigator>
  );
}
