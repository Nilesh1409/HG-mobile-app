import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  FlatList, TouchableOpacity, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { Bike } from '../../types/bike.types';
import queryClient from '../../lib/queryClient';

const { width } = Dimensions.get('window');
type Nav = StackNavigationProp<MainStackParamList, 'BikeDetail'>;
type Route = RouteProp<MainStackParamList, 'BikeDetail'>;

export default function BikeDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bikeId, startDate, endDate, startTime, endTime } = route.params;
  const { token } = useAuthStore();
  const [kmOption, setKmOption] = useState<'limited' | 'unlimited'>('unlimited');
  const [quantity, setQuantity] = useState(1);

  const { data: bike, isLoading, isError, refetch } = useQuery({
    queryKey: ['bike', bikeId, startDate, endDate],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike }>(`/bikes/${bikeId}`, {
        params: { startDate, endDate, startTime, endTime, kmOption },
      });
      return res.data.data;
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: () =>
      api.post('/cart/items', {
        bikeId,
        quantity,
        kmOption,
        startDate: startDate ?? new Date().toISOString().split('T')[0],
        endDate: endDate ?? new Date().toISOString().split('T')[0],
        startTime: startTime ?? '08:00',
        endTime: endTime ?? '20:00',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: bike?.title });
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

  if (isLoading) return <LoadingSpinner />;
  if (isError || !bike) return <ErrorState onRetry={refetch} />;

  const limitedActive = bike.pricePerDay?.weekday?.limitedKm?.isActive && bike.priceLimited !== null;
  const limitedPrice = bike.pricePerDay?.weekday?.limitedKm?.price ?? 0;
  const unlimitedPrice = bike.pricePerDay?.weekday?.unlimited?.price ?? 0;
  const kmLimit = bike.pricePerDay?.weekday?.limitedKm?.kmLimit ?? 100;
  const currentPrice = kmOption === 'limited' ? limitedPrice : unlimitedPrice;
  const totalPrice = kmOption === 'limited'
    ? bike.priceLimited?.totalPrice
    : bike.priceUnlimited?.totalPrice;
  const isAvailable = bike.availableQuantity > 0;
  const maxQty = Math.min(bike.availableQuantity, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={bike.title} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <FlatList
          data={bike.images?.length ? bike.images : ['https://via.placeholder.com/400x250']}
          keyExtractor={(_, i) => String(i)}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          style={styles.gallery}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="contain" />
          )}
        />

        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleRow}>
            <View style={styles.zeroBadge}>
              <Text style={styles.zeroBadgeText}>Zero Deposit</Text>
            </View>
            <Text style={styles.bikeName}>{bike.title}</Text>
            <Text style={styles.bikeSub}>{bike.brand} • {bike.model} • {bike.year}</Text>
          </View>

          {/* Availability */}
          <View style={styles.availRow}>
            <View style={[styles.dot, { backgroundColor: isAvailable ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.availText}>
              {isAvailable ? `${bike.availableQuantity} available` : 'Currently unavailable'}
            </Text>
          </View>

          {/* Plan Selector */}
          <Text style={styles.sectionTitle}>CHOOSE YOUR PLAN</Text>
          <View style={styles.planRow}>
            {limitedActive && (
              <TouchableOpacity
                style={[styles.planCard, kmOption === 'limited' && styles.planCardActive]}
                onPress={() => setKmOption('limited')}
              >
                <Text style={[styles.planCardTitle, kmOption === 'limited' && styles.planCardTitleActive]}>
                  {kmLimit} km
                </Text>
                <Text style={[styles.planCardPrice, kmOption === 'limited' && styles.planCardPriceActive]}>
                  ₹{limitedPrice}/day
                </Text>
                <Text style={[styles.planCardNote, kmOption === 'limited' && styles.planCardNoteActive]}>
                  ₹{bike.additionalKmPrice}/km extra
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.planCard, kmOption === 'unlimited' && styles.planCardActive]}
              onPress={() => setKmOption('unlimited')}
            >
              <Text style={[styles.planCardTitle, kmOption === 'unlimited' && styles.planCardTitleActive]}>
                Unlimited km
              </Text>
              <Text style={[styles.planCardPrice, kmOption === 'unlimited' && styles.planCardPriceActive]}>
                ₹{unlimitedPrice}/day
              </Text>
              <Text style={[styles.planCardNote, kmOption === 'unlimited' && styles.planCardNoteActive]}>
                No extra charges
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          {bike.description ? (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{bike.description}</Text>
            </>
          ) : null}

          {/* Required Documents */}
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <View style={styles.docsRow}>
            {['ID Proof', 'Driving License'].map((doc) => (
              <View key={doc} style={styles.docChip}>
                <Ionicons name="document-outline" size={13} color="#f47b20" />
                <Text style={styles.docText}>{doc}</Text>
              </View>
            ))}
          </View>

          {/* Quantity */}
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qty}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity >= maxQty && styles.qtyBtnDisabled]}
              onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
            {quantity >= maxQty && (
              <Text style={styles.maxQtyNote}>Maximum available quantity reached</Text>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>{bike.searchPeriod ? '1 day(s)' : 'per day'}</Text>
          <Text style={styles.totalPrice}>
            ₹{totalPrice ? totalPrice.toFixed(0) : currentPrice * quantity}
          </Text>
          {totalPrice && <Text style={styles.gstNote}>incl. 5% GST</Text>}
        </View>
        <View style={styles.bottomBtns}>
          <Button
            title={token ? 'Add to Cart' : 'Login to Book'}
            onPress={() => {
              if (!token) { navigation.navigate('Login' as never); return; }
              addToCartMutation.mutate();
            }}
            loading={addToCartMutation.isPending}
            disabled={!isAvailable}
            style={styles.ctaBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  gallery: { height: 220, backgroundColor: '#f9f9f9' },
  galleryImage: { width, height: 220 },
  content: { padding: 16 },
  titleRow: { marginBottom: 10 },
  zeroBadge: {
    alignSelf: 'flex-start', backgroundColor: '#f47b20',
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6,
  },
  zeroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bikeName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  bikeSub: { fontSize: 13, color: '#666', marginTop: 2 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 13, color: '#666' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  planRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  planCard: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 2,
    borderColor: '#e5e5e5', backgroundColor: '#f9f9f9', alignItems: 'center',
  },
  planCardActive: { borderColor: '#f47b20', backgroundColor: '#fff5ed' },
  planCardTitle: { fontSize: 14, fontWeight: '700', color: '#666', marginBottom: 4 },
  planCardTitleActive: { color: '#f47b20' },
  planCardPrice: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  planCardPriceActive: { color: '#f47b20' },
  planCardNote: { fontSize: 11, color: '#999' },
  planCardNoteActive: { color: '#d4610a' },
  description: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 16 },
  docsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  docChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff5ed', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#ffd4a8',
  },
  docText: { fontSize: 12, color: '#f47b20', fontWeight: '500' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnText: { fontSize: 20, color: '#1a1a1a', fontWeight: '600', lineHeight: 22 },
  qty: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', minWidth: 28, textAlign: 'center' },
  maxQtyNote: { fontSize: 11, color: '#ef4444', flex: 1 },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  totalLabel: { fontSize: 11, color: '#999' },
  totalPrice: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  gstNote: { fontSize: 10, color: '#22c55e' },
  bottomBtns: { flexDirection: 'row', gap: 8 },
  ctaBtn: { minWidth: 150 },
});
