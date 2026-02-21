import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { MainStackParamList } from './types';

import MainTabs from './MainTabs';
import BikeDetailScreen from '../screens/bikes/BikeDetailScreen';
import HostelDetailScreen from '../screens/hostels/HostelDetailScreen';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import PaymentProcessingScreen from '../screens/payment/PaymentProcessingScreen';
import BookingSuccessScreen from '../screens/payment/BookingSuccessScreen';
import BookingsListScreen from '../screens/bookings/BookingsListScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import ExtendBookingScreen from '../screens/bookings/ExtendBookingScreen';
import AadhaarVerifyScreen from '../screens/verification/AadhaarVerifyScreen';
import UploadDLScreen from '../screens/verification/UploadDLScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ReferralScreen from '../screens/profile/ReferralScreen';
import SearchScreen from '../screens/home/SearchScreen';

const Stack = createStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="BikeDetail" component={BikeDetailScreen} />
      <Stack.Screen name="HostelDetail" component={HostelDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="ExtendBooking" component={ExtendBookingScreen} />
      <Stack.Screen name="AadhaarVerify" component={AadhaarVerifyScreen} />
      <Stack.Screen name="UploadDL" component={UploadDLScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );
}
