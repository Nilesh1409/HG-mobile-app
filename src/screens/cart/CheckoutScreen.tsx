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
import { Ionicons } from '@expo/vector-icons';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { Cart } from '../../types/cart.types';

type Nav = StackNavigationProp<MainStackParamList, 'Checkout'>;

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Enter valid email'),
  phone: z.string().length(10, '10-digit mobile required').regex(/^\d+$/),
  specialRequests: z.string().optional(),
  agreeTerms: z.literal(true, { message: 'You must agree to terms' }),
});
type FormData = z.infer<typeof schema>;

interface CartBookingResponse {
  success: boolean;
  data: {
    paymentGroupId: string;
    bookings: { bookingId: string; type: string }[];
    totalAmount: number;
    partialAmount: number;
    remainingAmount: number;
    razorpay: {
      orderId: string;
      amount: number;
      currency: string;
    };
  };
}

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { clearCart } = useCartStore();
  const [partialPayment, setPartialPayment] = useState(true);

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.mobile ?? '',
      agreeTerms: true,
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post<CartBookingResponse>('/bookings/cart', {
        guestDetails: { name: data.name, email: data.email, phone: data.phone },
        specialRequests: data.specialRequests || '',
        partialPaymentPercentage: partialPayment ? 25 : 100,
      });
      return res.data;
    },
    onSuccess: (res, formData) => {
      const { paymentGroupId, razorpay, bookings } = res.data;
      const firstBookingId = bookings?.[0]?.bookingId ?? paymentGroupId;

      navigation.navigate('PaymentProcessing', {
        razorpayOrderId: razorpay.orderId,
        razorpayAmount: razorpay.amount,
        razorpayCurrency: razorpay.currency,
        paymentGroupId,
        bookingId: firstBookingId,
        paymentType: partialPayment ? 'partial' : 'full',
        guestName: formData.name,
        guestEmail: formData.email,
        guestPhone: formData.phone,
      });
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
  const payNow = partialPayment ? Math.ceil(total * 0.25) : total;
  const payLater = total - payNow;
  const bikeCount = cart?.bikeItems?.length ?? 0;
  const hostelCount = cart?.hostelItems?.length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Checkout" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              {cart?.bikeItems?.map((item) => (
                <View key={item._id} style={styles.summaryRow}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="bicycle" size={16} color="#f47b20" />
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryName}>
                      {(item.bike as any)?.title ?? (item.bike as any)?.name ?? 'Bike'}
                    </Text>
                    <Text style={styles.summaryDetail}>
                      {item.startDate} → {item.endDate} · {item.kmOption} km
                    </Text>
                  </View>
                  <Text style={styles.summaryPrice}>₹{item.totalPrice}</Text>
                </View>
              ))}
              {cart?.hostelItems?.map((item) => (
                <View key={item._id} style={styles.summaryRow}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="bed" size={16} color="#f47b20" />
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryName}>
                      {(item.hostel as any)?.name ?? 'Hostel'}
                    </Text>
                    <Text style={styles.summaryDetail}>
                      {item.checkIn} → {item.checkOut}
                    </Text>
                  </View>
                  <Text style={styles.summaryPrice}>₹{item.totalPrice}</Text>
                </View>
              ))}
              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotal}>₹{total}</Text>
              </View>
            </View>
          </View>

          {/* Guest Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guest Details</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input label="Full Name" onChangeText={onChange} value={value} error={errors.name?.message} />
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
                  placeholder="E.g. Please keep bike fully fuelled"
                  onChangeText={onChange}
                  value={value}
                  multiline
                  numberOfLines={3}
                  style={styles.textarea}
                />
              )}
            />
          </View>

          {/* Payment Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Option</Text>

            <TouchableOpacity
              style={[styles.payOption, partialPayment && styles.payOptionActive]}
              onPress={() => setPartialPayment(true)}
            >
              <View style={styles.payOptionLeft}>
                <View style={[styles.radio, partialPayment && styles.radioActive]}>
                  {partialPayment && <View style={styles.radioDot} />}
                </View>
                <View style={styles.payOptionText}>
                  <View style={styles.payOptionTitleRow}>
                    <Text style={styles.payOptionTitle}>Pay 25% Now</Text>
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  </View>
                  <Text style={styles.payOptionSub}>
                    Reserve with just 25% now. Pay remaining 75% on pickup.
                  </Text>
                  {bikeCount > 0 && (
                    <Text style={styles.payOptionType}>🏍 Bike Rental</Text>
                  )}
                </View>
              </View>
              <Text style={styles.payAmount}>₹{Math.ceil(total * 0.25)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payOption, !partialPayment && styles.payOptionActive]}
              onPress={() => setPartialPayment(false)}
            >
              <View style={styles.payOptionLeft}>
                <View style={[styles.radio, !partialPayment && styles.radioActive]}>
                  {!partialPayment && <View style={styles.radioDot} />}
                </View>
                <View style={styles.payOptionText}>
                  <Text style={styles.payOptionTitle}>Pay 100% Now</Text>
                  <Text style={styles.payOptionSub}>
                    Complete full payment now. No remaining balance.
                  </Text>
                </View>
              </View>
              <Text style={styles.payAmount}>₹{total}</Text>
            </TouchableOpacity>
          </View>

          {/* Payment Summary */}
          <View style={styles.summaryFinal}>
            <View style={styles.summaryFinalRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#22c55e" />
              <Text style={styles.secureText}>Your payment is secure</Text>
            </View>
            <Text style={styles.summaryFinalLabel}>All transactions are encrypted and secured by Razorpay</Text>
            <View style={styles.divider} />
            <View style={styles.finalRow}>
              <Text style={styles.finalLabel}>Pay Now</Text>
              <Text style={styles.finalAmount}>₹{payNow}</Text>
            </View>
            {partialPayment && (
              <View style={styles.finalRow}>
                <Text style={styles.finalLabelSub}>Remaining (on pickup)</Text>
                <Text style={styles.finalAmountSub}>₹{payLater}</Text>
              </View>
            )}
          </View>

          {/* Terms */}
          <Controller
            control={control}
            name="agreeTerms"
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => onChange(!value)}
              >
                <View style={[styles.checkbox, value ? styles.checkboxChecked : undefined]}>
                  {value && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  I accept the{' '}
                  <Text style={styles.termsLink}>terms and conditions</Text>
                  {' '}to proceed with payment
                </Text>
              </TouchableOpacity>
            )}
          />
          {errors.agreeTerms && (
            <Text style={styles.errorText}>{errors.agreeTerms.message}</Text>
          )}

          <Button
            title={`Pay ₹${payNow}`}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff5ed', alignItems: 'center', justifyContent: 'center',
  },
  summaryInfo: { flex: 1 },
  summaryName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  summaryDetail: { fontSize: 11, color: '#999', marginTop: 1 },
  summaryPrice: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  summaryTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 10, marginTop: 4,
  },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#f47b20' },
  textarea: { height: 80, textAlignVertical: 'top' },
  payOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: '#e5e5e5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  payOptionActive: { borderColor: '#f47b20', backgroundColor: '#fff5ed' },
  payOptionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  radioActive: { borderColor: '#f47b20' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f47b20' },
  payOptionText: { flex: 1 },
  payOptionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  payOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  popularBadge: { backgroundColor: '#22c55e', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  popularText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  payOptionSub: { fontSize: 12, color: '#666', lineHeight: 16 },
  payOptionType: { fontSize: 11, color: '#f47b20', marginTop: 4, fontWeight: '500' },
  payAmount: { fontSize: 16, fontWeight: '800', color: '#f47b20', marginLeft: 8 },
  summaryFinal: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  summaryFinalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  secureText: { fontSize: 13, fontWeight: '600', color: '#22c55e' },
  summaryFinalLabel: { fontSize: 11, color: '#999', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 10 },
  finalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  finalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  finalAmount: { fontSize: 20, fontWeight: '800', color: '#f47b20' },
  finalLabelSub: { fontSize: 13, color: '#999' },
  finalAmountSub: { fontSize: 14, color: '#666', fontWeight: '500' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  termsText: { flex: 1, fontSize: 13, color: '#666', lineHeight: 18 },
  termsLink: { color: '#f47b20', fontWeight: '500' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8 },
  payBtn: { marginTop: 8 },
});
