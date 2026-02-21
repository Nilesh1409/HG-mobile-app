import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import RazorpayCheckout from 'react-native-razorpay';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import type { MainStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { RazorpayOrder } from '../../types/payment.types';
import queryClient from '../../lib/queryClient';

type Nav = StackNavigationProp<MainStackParamList, 'PaymentProcessing'>;
type Route = RouteProp<MainStackParamList, 'PaymentProcessing'>;

export default function PaymentProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId, paymentGroupId, paymentType } = route.params;
  const { user } = useAuthStore();
  const { clearCart } = useCartStore();

  const [status, setStatus] = useState<'loading' | 'processing' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    initPayment();
  }, []);

  const initPayment = async () => {
    try {
      const res = await api.post<{ success: boolean; data: RazorpayOrder }>(
        `/payments/booking/${bookingId}`,
        { paymentType }
      );
      setStatus('processing');
      await openRazorpay(res.data.data);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.message ?? 'Failed to initiate payment');
    }
  };

  const openRazorpay = async (order: RazorpayOrder) => {
    const options = {
      description: 'HappyGo Rentals Booking',
      image: 'https://happygorentals.com/logo.png',
      currency: order.currency,
      key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
      amount: order.amount,
      order_id: order.id,
      name: 'HappyGo Rentals',
      prefill: {
        email: user?.email ?? '',
        contact: user?.mobile ?? '',
        name: user?.name ?? '',
      },
      theme: { color: '#f47b20' },
    };

    try {
      const data = await RazorpayCheckout.open(options);
      await verifyPayment(data as { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string });
    } catch (error: any) {
      if (error?.code === 0) {
        Toast.show({ type: 'info', text1: 'Payment Cancelled' });
        navigation.goBack();
      } else {
        setStatus('error');
        setErrorMsg(error?.description ?? 'Payment failed');
      }
    }
  };

  const verifyPayment = async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    try {
      if (paymentGroupId) {
        await api.post('/payments/cart/verify', {
          paymentGroupId,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      } else {
        await api.post(`/payments/booking/${bookingId}/verify`, {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigation.replace('BookingSuccess', {
        paymentGroupId: paymentGroupId ?? bookingId,
      });
    } catch {
      setStatus('error');
      setErrorMsg('Payment verification failed. Contact support.');
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#f47b20" />
        <Text style={styles.text}>Initializing payment...</Text>
      </SafeAreaView>
    );
  }

  if (status === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#f47b20" />
        <Text style={styles.text}>Processing your payment...</Text>
        <Text style={styles.subtext}>Please do not close the app</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.errorIcon}>❌</Text>
      <Text style={styles.errorTitle}>Payment Failed</Text>
      <Text style={styles.errorMsg}>{errorMsg}</Text>
      <Button title="Try Again" onPress={initPayment} style={styles.retryBtn} />
      <Button
        title="Go Back"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    gap: 16,
  },
  text: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  subtext: { fontSize: 13, color: '#999' },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  errorMsg: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  retryBtn: { width: '100%' },
  backBtn: { width: '100%' },
});
