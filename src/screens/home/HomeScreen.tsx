import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList } from '../../navigation/types';
import type { MainTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import BikeCard from '../../components/bikes/BikeCard';
import HostelCard from '../../components/hostels/HostelCard';
import api from '../../lib/api';
import type { Bike } from '../../types/bike.types';
import type { Hostel } from '../../types/hostel.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  StackNavigationProp<MainStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();

  const { data: bikes, isLoading: bikesLoading } = useQuery({
    queryKey: ['bikes', 'trending'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/trending');
      return res.data.data;
    },
  });

  const { data: hostels, isLoading: hostelsLoading } = useQuery({
    queryKey: ['hostels'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels');
      return res.data.data;
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {user ? `Hi, ${user.name.split(' ')[0]} 👋` : 'Welcome to HappyGo'}
            </Text>
            <Text style={styles.subtitle}>Where would you like to go?</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            style={styles.cartBtn}
            accessibilityLabel="Open cart"
          >
            <Ionicons name="cart-outline" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          accessibilityLabel="Search bikes and hostels"
        >
          <Ionicons name="search-outline" size={18} color="#999" />
          <Text style={styles.searchText}>Search bikes, hostels, locations...</Text>
        </TouchableOpacity>

        {/* Guest Banner */}
        {!user && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestText}>
              Login to book bikes and hostels
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
              <Text style={styles.guestLink}>Login Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Trending Bikes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Bikes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ExploreTab', { tab: 'bikes' })}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {bikesLoading ? (
            <ActivityIndicator color="#f47b20" style={styles.loader} />
          ) : (
            <FlatList
              data={bikes}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <BikeCard
                  bike={item}
                  onPress={() => navigation.navigate('BikeDetail', { bikeId: item._id })}
                />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No bikes available</Text>
              }
            />
          )}
        </View>

        {/* Hostels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hostels</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ExploreTab', { tab: 'hostels' })}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {hostelsLoading ? (
            <ActivityIndicator color="#f47b20" style={styles.loader} />
          ) : (
            <View style={styles.hostelList}>
              {(hostels?.slice(0, 4) ?? []).map((hostel) => (
                <HostelCard
                  key={hostel._id}
                  hostel={hostel}
                  onPress={() => navigation.navigate('HostelDetail', { hostelId: hostel._id })}
                />
              ))}
              {!hostels?.length && (
                <Text style={styles.emptyText}>No hostels available</Text>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
    paddingBottom: 16,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  cartBtn: { padding: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  searchText: { color: '#999', fontSize: 14 },
  guestBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff5ed',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd4a8',
  },
  guestText: { color: '#666', fontSize: 13, flex: 1 },
  guestLink: { color: '#f47b20', fontSize: 13, fontWeight: '600', marginLeft: 8 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  viewAll: { fontSize: 14, color: '#f47b20', fontWeight: '500' },
  hList: { paddingLeft: 20, paddingRight: 8 },
  hostelList: { paddingHorizontal: 20 },
  loader: { marginVertical: 20 },
  emptyText: { color: '#999', fontSize: 14, paddingHorizontal: 20 },
});
