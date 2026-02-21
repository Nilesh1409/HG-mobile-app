import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import RazorpayCheckout from 'react-native-razorpay';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { MainStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import queryClient from '../../lib/queryClient';

type Nav = StackNavigationProp<MainStackParamList, 'PaymentProcessing'>;
type Route = RouteProp<MainStackParamList, 'PaymentProcessing'>;

type ScreenState = 'loading' | 'ready' | 'processing' | 'success' | 'error';

export default function PaymentProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    razorpayOrderId,
    razorpayAmount,
    razorpayCurrency,
    paymentGroupId,
    bookingId,
    paymentType,
    guestName,
    guestEmail,
    guestPhone,
  } = route.params;

  const { user } = useAuthStore();
  const { clearCart } = useCartStore();

  const [state, setState] = useState<ScreenState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderData, setOrderData] = useState<{
    orderId: string;
    amount: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    initPayment();
  }, []);

  const initPayment = async () => {
    try {
      if (razorpayOrderId && razorpayAmount) {
        // Order was pre-created by /bookings/cart — use it directly
        setOrderData({
          orderId: razorpayOrderId,
          amount: razorpayAmount,
          currency: razorpayCurrency ?? 'INR',
        });
        setState('ready');
      } else if (bookingId) {
        // Individual booking payment — create order now
        const res = await api.post<{ success: boolean; data: { id: string; amount: number; currency: string } }>(
          `/payments/booking/${bookingId}`,
          { paymentType }
        );
        setOrderData({
          orderId: res.data.data.id,
          amount: res.data.data.amount,
          currency: res.data.data.currency ?? 'INR',
        });
        setState('ready');
      } else {
        throw new Error('No order or booking ID provided');
      }
    } catch (err: any) {
      setState('error');
      setErrorMsg(err?.response?.data?.message ?? err?.message ?? 'Failed to initialize payment');
    }
  };

  const openRazorpay = async () => {
    if (!orderData) return;
    setState('processing');

    const prefillName = guestName ?? user?.name ?? '';
    const prefillEmail = guestEmail ?? user?.email ?? '';
    const prefillPhone = guestPhone ?? user?.mobile ?? '';

    const options = {
      description: 'Happy Go Rentals Booking',
      image: 'https://happygorentals.com/logo.png',
      currency: orderData.currency,
      key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
      amount: orderData.amount,
      order_id: orderData.orderId,
      name: 'Happy Go Rentals',
      prefill: {
        email: prefillEmail,
        contact: prefillPhone,
        name: prefillName,
      },
      theme: { color: '#f47b20' },
    };

    try {
      const data = await RazorpayCheckout.open(options);
      await verifyPayment(data);
    } catch (error: any) {
      if (error?.code === 0) {
        // User cancelled
        Toast.show({ type: 'info', text1: 'Payment Cancelled' });
        setState('ready');
      } else {
        setState('error');
        setErrorMsg(error?.description ?? 'Payment failed. Please try again.');
      }
    }
  };

  const verifyPayment = async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setState('processing');
    try {
      if (paymentGroupId) {
        // Cart payment — verify all bookings at once
        await api.post('/payments/cart/verify', {
          paymentGroupId,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      } else if (bookingId) {
        // Single booking payment
        await api.post(`/payments/booking/${bookingId}/verify`, {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setState('success');

      navigation.replace('BookingSuccess', {
        paymentGroupId: paymentGroupId ?? bookingId ?? '',
      });
    } catch (err: any) {
      setState('error');
      setErrorMsg(err?.response?.data?.message ?? 'Payment verification failed. Contact support.');
    }
  };

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#f47b20" />
        <Text style={styles.loadingText}>Initializing payment...</Text>
      </SafeAreaView>
    );
  }

  if (state === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#f47b20" />
        <Text style={styles.loadingText}>Processing your payment...</Text>
        <Text style={styles.loadingSubtext}>Please do not close the app</Text>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorIcon}>
          <Ionicons name="close-circle" size={64} color="#ef4444" />
        </View>
        <Text style={styles.errorTitle}>Payment Failed</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <Button title="Try Again" onPress={initPayment} style={styles.actionBtn} />
        <Button
          title="Go Back"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.actionBtn}
        />
      </SafeAreaView>
    );
  }

  // state === 'ready' — show booking summary + Pay Now button
  const amountInRupees = orderData ? Math.round(orderData.amount / 100) : 0;

  return (
    <SafeAreaView style={styles.fullContainer} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Your Payment</Text>
        <Text style={styles.headerSub}>Secure payment powered by Razorpay</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Payment Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Type</Text>
            <Text style={styles.summaryValue}>{paymentType === 'partial' ? '25% Advance' : paymentType === 'remaining' ? 'Remaining Balance' : 'Full Payment'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryAmount}>₹{amountInRupees}</Text>
          </View>
          {paymentType === 'partial' && (
            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={14} color="#f47b20" />
              <Text style={styles.noteText}>
                Remaining 75% is due on pickup/check-in
              </Text>
            </View>
          )}
        </View>

        {/* Security */}
        <View style={styles.secureCard}>
          <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
          <View style={styles.secureText}>
            <Text style={styles.secureTitle}>Secure Payment</Text>
            <Text style={styles.secureSub}>All transactions encrypted via Razorpay</Text>
          </View>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.payLabel}>Pay Now</Text>
          <Text style={styles.payAmount}>₹{amountInRupees}</Text>
        </View>
        <Button
          title={`Pay ₹${amountInRupees}`}
          onPress={openRazorpay}
          style={styles.payBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: '#ffffff', gap: 16,
  },
  fullContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#f47b20', padding: 20, alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  loadingSubtext: { fontSize: 13, color: '#999' },
  errorIcon: {},
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  errorMsg: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  actionBtn: { width: '100%' },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', textTransform: 'capitalize' },
  summaryAmount: { fontSize: 20, fontWeight: '800', color: '#f47b20' },
  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff5ed', borderRadius: 8, padding: 10, marginTop: 10,
  },
  noteText: { fontSize: 12, color: '#666', flex: 1 },
  secureCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  secureText: { flex: 1 },
  secureTitle: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
  secureSub: { fontSize: 12, color: '#999', marginTop: 1 },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  payLabel: { fontSize: 12, color: '#999' },
  payAmount: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  payBtn: { minWidth: 160 },
});
