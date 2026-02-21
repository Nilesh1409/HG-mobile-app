import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { Cart } from '../../types/cart.types';
import type { Booking } from '../../types/booking.types';

type Nav = StackNavigationProp<MainStackParamList, 'Checkout'>;

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Enter valid email'),
  phone: z.string().length(10, '10-digit mobile required').regex(/^\d+$/),
  specialRequests: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [partialPayment, setPartialPayment] = useState(false);

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Cart }>('/cart/details');
      return res.data.data;
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.mobile ?? '',
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<{ success: boolean; data: Booking[] }>('/bookings/cart', {
        guestDetails: { name: data.name, email: data.email, phone: data.phone },
        specialRequests: data.specialRequests,
        partialPaymentPercentage: partialPayment ? 25 : 100,
      }),
    onSuccess: (res) => {
      const booking = res.data.data?.[0];
      if (booking) {
        navigation.navigate('PaymentProcessing', {
          bookingId: booking._id,
          paymentGroupId: booking.paymentGroupId,
          paymentType: partialPayment ? 'partial' : 'full',
        });
      }
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Checkout failed',
        text2: err?.response?.data?.message ?? 'Please try again',
      });
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const total = cart?.priceBreakdown?.totalAmount ?? 0;
  const payAmount = partialPayment ? Math.ceil(total * 0.25) : total;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Checkout" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Guest Details</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input label="Name" onChangeText={onChange} value={value} error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email"
                onChangeText={onChange}
                value={value}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Phone"
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
                maxLength={10}
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="specialRequests"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Special Requests (Optional)"
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={3}
                style={styles.textarea}
              />
            )}
          />

          {/* Payment Option */}
          <Text style={styles.sectionTitle}>Payment Option</Text>
          <TouchableOpacity
            style={[styles.payOption, !partialPayment && styles.payOptionActive]}
            onPress={() => setPartialPayment(false)}
          >
            <View style={styles.radioCircle}>
              {!partialPayment && <View style={styles.radioDot} />}
            </View>
            <View style={styles.payOptionInfo}>
              <Text style={styles.payOptionTitle}>Pay Full Amount</Text>
              <Text style={styles.payOptionAmount}>₹{total}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payOption, partialPayment && styles.payOptionActive]}
            onPress={() => setPartialPayment(true)}
          >
            <View style={styles.radioCircle}>
              {partialPayment && <View style={styles.radioDot} />}
            </View>
            <View style={styles.payOptionInfo}>
              <Text style={styles.payOptionTitle}>Pay 25% Now</Text>
              <Text style={styles.payOptionAmount}>₹{Math.ceil(total * 0.25)} <Text style={styles.payOptionSub}>(rest on pickup)</Text></Text>
            </View>
          </TouchableOpacity>

          {/* Order Summary */}
          <View style={styles.summary}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryVal}>{(cart?.bikeItems?.length ?? 0) + (cart?.hostelItems?.length ?? 0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryVal}>₹{total}</Text>
            </View>
            <View style={[styles.summaryRow, styles.payRow]}>
              <Text style={styles.payLabel}>Pay Now</Text>
              <Text style={styles.payValue}>₹{payAmount}</Text>
            </View>
          </View>

          <Button
            title={`Pay ₹${payAmount}`}
            onPress={handleSubmit((data) => checkoutMutation.mutate(data))}
            loading={isSubmitting || checkoutMutation.isPending}
            style={styles.payBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12, marginTop: 8 },
  textarea: { height: 80, textAlignVertical: 'top' },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    gap: 12,
  },
  payOptionActive: { borderColor: '#f47b20', backgroundColor: '#fff5ed' },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f47b20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f47b20' },
  payOptionInfo: { flex: 1 },
  payOptionTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  payOptionAmount: { fontSize: 16, fontWeight: '700', color: '#f47b20', marginTop: 2 },
  payOptionSub: { fontSize: 12, color: '#999', fontWeight: '400' },
  summary: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: { color: '#666', fontSize: 14 },
  summaryVal: { color: '#1a1a1a', fontSize: 14, fontWeight: '500' },
  payRow: { borderTopWidth: 1, borderTopColor: '#e5e5e5', marginTop: 8, paddingTop: 12 },
  payLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  payValue: { fontSize: 20, fontWeight: '700', color: '#f47b20' },
  payBtn: { marginTop: 4 },
});
