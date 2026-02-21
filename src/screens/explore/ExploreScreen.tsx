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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import BikeCard from '../../components/bikes/BikeCard';
import HostelCard from '../../components/hostels/HostelCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import api from '../../lib/api';
import type { Bike } from '../../types/bike.types';
import type { Hostel } from '../../types/hostel.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'ExploreTab'>,
  StackNavigationProp<MainStackParamList>
>;
type Route = RouteProp<MainTabParamList, 'ExploreTab'>;

export default function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const params = route.params;
  const [activeTab, setActiveTab] = useState<'bikes' | 'hostels'>(params?.tab ?? 'bikes');

  const bikeParams = params
    ? {
        startDate: params.startDate,
        endDate: params.endDate,
        startTime: params.startTime,
        endTime: params.endTime,
        location: params.location,
      }
    : {};

  const hostelParams = params
    ? {
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        people: params.people,
        location: params.location,
      }
    : {};

  const {
    data: bikes,
    isLoading: bikesLoading,
    isError: bikesError,
    refetch: refetchBikes,
    isRefetching: bikesRefetching,
  } = useQuery({
    queryKey: ['bikes', 'available', bikeParams],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/available', {
        params: bikeParams,
      });
      return res.data.data;
    },
    enabled: activeTab === 'bikes',
  });

  const {
    data: hostels,
    isLoading: hostelsLoading,
    isError: hostelsError,
    refetch: refetchHostels,
    isRefetching: hostelsRefetching,
  } = useQuery({
    queryKey: ['hostels', 'available', hostelParams],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels/available', {
        params: hostelParams,
      });
      return res.data.data;
    },
    enabled: activeTab === 'hostels',
  });

  const isLoading = activeTab === 'bikes' ? bikesLoading : hostelsLoading;
  const isError = activeTab === 'bikes' ? bikesError : hostelsError;
  const refetch = activeTab === 'bikes' ? refetchBikes : refetchHostels;
  const isRefetching = activeTab === 'bikes' ? bikesRefetching : hostelsRefetching;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Search')}
          style={styles.filterBtn}
          accessibilityLabel="Filter search"
        >
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['bikes', 'hostels'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'bikes' ? '🏍 Bikes' : '🏨 Hostels'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : activeTab === 'bikes' ? (
        <FlatList
          data={bikes}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridList}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <BikeCard
                bike={item}
                onPress={() => navigation.navigate('BikeDetail', { bikeId: item._id, ...bikeParams })}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bicycle-outline"
              title="No bikes found"
              subtitle="Try adjusting your search filters"
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />
          }
        />
      ) : (
        <FlatList
          data={hostels}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HostelCard
              hostel={item}
              onPress={() => navigation.navigate('HostelDetail', { hostelId: item._id, ...hostelParams })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bed-outline"
              title="No hostels found"
              subtitle="Try adjusting your search filters"
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  filterBtn: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: { color: '#666', fontSize: 13, fontWeight: '500' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#f47b20' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#fff' },
  list: { padding: 20, paddingBottom: 40 },
  gridList: { padding: 12, paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  gridItem: { width: '48%' },
});
