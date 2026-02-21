import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { Cart, CartBikeItem } from '../../types/cart.types';
import queryClient from '../../lib/queryClient';

type Nav = StackNavigationProp<MainStackParamList, 'Cart'>;

function BikeItem({ item }: { item: CartBikeItem }) {
  const bikeName = (item.bike as any)?.title ?? (item.bike as any)?.name ?? 'Bike';
  const bikeImage = item.bike?.images?.[0];

  const updateQty = useMutation({
    mutationFn: (quantity: number) => api.put(`/cart/items/${item._id}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update' }),
  });

  const removeItem = useMutation({
    mutationFn: () => api.delete(`/cart/items/${item._id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to remove' }),
  });

  return (
    <View style={styles.itemCard}>
      <Image
        source={{ uri: bikeImage ?? 'https://via.placeholder.com/80' }}
        style={styles.itemImage}
        resizeMode="contain"
      />
      <View style={styles.itemBody}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemName} numberOfLines={1}>{bikeName}</Text>
          <TouchableOpacity
            onPress={() => removeItem.mutate()}
            disabled={removeItem.isPending}
            accessibilityLabel="Remove bike"
          >
            {removeItem.isPending ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.itemDetail}>
          {item.startDate} → {item.endDate}
        </Text>
        <Text style={styles.itemPlan}>{item.kmOption === 'limited' ? '100 KM Limited' : 'Unlimited KM'}</Text>
        <View style={styles.itemFooter}>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => item.quantity > 1 && updateQty.mutate(item.quantity - 1)}
              disabled={item.quantity <= 1 || updateQty.isPending}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            {updateQty.isPending ? (
              <ActivityIndicator size="small" color="#f47b20" />
            ) : (
              <Text style={styles.qtyText}>{item.quantity}</Text>
            )}
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty.mutate(item.quantity + 1)}
              disabled={updateQty.isPending}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { setCart } = useCartStore();

  const { data: cart, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Cart }>('/cart/details');
      setCart(res.data.data);
      return res.data.data;
    },
  });

  // Helmet update — needs date params from first bike item
  const updateHelmet = useMutation({
    mutationFn: (quantity: number) => {
      const firstBike = cart?.bikeItems?.[0];
      const params = firstBike ? {
        startDate: firstBike.startDate,
        endDate: firstBike.endDate,
        startTime: firstBike.startTime,
        endTime: firstBike.endTime,
      } : {};
      return api.put('/cart/helmets', { quantity }, { params });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update helmets' }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const hasBikes = (cart?.bikeItems?.length ?? 0) > 0;
  const hasHostels = (cart?.hostelItems?.length ?? 0) > 0;
  const isEmpty = !hasBikes && !hasHostels;
  const breakdown = cart?.priceBreakdown;
  const helmetCount = cart?.helmetQuantity ?? 0;

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="My Cart" />
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          subtitle="Add bikes or hostels to get started"
        />
        <View style={styles.emptyActions}>
          <Button title="Browse Bikes" onPress={() => navigation.navigate('MainTabs')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={`My Cart (${(cart?.bikeItems?.length ?? 0) + (cart?.hostelItems?.length ?? 0)} items)`} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />}
      >
        {/* Bikes */}
        {hasBikes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              🏍 Your Bikes ({cart!.bikeItems.length})
            </Text>
            {cart!.bikeItems.map((item) => (
              <BikeItem key={item._id} item={item} />
            ))}

            {/* Helmet Rental */}
            <View style={styles.helmetCard}>
              <View style={styles.helmetHeader}>
                <Ionicons name="shield-outline" size={16} color="#f47b20" />
                <Text style={styles.helmetTitle}>Helmet Rental</Text>
              </View>
              <Text style={styles.helmetSub}>
                1 helmet FREE per bike, additional helmets at ₹60 each
              </Text>
              <View style={styles.helmetRow}>
                <Text style={styles.helmetLabel}>Number of Helmets</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateHelmet.mutate(Math.max(0, helmetCount - 1))}
                    disabled={helmetCount <= 0 || updateHelmet.isPending}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  {updateHelmet.isPending ? (
                    <ActivityIndicator size="small" color="#f47b20" />
                  ) : (
                    <Text style={styles.qtyText}>{helmetCount}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateHelmet.mutate(helmetCount + 1)}
                    disabled={updateHelmet.isPending}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.helmetSelected}>{helmetCount} helmet(s) selected</Text>
            </View>
          </View>
        )}

        {/* Hostels */}
        {hasHostels && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              🏨 Your Hostels ({cart!.hostelItems.length})
            </Text>
            {cart!.hostelItems.map((item) => {
              const hostelName = (item.hostel as any)?.name ?? 'Hostel';
              return (
                <View key={item._id} style={styles.itemCard}>
                  <Image
                    source={{ uri: item.hostel?.images?.[0] ?? 'https://via.placeholder.com/80' }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName}>{hostelName}</Text>
                    <Text style={styles.itemDetail}>{item.checkIn} → {item.checkOut}</Text>
                    <Text style={styles.itemPlan}>{item.roomType} · {item.mealOption}</Text>
                    <View style={styles.itemFooter}>
                      <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
                      <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Order Summary */}
        {breakdown && (
          <View style={styles.orderSummary}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{breakdown.subtotal}</Text>
            </View>
            {breakdown.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discount]}>−₹{breakdown.discount}</Text>
              </View>
            )}
            {(breakdown.helmetCharges ?? 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Helmet Charges</Text>
                <Text style={styles.summaryValue}>₹{breakdown.helmetCharges}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (5%)</Text>
              <Text style={styles.summaryValue}>+₹{breakdown.gst}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{breakdown.totalAmount}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate('Checkout')}>
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            </TouchableOpacity>
            <Text style={styles.secureNote}>Secure payment • No hidden charges</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 14, paddingBottom: 20 },
  emptyActions: { padding: 20 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  itemCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    padding: 12, marginBottom: 8, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  itemImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#f5f5f5' },
  itemBody: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 },
  itemDetail: { fontSize: 11, color: '#999', marginBottom: 2 },
  itemPlan: { fontSize: 11, color: '#f47b20', fontWeight: '500', marginBottom: 6 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, color: '#1a1a1a', fontWeight: '700', lineHeight: 18 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', minWidth: 20, textAlign: 'center' },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#f47b20' },
  helmetCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  helmetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  helmetTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  helmetSub: { fontSize: 11, color: '#999', marginBottom: 10 },
  helmetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  helmetLabel: { fontSize: 13, color: '#666' },
  helmetSelected: { fontSize: 12, color: '#f47b20', fontWeight: '500' },
  orderSummary: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  summaryLabel: { color: '#666', fontSize: 14 },
  summaryValue: { color: '#1a1a1a', fontSize: 14, fontWeight: '500' },
  discount: { color: '#22c55e' },
  totalRow: { borderBottomWidth: 0, paddingVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: '#f47b20' },
  checkoutBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secureNote: { textAlign: 'center', color: '#999', fontSize: 11, marginTop: 8 },
});
