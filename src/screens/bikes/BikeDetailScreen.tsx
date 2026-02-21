import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import BikeSpecChip from '../../components/bikes/BikeSpecChip';
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
  const [kmOption, setKmOption] = useState<'limited' | 'unlimited'>('limited');
  const [quantity, setQuantity] = useState(1);

  const { data: bike, isLoading, isError, refetch } = useQuery({
    queryKey: ['bike', bikeId],
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
        startTime: startTime ?? '09:00',
        endTime: endTime ?? '18:00',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: `${bike?.name} added` });
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

  const price =
    kmOption === 'limited'
      ? bike.pricing?.limited?.pricePerDay
      : bike.pricing?.unlimited?.pricePerDay;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={`${bike.brand} ${bike.name}`} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <FlatList
          data={bike.images?.length ? bike.images : ['https://via.placeholder.com/400x250']}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="cover" />
          )}
        />

        <View style={styles.content}>
          <Text style={styles.bikeName}>{bike.brand} {bike.name}</Text>
          <Text style={styles.location}>📍 {bike.location}</Text>

          {/* Specs */}
          <View style={styles.specsRow}>
            {bike.specs?.cc && <BikeSpecChip icon="speedometer-outline" label={`${bike.specs.cc} CC`} />}
            {bike.specs?.fuel && <BikeSpecChip icon="water-outline" label={bike.specs.fuel} />}
            {bike.specs?.transmission && <BikeSpecChip icon="cog-outline" label={bike.specs.transmission} />}
          </View>

          {/* KM Option */}
          <Text style={styles.sectionTitle}>Select Plan</Text>
          <View style={styles.kmRow}>
            {(['limited', 'unlimited'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.kmOption, kmOption === opt && styles.kmOptionActive]}
                onPress={() => setKmOption(opt)}
              >
                <Text style={[styles.kmOptionText, kmOption === opt && styles.kmOptionTextActive]}>
                  {opt === 'limited' ? 'Limited KM' : 'Unlimited KM'}
                </Text>
                <Text style={[styles.kmPrice, kmOption === opt && styles.kmPriceActive]}>
                  ₹{opt === 'limited' ? bike.pricing?.limited?.pricePerDay : bike.pricing?.unlimited?.pricePerDay}/day
                </Text>
                {opt === 'limited' && bike.pricing?.limited?.kmLimit && (
                  <Text style={[styles.kmLimit, kmOption === opt && styles.kmLimitActive]}>
                    {bike.pricing.limited.kmLimit} km/day
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          {bike.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{bike.description}</Text>
            </>
          )}

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
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>₹{(price ?? 0) * quantity}<Text style={styles.perDay}>/day</Text></Text>
        </View>
        <Button
          title={token ? 'Add to Cart' : 'Login to Book'}
          onPress={() => {
            if (!token) {
              navigation.navigate('AuthStack' as never);
              return;
            }
            addToCartMutation.mutate();
          }}
          loading={addToCartMutation.isPending}
          style={styles.ctaBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  gallery: { height: 250 },
  galleryImage: { width, height: 250, backgroundColor: '#f0f0f0' },
  content: { padding: 20 },
  bikeName: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  location: { fontSize: 14, color: '#666', marginBottom: 16 },
  specsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  kmRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kmOption: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#f9f9f9',
  },
  kmOptionActive: { borderColor: '#f47b20', backgroundColor: '#fff5ed' },
  kmOptionText: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 4 },
  kmOptionTextActive: { color: '#f47b20' },
  kmPrice: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  kmPriceActive: { color: '#f47b20' },
  kmLimit: { fontSize: 12, color: '#999', marginTop: 2 },
  kmLimitActive: { color: '#d4610a' },
  description: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 20 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, color: '#1a1a1a', fontWeight: '600' },
  qty: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', minWidth: 30, textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  totalLabel: { fontSize: 12, color: '#999' },
  totalPrice: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  perDay: { fontSize: 13, fontWeight: '400', color: '#999' },
  ctaBtn: { minWidth: 160 },
});
