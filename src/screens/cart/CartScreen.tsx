import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { Cart, CartBikeItem } from '../../types/cart.types';
import { getCartTotal, getHelmetQty, getKmLabel } from '../../types/cart.types';
import queryClient from '../../lib/queryClient';

type Nav = StackNavigationProp<MainStackParamList, 'Cart'>;

function BikeItem({ item, cartBikeDates }: { item: CartBikeItem; cartBikeDates?: { startDate: string; endDate: string; startTime: string; endTime: string } }) {
  const bikeName = item.bike?.title ?? (item.bike as any)?.name ?? 'Bike';
  const bikeImage = item.bike?.images?.[0];
  const kmLabel = getKmLabel(item);
  const maxQty = item.bike?.availableQuantity ?? 99;
  const atMax = item.quantity >= maxQty;

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
    <View style={itemStyles.row}>
      <Image
        source={{ uri: bikeImage ?? 'https://via.placeholder.com/80' }}
        style={itemStyles.image}
        resizeMode="contain"
      />
      <View style={itemStyles.info}>
        <Text style={itemStyles.name} numberOfLines={1}>{bikeName}</Text>
        <Text style={itemStyles.kmLabel}>{kmLabel}</Text>
        <View style={itemStyles.controls}>
          <View style={itemStyles.qtyRow}>
            <TouchableOpacity
              style={itemStyles.qtyBtn}
              onPress={() => updateQty.mutate(item.quantity - 1)}
              disabled={item.quantity <= 1 || updateQty.isPending}
            >
              {updateQty.isPending ? (
                <ActivityIndicator size="small" color="#f47b20" />
              ) : (
                <Ionicons name="remove" size={14} color="#1a1a1a" />
              )}
            </TouchableOpacity>
            <Text style={itemStyles.qty}>{item.quantity}</Text>
            <TouchableOpacity
              style={itemStyles.qtyBtn}
              onPress={() => updateQty.mutate(item.quantity + 1)}
              disabled={atMax || updateQty.isPending}
            >
              <Ionicons name="add" size={14} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          <Text style={itemStyles.price}>+₹{item.pricePerUnit}/bike</Text>
        </View>
        {atMax && <Text style={{ fontSize: 11, color: '#f47b20', marginTop: 4 }}>Maximum available quantity reached</Text>}
      </View>
      <TouchableOpacity
        onPress={() => removeItem.mutate()}
        disabled={removeItem.isPending}
        style={itemStyles.deleteBtn}
      >
        {removeItem.isPending ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { setCart } = useCartStore();
  const [helmetQty, setHelmetQty] = useState(0);

  const { data: cart, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Cart }>('/cart/details');
      const c = res.data.data;
      setCart(c);
      setHelmetQty(getHelmetQty(c));
      return c;
    },
  });

  const updateHelmet = useMutation({
    mutationFn: async (qty: number) => {
      const firstBike = cart?.bikeItems?.[0];
      const dates = cart?.bikeDates ?? (firstBike ? {
        startDate: firstBike.startDate,
        endDate: firstBike.endDate,
        startTime: firstBike.startTime,
        endTime: firstBike.endTime,
      } : null);
      const params: Record<string, string> = {};
      if (dates?.startDate) params.startDate = dates.startDate;
      if (dates?.endDate) params.endDate = dates.endDate;
      if (dates?.startTime) params.startTime = dates.startTime;
      if (dates?.endTime) params.endTime = dates.endTime;
      return api.put('/cart/helmets', { quantity: qty }, { params });
    },
    onSuccess: (_, qty) => {
      setHelmetQty(qty);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update helmets' }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const bikeItems = cart?.bikeItems ?? [];
  const hostelItems = cart?.hostelItems ?? [];
  const hasItems = bikeItems.length > 0 || hostelItems.length > 0;

  const pricing = cart?.pricing;
  const priceBreakdown = cart?.priceBreakdown;
  const subtotal = pricing?.subtotal ?? priceBreakdown?.subtotal ?? 0;
  const bulkDiscountAmt = pricing?.bulkDiscount?.amount ?? 0;
  const bulkDiscountPct = pricing?.bulkDiscount?.percentage ?? 0;
  const surgeMultiplier = pricing?.surgeMultiplier ?? 1;
  const extraCharges = pricing?.extraCharges ?? 0;
  const helmetCharges = cart?.helmetDetails?.charges ?? priceBreakdown?.helmetCharges ?? 0;
  const gst = pricing?.gst ?? priceBreakdown?.gst ?? 0;
  const gstPct = pricing?.gstPercentage ?? 5;
  const total = pricing?.total ?? pricing?.totalAmount ?? priceBreakdown?.totalAmount ?? 0;
  const helmetMsg = cart?.helmetDetails?.message ?? '1 helmet FREE per bike, additional helmets at ₹60 each';

  const bikeDates = cart?.bikeDates;
  const totalBikes = bikeItems.reduce((s, i) => s + i.quantity, 0);

  if (!hasItems) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Empty cart header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#666" />
            <Text style={styles.backLinkText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add some bikes to your cart to get started</Text>
          <TouchableOpacity
            style={styles.browseBikesBtn}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.browseBikesBtnText}>Browse Bikes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color="#666" />
          <Text style={styles.backLinkText}>Continue Shopping</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cartCount}
          onPress={() => {}}
        >
          <Ionicons name="cart-outline" size={16} color="#f47b20" />
          <Text style={styles.cartCountText}>{totalBikes} Items</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Bike Items */}
        {bikeItems.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cart-outline" size={18} color="#f47b20" />
              <Text style={styles.cardHeaderText}>Your Bikes ({bikeItems.length})</Text>
            </View>
            {bikeItems.map(item => (
              <BikeItem key={item._id} item={item} cartBikeDates={bikeDates} />
            ))}
          </View>
        )}

        {/* Special Offer Banner */}
        {bikeItems.length > 0 && hostelItems.length === 0 && (
          <TouchableOpacity style={styles.specialOffer} onPress={() => {}}>
            <View style={styles.specialOfferIcon}>
              <Ionicons name="bed-outline" size={28} color="#fff" />
            </View>
            <View style={styles.specialOfferContent}>
              <View style={styles.specialOfferTitleRow}>
                <Ionicons name="gift-outline" size={14} color="#f47b20" />
                <Text style={styles.specialOfferTitle}>Special Offer!</Text>
              </View>
              <Text style={styles.specialOfferBody}>
                <Text style={styles.specialOfferHighlight}>Book Hostel & Bike Together</Text>
                {' '}to get an extra{' '}
                <Text style={styles.specialOfferHighlight}>10% discount</Text>
                {' '}on total amount
              </Text>
              <Text style={styles.specialOfferCta}>Click here to explore hostels for your travel dates</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#f47b20" />
          </TouchableOpacity>
        )}

        {/* Hostel Items */}
        {hostelItems.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bed-outline" size={18} color="#f47b20" />
              <Text style={styles.cardHeaderText}>Your Hostels ({hostelItems.length})</Text>
            </View>
            {hostelItems.map(item => (
              <View key={item._id} style={itemStyles.row}>
                <Image
                  source={{ uri: item.hostel?.images?.[0] }}
                  style={itemStyles.image}
                  resizeMode="cover"
                />
                <View style={itemStyles.info}>
                  <Text style={itemStyles.name}>{item.hostel?.name}</Text>
                  <Text style={itemStyles.kmLabel}>{item.roomType}</Text>
                  <Text style={[itemStyles.kmLabel, { color: '#999' }]}>
                    {item.mealOption === 'bedOnly' ? 'Bed Only' : item.mealOption === 'bedAndBreakfast' ? 'Bed & Breakfast' : 'Bed + Breakfast + Dinner'}
                  </Text>
                  <View style={itemStyles.controls}>
                    <Text style={itemStyles.qty}>{item.quantity} bed(s) × {(item as any).numberOfNights ?? 1} night(s)</Text>
                    <Text style={itemStyles.price}>₹{item.totalPrice?.toFixed(0)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Helmet Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-outline" size={18} color="#f47b20" />
            <Text style={styles.cardHeaderText}>Add Helmets</Text>
          </View>
          {/* Info box */}
          <View style={styles.helmetInfo}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#1d4ed8" />
            <View style={styles.helmetInfoText}>
              <Text style={styles.helmetInfoTitle}>Helmet Rental Available</Text>
              <Text style={styles.helmetInfoSub}>{helmetMsg}</Text>
            </View>
          </View>
          {/* Stepper */}
          <View style={styles.helmetControl}>
            <View style={styles.helmetControlLeft}>
              <Text style={styles.helmetControlLabel}>Number of Helmets</Text>
              <Text style={styles.helmetSelected}>{helmetQty} helmet(s) selected</Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={itemStyles.qtyBtn}
                onPress={() => updateHelmet.mutate(Math.max(0, helmetQty - 1))}
                disabled={helmetQty <= 0 || updateHelmet.isPending}
              >
                <Ionicons name="remove" size={14} color="#1a1a1a" />
              </TouchableOpacity>
              {updateHelmet.isPending ? (
                <ActivityIndicator size="small" color="#f47b20" />
              ) : (
                <Text style={itemStyles.qty}>{helmetQty}</Text>
              )}
              <TouchableOpacity
                style={itemStyles.qtyBtn}
                onPress={() => updateHelmet.mutate(Math.min(20, helmetQty + 1))}
                disabled={updateHelmet.isPending}
              >
                <Ionicons name="add" size={14} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
          </View>
          {helmetCharges > 0 && (
            <View style={styles.helmetChargeBox}>
              <Ionicons name="shield-outline" size={14} color="#f47b20" />
              <Text style={styles.helmetChargeText}>Helmet charges: ₹{helmetCharges}</Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
          </View>
          {bulkDiscountAmt > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bulk Discount ({bulkDiscountPct}%):</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-₹{bulkDiscountAmt.toLocaleString()}</Text>
            </View>
          )}
          {surgeMultiplier > 1 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Peak Time Charges:</Text>
              <Text style={[styles.summaryValue, { color: '#f47b20' }]}>+₹{((surgeMultiplier - 1) * subtotal).toFixed(0)}</Text>
            </View>
          )}
          {extraCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Extra Charges:</Text>
              <Text style={styles.summaryValue}>₹{extraCharges.toLocaleString()}</Text>
            </View>
          )}
          {helmetCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Helmet Charges:</Text>
              <Text style={styles.summaryValue}>₹{helmetCharges.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST ({gstPct}%):</Text>
            <Text style={styles.summaryValue}>₹{gst.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
          </View>

          {/* Savings banner */}
          {bulkDiscountAmt > 0 && (
            <View style={styles.savingsBanner}>
              <Ionicons name="gift-outline" size={14} color="#15803d" />
              <Text style={styles.savingsText}>You saved ₹{bulkDiscountAmt} with bulk booking!</Text>
            </View>
          )}

          {/* Checkout Button */}
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          </TouchableOpacity>
          <Text style={styles.secureNote}>Secure payment • No hidden charges</Text>
        </View>

        {/* Booking Details */}
        {bikeItems.length > 0 && bikeDates?.startDate && (
          <View style={styles.card}>
            <Text style={styles.bookingDetailsTitle}>Booking Details</Text>
            <Text style={styles.bookingType}>BIKE RENTAL</Text>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Pickup:</Text>
              <Text style={styles.bookingValue}>
                {new Date(bikeDates.startDate).toLocaleDateString()}{'\n'}{bikeDates.startTime}
              </Text>
            </View>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Dropoff:</Text>
              <Text style={styles.bookingValue}>
                {new Date(bikeDates.endDate).toLocaleDateString()}{'\n'}{bikeDates.endTime}
              </Text>
            </View>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Total Bikes:</Text>
              <Text style={styles.bookingValue}>{totalBikes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10,
  },
  image: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#f5f5f5' },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  kmLabel: { fontSize: 11, color: '#666', marginBottom: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  qty: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', minWidth: 20, textAlign: 'center' },
  price: { fontSize: 13, fontWeight: '700', color: '#f47b20' },
  deleteBtn: { padding: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkText: { fontSize: 13, color: '#666', fontWeight: '500' },
  cartCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartCountText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  emptySub: { fontSize: 13, color: '#666', textAlign: 'center' },
  browseBikesBtn: { backgroundColor: '#f47b20', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  browseBikesBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 12, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardHeaderText: { fontSize: 14, fontWeight: '700', color: '#f47b20' },

  // Special Offer
  specialOffer: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 2, borderColor: '#f47b20',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  specialOfferIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#f47b20', alignItems: 'center', justifyContent: 'center',
  },
  specialOfferContent: { flex: 1 },
  specialOfferTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  specialOfferTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  specialOfferBody: { fontSize: 12, color: '#555', lineHeight: 16, marginBottom: 3 },
  specialOfferHighlight: { color: '#f47b20', fontWeight: '700' },
  specialOfferCta: { fontSize: 11, color: '#999' },

  // Helmet
  helmetInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  helmetInfoText: { flex: 1 },
  helmetInfoTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 2 },
  helmetInfoSub: { fontSize: 11, color: '#1d4ed8', lineHeight: 15 },
  helmetControl: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#e5e5e5',
  },
  helmetControlLeft: {},
  helmetControlLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  helmetSelected: { fontSize: 11, color: '#666', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helmetChargeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff5ed', borderRadius: 6, padding: 8, marginTop: 8,
    borderWidth: 1, borderColor: '#ffd4a8',
  },
  helmetChargeText: { fontSize: 12, color: '#f47b20', fontWeight: '500' },

  // Summary
  summaryCard: { borderWidth: 2, borderColor: '#f47b20' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#f47b20', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#555' },
  summaryValue: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  discountValue: { color: '#22c55e' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 6 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#f47b20' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#f47b20' },
  savingsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginTop: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  savingsText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  checkoutBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secureNote: { textAlign: 'center', color: '#999', fontSize: 11, marginTop: 6 },

  // Booking Details
  bookingDetailsTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  bookingType: { fontSize: 10, fontWeight: '700', color: '#f47b20', letterSpacing: 0.5, marginBottom: 8 },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  bookingLabel: { fontSize: 13, color: '#666' },
  bookingValue: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', textAlign: 'right', lineHeight: 18 },
});
