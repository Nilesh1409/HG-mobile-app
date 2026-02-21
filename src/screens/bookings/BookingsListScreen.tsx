import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import BookingCard from '../../components/bookings/BookingCard';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import api from '../../lib/api';
import type { Booking, BookingStatus } from '../../types/booking.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'BookingsTab'>,
  StackNavigationProp<MainStackParamList>
>;

const TABS: { label: string; statuses: BookingStatus[] }[] = [
  { label: 'Upcoming', statuses: ['pending', 'confirmed', 'active'] },
  { label: 'Completed', statuses: ['completed'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
];

export default function BookingsListScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);

  const { data: bookings, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Booking[] }>('/bookings');
      return res.data.data;
    },
    enabled: !!token,
  });

  const filteredBookings = bookings?.filter((b) =>
    TABS[activeTab].statuses.includes(b.status)
  ) ?? [];

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginTitle}>My Bookings</Text>
          <EmptyState
            icon="calendar-outline"
            title="Login to view bookings"
            subtitle="See all your bike and hostel bookings here"
          />
          <Button
            title="Login"
            onPress={() => navigation.navigate('Login' as never)}
            style={styles.loginBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={`No ${TABS[activeTab].label.toLowerCase()} bookings`}
              subtitle="Your bookings will appear here"
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#f47b20' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#999' },
  tabTextActive: { color: '#f47b20', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 40 },
  loginPrompt: { flex: 1, padding: 24 },
  loginTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  loginBtn: { marginTop: 16 },
});
