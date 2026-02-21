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
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { Hostel, RoomType, MealOption } from '../../types/hostel.types';
import queryClient from '../../lib/queryClient';

const { width } = Dimensions.get('window');
type Nav = StackNavigationProp<MainStackParamList, 'HostelDetail'>;
type Route = RouteProp<MainStackParamList, 'HostelDetail'>;

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'dormitory', label: 'Dormitory' },
  { value: 'private', label: 'Private Room' },
];

const MEAL_OPTIONS: { value: MealOption; label: string }[] = [
  { value: 'bedOnly', label: 'Bed Only' },
  { value: 'bedAndBreakfast', label: 'Bed + Breakfast' },
  { value: 'bedBreakfastAndDinner', label: 'All Meals' },
];

export default function HostelDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { hostelId, checkIn, checkOut, people } = route.params;
  const { token } = useAuthStore();

  const [roomType, setRoomType] = useState<RoomType>('dormitory');
  const [mealOption, setMealOption] = useState<MealOption>('bedOnly');
  const [quantity, setQuantity] = useState(1);

  const { data: hostel, isLoading, isError, refetch } = useQuery({
    queryKey: ['hostel', hostelId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel }>(`/hostels/${hostelId}`, {
        params: { checkIn, checkOut, people },
      });
      return res.data.data;
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: () =>
      api.post('/cart/hostels', {
        hostelId,
        roomType,
        mealOption,
        quantity,
        checkIn: checkIn ?? new Date().toISOString().split('T')[0],
        checkOut: checkOut ?? new Date(Date.now() + 86400000).toISOString().split('T')[0],
        people: people ?? 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: `${hostel?.name} added` });
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
  if (isError || !hostel) return <ErrorState onRetry={refetch} />;

  const selectedPricing = hostel.pricing?.find(
    (p) => p.roomType === roomType && p.mealOption === mealOption
  );
  const pricePerNight = selectedPricing?.pricePerNight ?? 0;

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={hostel.name} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <FlatList
          data={hostel.images?.length ? hostel.images : ['https://via.placeholder.com/400x250']}
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
          <Text style={styles.name}>{hostel.name}</Text>
          <Text style={styles.location}>📍 {hostel.location}</Text>
          {hostel.address && <Text style={styles.address}>{hostel.address}</Text>}

          {/* Amenities */}
          {hostel.amenities?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.amenitiesRow}>
                  {hostel.amenities.map((a, i) => (
                    <View key={i} style={styles.amenityChip}>
                      <Text style={styles.amenityText}>{a.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Room Type */}
          <Text style={styles.sectionTitle}>Room Type</Text>
          <View style={styles.optionRow}>
            {ROOM_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.value}
                style={[styles.option, roomType === rt.value && styles.optionActive]}
                onPress={() => setRoomType(rt.value)}
              >
                <Text style={[styles.optionText, roomType === rt.value && styles.optionTextActive]}>
                  {rt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Meal Option */}
          <Text style={styles.sectionTitle}>Meal Plan</Text>
          <View style={styles.optionColumn}>
            {MEAL_OPTIONS.map((mo) => (
              <TouchableOpacity
                key={mo.value}
                style={[styles.option, mealOption === mo.value && styles.optionActive]}
                onPress={() => setMealOption(mo.value)}
              >
                <Text style={[styles.optionText, mealOption === mo.value && styles.optionTextActive]}>
                  {mo.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity */}
          <Text style={styles.sectionTitle}>Rooms</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qty}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((q) => q + 1)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {hostel.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{hostel.description}</Text>
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>{nights} night{nights > 1 ? 's' : ''} × {quantity} room{quantity > 1 ? 's' : ''}</Text>
          <Text style={styles.totalPrice}>₹{pricePerNight * nights * quantity}</Text>
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
  name: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  location: { fontSize: 14, color: '#666', marginBottom: 2 },
  address: { fontSize: 13, color: '#999', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 16, marginBottom: 10 },
  amenitiesRow: { flexDirection: 'row', gap: 8 },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  amenityText: { fontSize: 13, color: '#666' },
  optionRow: { flexDirection: 'row', gap: 12 },
  optionColumn: { gap: 8 },
  option: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  optionActive: { borderColor: '#f47b20', backgroundColor: '#fff5ed' },
  optionText: { fontSize: 14, fontWeight: '500', color: '#666' },
  optionTextActive: { color: '#f47b20' },
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
  description: { fontSize: 14, color: '#666', lineHeight: 22 },
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
  ctaBtn: { minWidth: 160 },
});
