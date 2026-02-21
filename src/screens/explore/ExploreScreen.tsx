import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import HostelCard from '../../components/hostels/HostelCard';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { Bike } from '../../types/bike.types';
import { DEFAULT_LOCATION } from '../../types/bike.types';
import type { Hostel } from '../../types/hostel.types';
import queryClient from '../../lib/queryClient';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'ExploreTab'>,
  StackNavigationProp<MainStackParamList>
>;
type Route = RouteProp<MainTabParamList, 'ExploreTab'>;

function BikeListItem({ bike, searchParams }: { bike: Bike; searchParams: Record<string, string | number | undefined> }) {
  const navigation = useNavigation<Nav>();
  const { token } = useAuthStore();
  const [kmOption, setKmOption] = useState<'limited' | 'unlimited'>(
    bike.priceLimited ? 'limited' : 'unlimited'
  );
  const [quantity, setQuantity] = useState(1);

  const limitedActive = bike.priceLimited !== null && bike.pricePerDay?.weekday?.limitedKm?.isActive;
  const price = kmOption === 'limited'
    ? (bike.priceLimited?.totalPrice ?? 0)
    : (bike.priceUnlimited?.totalPrice ?? 0);
  const pricePerUnit = kmOption === 'limited'
    ? (bike.pricePerDay?.weekday?.limitedKm?.price ?? 0)
    : (bike.pricePerDay?.weekday?.unlimited?.price ?? 0);

  const isAvailable = bike.availableQuantity > 0;
  const maxQty = Math.min(bike.availableQuantity, 5);

  const addToCartMutation = useMutation({
    mutationFn: () =>
      api.post('/cart/items', {
        bikeId: bike._id,
        quantity,
        kmOption,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        startTime: searchParams.startTime,
        endTime: searchParams.endTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: bike.title });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.message ?? 'Failed to add to cart',
      });
    },
  });

  return (
    <View style={bikeStyles.card}>
      {/* Image */}
      <View style={bikeStyles.imageWrapper}>
        <Image
          source={{ uri: bike.images?.[0] ?? 'https://via.placeholder.com/400x200' }}
          style={bikeStyles.image}
          resizeMode="contain"
        />
        <View style={bikeStyles.zeroBadge}>
          <Text style={bikeStyles.zeroBadgeText}>Zero Deposit</Text>
        </View>
      </View>

      <View style={bikeStyles.body}>
        {/* Title & availability */}
        <Text style={bikeStyles.title}>{bike.title}</Text>
        <Text style={bikeStyles.brand}>{bike.brand} • {bike.model} • {bike.year}</Text>
        <View style={bikeStyles.availRow}>
          <View style={[bikeStyles.dot, { backgroundColor: isAvailable ? '#22c55e' : '#ef4444' }]} />
          <Text style={bikeStyles.availText}>
            {isAvailable ? `${bike.availableQuantity} available` : 'Currently unavailable'}
          </Text>
        </View>

        {/* Plan Selector */}
        <Text style={bikeStyles.planLabel}>CHOOSE YOUR PLAN</Text>
        <View style={bikeStyles.planRow}>
          {limitedActive && (
            <TouchableOpacity
              style={[bikeStyles.planBtn, kmOption === 'limited' && bikeStyles.planBtnActive]}
              onPress={() => setKmOption('limited')}
            >
              <Text style={[bikeStyles.planBtnText, kmOption === 'limited' && bikeStyles.planBtnTextActive]}>
                {bike.pricePerDay?.weekday?.limitedKm?.kmLimit ?? 100} km
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[bikeStyles.planBtn, kmOption === 'unlimited' && bikeStyles.planBtnActive]}
            onPress={() => setKmOption('unlimited')}
          >
            <Text style={[bikeStyles.planBtnText, kmOption === 'unlimited' && bikeStyles.planBtnTextActive]}>
              Unlimited km
            </Text>
          </TouchableOpacity>
        </View>

        {/* Qty + CTA */}
        <View style={bikeStyles.ctaRow}>
          <View style={bikeStyles.qtyRow}>
            <TouchableOpacity
              style={bikeStyles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text style={bikeStyles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={bikeStyles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={bikeStyles.qtyBtn}
              onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
            >
              <Text style={bikeStyles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[bikeStyles.addBtn, !isAvailable && bikeStyles.addBtnDisabled]}
            disabled={!isAvailable || addToCartMutation.isPending}
            onPress={() => {
              if (!token) {
                navigation.navigate('Login' as never);
                return;
              }
              addToCartMutation.mutate();
            }}
          >
            {addToCartMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={14} color="#fff" />
                <Text style={bikeStyles.addBtnText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Price */}
        <View style={bikeStyles.priceRow}>
          <Text style={bikeStyles.price}>₹{pricePerUnit}</Text>
          <Text style={bikeStyles.priceSub}> /day (excl. GST)</Text>
        </View>
        {bike.searchPeriod && (
          <Text style={bikeStyles.totalPrice}>
            Total: ₹{price.toFixed(2)} (incl. 5% GST)
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const params = route.params;
  const [activeTab, setActiveTab] = useState<'bikes' | 'hostels'>(params?.tab ?? 'bikes');

  const bikeParams = {
    startDate: params?.startDate,
    endDate: params?.endDate,
    startTime: params?.startTime,
    endTime: params?.endTime,
    location: DEFAULT_LOCATION,
  };

  const hostelParams = params ? {
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    people: params.people,
    location: DEFAULT_LOCATION,
  } : {};

  const {
    data: bikes, isLoading: bikesLoading, isError: bikesError,
    refetch: refetchBikes, isRefetching: bikesRefetching,
  } = useQuery({
    queryKey: ['bikes', 'available', bikeParams],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/available', { params: bikeParams });
      return res.data.data;
    },
    enabled: activeTab === 'bikes',
  });

  const {
    data: hostels, isLoading: hostelsLoading, isError: hostelsError,
    refetch: refetchHostels, isRefetching: hostelsRefetching,
  } = useQuery({
    queryKey: ['hostels', 'available', hostelParams],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels/available', { params: hostelParams });
      return res.data.data;
    },
    enabled: activeTab === 'hostels',
  });

  const isLoading = activeTab === 'bikes' ? bikesLoading : hostelsLoading;
  const isError = activeTab === 'bikes' ? bikesError : hostelsError;
  const refetch = activeTab === 'bikes' ? refetchBikes : refetchHostels;
  const isRefetching = activeTab === 'bikes' ? bikesRefetching : hostelsRefetching;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {activeTab === 'bikes' ? 'Available Bikes' : 'Available Hostels'}
          </Text>
          <Text style={styles.headerSub}>in {DEFAULT_LOCATION}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Cart')}
          style={styles.cartBtn}
        >
          <Ionicons name="cart-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Date strip */}
      {params?.startDate && activeTab === 'bikes' && (
        <View style={styles.dateStrip}>
          <View style={styles.dateBlock}>
            <Ionicons name="calendar-outline" size={13} color="#666" />
            <View>
              <Text style={styles.dateLabel}>Pickup</Text>
              <Text style={styles.dateVal}>{params.startDate}</Text>
              <Text style={styles.dateVal}>{params.startTime}</Text>
            </View>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.dateBlock}>
            <Ionicons name="calendar-outline" size={13} color="#666" />
            <View>
              <Text style={styles.dateLabel}>Dropoff</Text>
              <Text style={styles.dateVal}>{params.endDate}</Text>
              <Text style={styles.dateVal}>{params.endTime}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="options-outline" size={18} color="#f47b20" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab toggle */}
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

      {/* Price disclaimer */}
      {activeTab === 'bikes' && (
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            *All prices are exclusive of taxes and fuel. Images used for representation purposes only, actual prices may vary.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f47b20" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : activeTab === 'bikes' ? (
        <FlatList
          data={bikes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <BikeListItem bike={item} searchParams={bikeParams} />
          )}
          ListEmptyComponent={
            <EmptyState icon="bicycle-outline" title="No bikes available" subtitle="Try different dates" />
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
            <EmptyState icon="bed-outline" title="No hostels found" subtitle="Try adjusting your dates" />
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#f47b20', flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  cartBtn: { padding: 4 },
  dateStrip: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8,
  },
  dateBlock: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  dateLabel: { fontSize: 10, color: '#999', fontWeight: '500' },
  dateVal: { fontSize: 12, color: '#1a1a1a', fontWeight: '600' },
  dateDivider: { width: 1, height: 36, backgroundColor: '#eee' },
  filterBtn: { padding: 6, backgroundColor: '#fff5ed', borderRadius: 8 },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 12, marginTop: 10, borderRadius: 10,
    padding: 3, borderWidth: 1, borderColor: '#eee',
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#f47b20' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  disclaimer: {
    backgroundColor: '#fff8f0', marginHorizontal: 12, marginTop: 8,
    borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#f47b20',
  },
  disclaimerText: { fontSize: 11, color: '#666', lineHeight: 16 },
  list: { padding: 12, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const bikeStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  imageWrapper: { backgroundColor: '#f9f9f9', position: 'relative' },
  image: { width: '100%', height: 180 },
  zeroBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: '#f47b20', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  zeroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: 14 },
  title: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  brand: { fontSize: 12, color: '#666', marginBottom: 8 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 12, color: '#666' },
  planLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.5, marginBottom: 8 },
  planRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  planBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0',
  },
  planBtnActive: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  planBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  planBtnTextActive: { color: '#fff' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, color: '#1a1a1a', fontWeight: '600', lineHeight: 20 },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', minWidth: 20, textAlign: 'center' },
  addBtn: {
    flex: 1, backgroundColor: '#f47b20', borderRadius: 8,
    paddingVertical: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 20, fontWeight: '800', color: '#f47b20' },
  priceSub: { fontSize: 12, color: '#999' },
  totalPrice: { fontSize: 12, color: '#22c55e', fontWeight: '600', marginTop: 2 },
});
