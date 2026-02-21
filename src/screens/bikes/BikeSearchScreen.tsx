import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import EmptyState from '../../components/common/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { Bike } from '../../types/bike.types';
import { DEFAULT_LOCATION } from '../../types/bike.types';
import queryClient from '../../lib/queryClient';
import { useCartStore } from '../../stores/cartStore';

type Nav = StackNavigationProp<MainStackParamList, 'BikeSearch'>;
type Route = RouteProp<MainStackParamList, 'BikeSearch'>;

// Mirrors web's getPricingOptions
const getPricingOptions = (bike: Bike) => {
  const options: { type: 'limited' | 'unlimited'; price: number; kmLimit: number | string; label: string; duration: string }[] = [];
  if (bike?.priceLimited?.breakdown) {
    const kmLimit = bike.pricePerDay?.weekday?.limitedKm?.kmLimit ?? 60;
    options.push({
      type: 'limited',
      price: bike.priceLimited.breakdown.subtotal,
      kmLimit,
      label: `${kmLimit} km`,
      duration: bike.priceLimited.breakdown.duration,
    });
  }
  if (bike?.priceUnlimited?.breakdown) {
    options.push({
      type: 'unlimited',
      price: bike.priceUnlimited.breakdown.subtotal,
      kmLimit: 'Unlimited',
      label: 'Unlimited km',
      duration: bike.priceUnlimited.breakdown.duration,
    });
  }
  return options;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTimeDisplay = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};

