import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import CartBikeItem from '../../components/cart/CartBikeItem';
import CartHostelItem from '../../components/cart/CartHostelItem';
import Button from '../../components/common/Button';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { Cart } from '../../types/cart.types';
import queryClient from '../../lib/queryClient';

type Nav = StackNavigationProp<MainStackParamList, 'Cart'>;

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

  const updateHelmetMutation = useMutation({
    mutationFn: (quantity: number) =>
      api.put('/cart/helmets', { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update helmets' }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const hasBikes = (cart?.bikeItems?.length ?? 0) > 0;
  const hasHostels = (cart?.hostelItems?.length ?? 0) > 0;
  const isEmpty = !hasBikes && !hasHostels;
  const breakdown = cart?.priceBreakdown;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Cart" />
      {isEmpty ? (
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          subtitle="Add bikes or hostels to get started"
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />
            }
          >
            {hasBikes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏍 Bikes</Text>
                {cart!.bikeItems.map((item) => (
                  <CartBikeItem key={item._id} item={item} />
                ))}

                {/* Helmets */}
                <View style={styles.helmetRow}>
                  <Text style={styles.helmetLabel}>🪖 Helmets</Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateHelmetMutation.mutate(Math.max(0, (cart?.helmetQuantity ?? 0) - 1))}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qty}>{cart?.helmetQuantity ?? 0}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateHelmetMutation.mutate((cart?.helmetQuantity ?? 0) + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {hasHostels && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏨 Hostels</Text>
                {cart!.hostelItems.map((item) => (
                  <CartHostelItem key={item._id} item={item} />
                ))}
              </View>
            )}

            {/* Price Summary */}
            {breakdown && (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Price Summary</Text>
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
                {breakdown.helmetCharges > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Helmet Charges</Text>
                    <Text style={styles.summaryValue}>₹{breakdown.helmetCharges}</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST</Text>
                  <Text style={styles.summaryValue}>₹{breakdown.gst}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{breakdown.totalAmount}</Text>
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalSmall}>Total Amount</Text>
              <Text style={styles.totalBig}>₹{breakdown?.totalAmount ?? 0}</Text>
            </View>
            <Button
              title="Proceed to Checkout"
              onPress={() => navigation.navigate('Checkout')}
              style={styles.checkoutBtn}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scroll: { padding: 16, paddingBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  helmetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  helmetLabel: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, color: '#1a1a1a', fontWeight: '600', lineHeight: 20 },
  qty: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', minWidth: 24, textAlign: 'center' },
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: { color: '#666', fontSize: 14 },
  summaryValue: { color: '#1a1a1a', fontSize: 14, fontWeight: '500' },
  discount: { color: '#22c55e' },
  totalRow: { borderBottomWidth: 0, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#f47b20' },
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
  totalSmall: { fontSize: 12, color: '#999' },
  totalBig: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  checkoutBtn: { minWidth: 180 },
});
