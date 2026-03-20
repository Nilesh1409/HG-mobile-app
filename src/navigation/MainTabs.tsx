import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList, MainStackParamList } from './types';
import { useCartStore } from '../stores/cartStore';

// ── Tab root screens ──────────────────────────────────────────────────────────
import HomeScreen from '../screens/home/HomeScreen';
import BookingsListScreen from '../screens/bookings/BookingsListScreen';
import HostelLandingScreen from '../screens/hostels/HostelLandingScreen';
import ReferralScreen from '../screens/profile/ReferralScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// ── Bike flow screens ─────────────────────────────────────────────────────────
import BikeSearchScreen from '../screens/bikes/BikeSearchScreen';
import BikeDetailScreen from '../screens/bikes/BikeDetailScreen';
import CartScreen from '../screens/cart/CartScreen';

// ── Hostel flow screens ───────────────────────────────────────────────────────
import HostelSearchScreen from '../screens/hostels/HostelSearchScreen';
import HostelDetailScreen from '../screens/hostels/HostelDetailScreen';

// ── Bookings flow screens ─────────────────────────────────────────────────────
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import ExtendBookingScreen from '../screens/bookings/ExtendBookingScreen';

// ── Profile flow screens ──────────────────────────────────────────────────────
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AadhaarVerifyScreen from '../screens/verification/AadhaarVerifyScreen';
import UploadDLScreen from '../screens/verification/UploadDLScreen';
import SearchScreen from '../screens/home/SearchScreen';

// ── Per-tab stack navigators ──────────────────────────────────────────────────
// All typed with MainStackParamList so existing navigation.navigate() calls
// in screen files continue to work without any changes.
const BikeStack = createStackNavigator<MainStackParamList>();
const HostelStack = createStackNavigator<MainStackParamList>();
const BookingsStack = createStackNavigator<MainStackParamList>();
const ProfileStack = createStackNavigator<MainStackParamList>();

function BikeNavigator() {
  return (
    <BikeStack.Navigator screenOptions={{ headerShown: false }}>
      <BikeStack.Screen name="Home" component={HomeScreen} />
      <BikeStack.Screen name="BikeSearch" component={BikeSearchScreen} />
      <BikeStack.Screen name="BikeDetail" component={BikeDetailScreen} />
      <BikeStack.Screen name="Cart" component={CartScreen} />
    </BikeStack.Navigator>
  );
}

function HostelNavigator() {
  return (
    <HostelStack.Navigator screenOptions={{ headerShown: false }}>
      <HostelStack.Screen name="HostelLanding" component={HostelLandingScreen} />
      <HostelStack.Screen name="HostelSearch" component={HostelSearchScreen} />
      <HostelStack.Screen name="HostelDetail" component={HostelDetailScreen} />
    </HostelStack.Navigator>
  );
}

function BookingsNavigator() {
  return (
    <BookingsStack.Navigator screenOptions={{ headerShown: false }}>
      <BookingsStack.Screen name="BookingsList" component={BookingsListScreen} />
      <BookingsStack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <BookingsStack.Screen name="ExtendBooking" component={ExtendBookingScreen} />
    </BookingsStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="AadhaarVerify" component={AadhaarVerifyScreen} />
      <ProfileStack.Screen name="UploadDL" component={UploadDLScreen} />
      <ProfileStack.Screen name="Referral" component={ReferralScreen} />
      <ProfileStack.Screen name="Search" component={SearchScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Bottom tab navigator ──────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f47b20',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e5e5',
          height: 56,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={BikeNavigator}
        options={{
          title: 'Bike',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="HostelTab"
        component={HostelNavigator}
        options={{
          title: 'Hostel',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bed-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="BookingsTab"
        component={BookingsNavigator}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ReferEarnTab"
        component={ReferralScreen}
        options={{
          title: 'Refer&Earn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons name="person-outline" size={size} color={color} />
              {itemCount > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -8,
                  backgroundColor: '#f47b20', borderRadius: 8,
                  minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>
                    {itemCount > 9 ? '9+' : itemCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