function BikeCard({
  bike,
  searchParams,
  onViewDetail,
}: {
  bike: Bike;
  searchParams: { startDate: string; endDate: string; startTime: string; endTime: string };
  onViewDetail: () => void;
}) {
  const { token } = useAuthStore();
  const navigation = useNavigation<Nav>();

  const pricingOptions = getPricingOptions(bike);
  const defaultType = pricingOptions[0]?.type ?? 'unlimited';

  const [selectedType, setSelectedType] = useState<'limited' | 'unlimited'>(defaultType);
  const [quantity, setQuantity] = useState(1);

  const selectedOption = pricingOptions.find(o => o.type === selectedType) ?? pricingOptions[0];
  const isAvailable = bike.availableQuantity > 0;
  const maxQty = Math.min(bike.availableQuantity, 10);

  const addToCartMutation = useMutation({
    mutationFn: () =>
      api.post('/cart/items', {
        bikeId: bike._id,
        quantity,
        kmOption: selectedType,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        startTime: searchParams.startTime,
        endTime: searchParams.endTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: `${bike.title} added` });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.message ?? 'Failed to add to cart',
      });
    },
  });

  const bookNowMutation = useMutation({
    mutationFn: () =>
      api.post('/cart/items', {
        bikeId: bike._id,
        quantity,
        kmOption: selectedType,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        startTime: searchParams.startTime,
        endTime: searchParams.endTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: 'Proceeding to cart...' });
      navigation.navigate('Cart');
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.message ?? 'Failed to add to cart',
      });
    },
  });

  const requireAuth = (cb: () => void) => {
    if (!token) {
      navigation.navigate('Login' as never);
      return;
    }
    cb();
  };

  const isLoading = addToCartMutation.isPending || bookNowMutation.isPending;

  return (
    <View style={styles.card}>
      {/* Image */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: bike.images?.[0] ?? 'https://via.placeholder.com/400x200' }}
          style={styles.bikeImage}
          resizeMode="contain"
        />
        <View style={styles.zeroBadge}>
          <Text style={styles.zeroBadgeText}>Zero Deposit</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* Title */}
        <Text style={styles.bikeTitle}>{bike.title}</Text>
        <Text style={styles.bikeSubtitle}>{bike.brand} • {bike.model} • {bike.year}</Text>

        {/* Availability */}
        <View style={styles.availRow}>
          <View style={[styles.dot, { backgroundColor: isAvailable ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.availText}>
            {isAvailable ? `${bike.availableQuantity} available` : 'Currently unavailable'}
          </Text>
        </View>

        {/* Plan Selector */}
        {pricingOptions.length > 0 && (
          <>
            <Text style={styles.planLabel}>CHOOSE YOUR PLAN</Text>
            <View style={styles.planRow}>
              {pricingOptions.map(opt => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.planBtn, selectedType === opt.type && styles.planBtnActive]}
                  onPress={() => setSelectedType(opt.type)}
                  disabled={!isAvailable}
                >
                  <Text style={[styles.planBtnText, selectedType === opt.type && styles.planBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Quantity + Add to Cart */}
        {isAvailable && (
          <View style={styles.ctaRow}>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1 || isLoading}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity >= maxQty && styles.qtyBtnDisabled]}
                onPress={() => setQuantity(q => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty || isLoading}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={() => requireAuth(() => addToCartMutation.mutate())}
              disabled={isLoading}
            >
              {addToCartMutation.isPending ? (
                <ActivityIndicator size="small" color="#f47b20" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={14} color="#f47b20" />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {quantity >= maxQty && isAvailable && (
          <Text style={styles.maxQtyNote}>Maximum available quantity reached</Text>
        )}

        {/* Price + Book Now */}
        {isAvailable ? (
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>₹{selectedOption?.price ?? 0}</Text>
              <Text style={styles.priceDuration}>{selectedOption?.duration ?? '1 day(s)'}</Text>
            </View>
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => requireAuth(() => bookNowMutation.mutate())}
              disabled={isLoading}
            >
              {bookNowMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.bookNowText}>Book Now</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.priceRow, { justifyContent: 'center' }]}>
            <Text style={styles.unavailableText}>Currently Unavailable</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function BikeSearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { startDate, endDate, startTime, endTime, location } = route.params;
  const { itemCount } = useCartStore();

  const { data: bikes, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['bikes', 'available', { startDate, endDate, startTime, endTime, location }],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/available', {
        params: { startDate, endDate, startTime, endTime, location: location ?? DEFAULT_LOCATION },
      });
      return res.data.data;
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Available Bikes</Text>
          <Text style={styles.headerSub}>in {location ?? DEFAULT_LOCATION}</Text>
        </View>
        <TouchableOpacity
          style={styles.cartIconBtn}
          onPress={() => navigation.navigate('Cart')}
          accessibilityLabel="View cart"
        >
          <Ionicons name="cart-outline" size={22} color="#fff" />
          {itemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Strip */}
      <View style={styles.dateStrip}>
        <View style={styles.dateHalf}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="#999" />
            <Text style={styles.dateLabel}>Pickup</Text>
          </View>
          <Text style={styles.dateValue}>{formatDateDisplay(startDate)}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={12} color="#999" />
            <Text style={styles.timeValue}>{formatTimeDisplay(startTime)}</Text>
          </View>
        </View>
        <View style={styles.dateDivider} />
        <View style={styles.dateHalf}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="#999" />
            <Text style={styles.dateLabel}>Dropoff</Text>
          </View>
          <Text style={styles.dateValue}>{formatDateDisplay(endDate)}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={12} color="#999" />
            <Text style={styles.timeValue}>{formatTimeDisplay(endTime)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Search')}
          accessibilityLabel="Change search filters"
        >
          <Ionicons name="options-outline" size={20} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          *All prices are exclusive of taxes and fuel. Images used for representation purposes only, actual prices may vary.
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f47b20" />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load bikes</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bikes ?? []}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <BikeCard
              bike={item}
              searchParams={{ startDate, endDate, startTime, endTime }}
              onViewDetail={() =>
                navigation.navigate('BikeDetail', { bikeId: item._id, startDate, endDate, startTime, endTime })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bicycle-outline"
              title="No bikes available"
              subtitle="Try different dates or times"
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Header
  header: {
    backgroundColor: '#f47b20',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  cartIconBtn: { padding: 4, position: 'relative' },
  cartBadge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: '#fff', borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#f47b20', fontSize: 9, fontWeight: '800' },

  // Date strip
  dateStrip: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#eee', gap: 6,
  },
  dateHalf: { flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dateLabel: { fontSize: 10, color: '#999' },
  dateValue: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginVertical: 1 },
  timeValue: { fontSize: 12, color: '#666' },
  dateDivider: { width: 1, height: 40, backgroundColor: '#e5e5e5' },
  filterBtn: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#e5e5e5',
  },

  // Disclaimer
  disclaimer: {
    backgroundColor: '#eff6ff', marginHorizontal: 10, marginTop: 8,
    borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6',
  },
  disclaimerText: { fontSize: 11, color: '#1d4ed8', lineHeight: 15 },

  // Loading/Error
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 16, color: '#666' },
  retryBtn: { backgroundColor: '#f47b20', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },

  list: { padding: 10, paddingBottom: 32 },

  // Bike Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  imageWrapper: { backgroundColor: '#f9f9f9', position: 'relative', paddingVertical: 8 },
  bikeImage: { width: '100%', height: 160 },
  zeroBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#f47b20', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  zeroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 14 },
  bikeTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  bikeSubtitle: { fontSize: 12, color: '#666', marginBottom: 8, fontWeight: '600' },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 12, color: '#555', fontWeight: '500' },

  // Plan selector
  planLabel: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.8, marginBottom: 8, textAlign: 'center' },
  planRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  planBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  planBtnActive: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  planBtnText: { fontSize: 13, fontWeight: '700', color: '#555' },
  planBtnTextActive: { color: '#fff' },

  // CTA row (qty + add to cart)
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnText: { fontSize: 18, color: '#1a1a1a', fontWeight: '700', lineHeight: 20 },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', minWidth: 22, textAlign: 'center' },
  addToCartBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#f47b20', backgroundColor: '#fff',
  },
  addToCartText: { color: '#f47b20', fontWeight: '700', fontSize: 13 },
  maxQtyNote: { fontSize: 11, color: '#f47b20', marginBottom: 6 },

  // Price + Book Now
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 4,
  },
  price: { fontSize: 22, fontWeight: '800', color: '#f47b20' },
  priceDuration: { fontSize: 12, color: '#666', marginTop: 1 },
  bookNowBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  bookNowText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  unavailableText: { fontSize: 14, color: '#999', fontWeight: '500' },
});
