import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
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
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { Cart } from '../../types/cart.types';
import { getCartTotal } from '../../types/cart.types';

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

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

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
      const currentTotal = cart ? getCartTotal(cart) : 0;
      const currentPayNow = partialPayment ? Math.ceil(currentTotal * 0.25) : currentTotal;

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
        payNowRupees: currentPayNow,
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

  const total = cart ? getCartTotal(cart) : 0;
  const partialAmount = Math.ceil(total * 0.25);
  const payNow = partialPayment ? partialAmount : total;
  const payLater = total - partialAmount;
  const bikeItems = cart?.bikeItems ?? [];
  const hostelItems = cart?.hostelItems ?? [];

  // Per-booking price breakdown for payment summary
  const pricing = cart?.pricing;
  const priceBreakdown = cart?.priceBreakdown;
  const basePrice = pricing?.subtotal ?? priceBreakdown?.subtotal ?? total;
  const gst = pricing?.gst ?? priceBreakdown?.gst ?? 0;
  const gstPct = pricing?.gstPercentage ?? 5;

  const isPending = isSubmitting || checkoutMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Checkout" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Complete Your Payment</Text>
            <Text style={styles.pageSubtitle}>Secure payment powered by Razorpay</Text>
          </View>

          {/* ── Booking Details Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Details</Text>

            {/* Bike Items */}
            {bikeItems.map((item, index) => (
              <View key={item._id}>
                {index > 0 && <View style={styles.separator} />}
                <View style={styles.bookingTypeRow}>
                  <Text style={styles.bookingTypeEmoji}>🏍️</Text>
                  <Text style={styles.bookingTypeLabel}>Bike Rental</Text>
                </View>
                <View style={styles.itemRow}>
                  <Image
                    source={{ uri: item.bike?.images?.[0] ?? 'https://via.placeholder.com/80' }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {(item.bike as any)?.title ?? (item.bike as any)?.name ?? 'Bike'}
                    </Text>
                    <Text style={styles.itemSub}>
                      {(item.bike as any)?.brand ?? ''}{(item.bike as any)?.model ? ` · ${(item.bike as any).model}` : ''}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {item.kmOption === 'unlimited' ? 'Unlimited KM' : 'Limited KM'}
                        </Text>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Qty: {item.quantity}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                {(item.startDate || (cart?.bikeDates?.startDate)) && (
                  <View style={styles.datesRow}>
                    <View style={styles.dateBox}>
                      <Text style={styles.dateLabel}>Pickup</Text>
                      <View style={styles.dateValueRow}>
                        <Ionicons name="calendar-outline" size={13} color="#555" />
                        <Text style={styles.dateValue}>
                          {formatDate(item.startDate ?? cart?.bikeDates?.startDate ?? '')}
                        </Text>
                      </View>
                      <Text style={styles.dateTime}>
                        {item.startTime ?? cart?.bikeDates?.startTime ?? ''}
                      </Text>
                    </View>
                    <View style={styles.dateBox}>
                      <Text style={styles.dateLabel}>Drop</Text>
                      <View style={styles.dateValueRow}>
                        <Ionicons name="calendar-outline" size={13} color="#555" />
                        <Text style={styles.dateValue}>
                          {formatDate(item.endDate ?? cart?.bikeDates?.endDate ?? '')}
                        </Text>
                      </View>
                      <Text style={styles.dateTime}>
                        {item.endTime ?? cart?.bikeDates?.endTime ?? ''}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))}

            {/* Hostel Items */}
            {hostelItems.map((item, index) => (
              <View key={item._id}>
                {(bikeItems.length > 0 || index > 0) && <View style={styles.separator} />}
                <View style={styles.bookingTypeRow}>
                  <Text style={styles.bookingTypeEmoji}>🏨</Text>
                  <Text style={styles.bookingTypeLabel}>Hostel Stay</Text>
                </View>
                <View style={styles.itemRow}>
                  <Image
                    source={{ uri: item.hostel?.images?.[0] ?? 'https://via.placeholder.com/80' }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.hostel?.name ?? 'Hostel'}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={12} color="#888" />
                      <Text style={styles.itemSub}>{item.hostel?.location ?? ''}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.roomType}</Text>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {item.mealOption === 'bedOnly' ? 'Bed Only'
                            : item.mealOption === 'bedAndBreakfast' ? 'Bed & Breakfast'
                            : 'Bed + Breakfast + Dinner'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.datesRow}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateLabel}>Check-in</Text>
                    <View style={styles.dateValueRow}>
                      <Ionicons name="calendar-outline" size={13} color="#555" />
                      <Text style={styles.dateValue}>{formatDate(item.checkIn)}</Text>
                    </View>
                  </View>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateLabel}>Check-out</Text>
                    <View style={styles.dateValueRow}>
                      <Ionicons name="calendar-outline" size={13} color="#555" />
                      <Text style={styles.dateValue}>{formatDate(item.checkOut)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Booking status badges */}
            <View style={styles.separator} />
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>Booking Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Pending</Text>
                </View>
              </View>
              <View>
                <Text style={styles.statusLabel}>Payment Status</Text>
                <View style={[styles.statusBadge, styles.statusBadgeYellow]}>
                  <Text style={[styles.statusBadgeText, styles.statusBadgeTextYellow]}>Pending</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Guest Details Card ── */}
          {/* <View style={styles.card}>
            <Text style={styles.cardTitle}>Guest Details</Text>
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
          </View> */}

          {/* ── Payment Options Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Options</Text>

            {/* 25% Option */}
            <TouchableOpacity
              style={[styles.payOption, partialPayment && styles.payOptionActive]}
              onPress={() => setPartialPayment(true)}
              activeOpacity={0.8}
            >
              <View style={styles.payOptionHeader}>
                <View style={[styles.radio, partialPayment && styles.radioActive]}>
                  {partialPayment && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.payOptionTitle}>Pay 25% Now (Recommended)</Text>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              </View>
              <Text style={styles.payOptionDesc}>
                Reserve all {bikeItems.length + hostelItems.length} booking(s) with just 25% payment now.
                Pay the remaining 75% anytime before pickup/check-in.
              </Text>
              {/* Mini breakdown */}
              <View style={styles.miniBreakdown}>
                {bikeItems.map((item, i) => (
                  <View key={i} style={styles.miniBreakdownRow}>
                    {/* <Text style={styles.miniBreakdownLabel}>🏍️ Bike Rental</Text> */}
                    <Text style={styles.miniBreakdownValue}>₹{item.totalPrice?.toFixed(2)}</Text>
                  </View>
                ))}
                {hostelItems.map((item, i) => (
                  <View key={i} style={styles.miniBreakdownRow}>
                    <Text style={styles.miniBreakdownLabel}>🏨 Hostel Stay</Text>
                    <Text style={styles.miniBreakdownValue}>₹{item.totalPrice?.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.payAmountRow}>
                <Text style={styles.payAmountBig}>₹{partialAmount.toFixed(2)}</Text>
                <Text style={styles.payAmountSub}>(25% of ₹{total.toFixed(2)})</Text>
              </View>
            </TouchableOpacity>

            {/* 100% Option */}
            <TouchableOpacity
              style={[styles.payOption, !partialPayment && styles.payOptionActive]}
              onPress={() => setPartialPayment(false)}
              activeOpacity={0.8}
            >
              <View style={styles.payOptionHeader}>
                <View style={[styles.radio, !partialPayment && styles.radioActive]}>
                  {!partialPayment && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.payOptionTitle}>Pay 100% Now</Text>
              </View>
              <Text style={styles.payOptionDesc}>
                Complete full payment now and you're all set! No remaining balance.
              </Text>
              <View style={styles.payAmountRow}>
                <Text style={styles.payAmountBig}>₹{total.toFixed(2)}</Text>
                <Text style={styles.payAmountSub}>(Full amount)</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Security Info Card ── */}
          <View style={styles.securityCard}>
            <Ionicons name="shield-checkmark" size={28} color="#2563eb" />
            <View style={styles.securityText}>
              <Text style={styles.securityTitle}>Your payment is secure</Text>
              <Text style={styles.securitySub}>All transactions are encrypted and secured by Razorpay</Text>
            </View>
          </View>

          {/* ── Payment Summary Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Summary</Text>

            {/* Per-item breakdown */}
            {bikeItems.map((item, i) => (
              <View key={i} style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  {/* <Text style={styles.summaryItemType}>🏍️ Bike Rental</Text> */}
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>Base Price</Text>
                  <Text style={styles.summaryLineValue}>₹{item.pricePerUnit?.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>GST ({gstPct}%)</Text>
                  <Text style={styles.summaryLineValue}>+ ₹{(item.totalPrice - item.pricePerUnit * item.quantity).toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryLine, styles.summaryLineStrong]}>
                  <Text style={styles.summaryLineLabelStrong}>Subtotal</Text>
                  <Text style={styles.summaryLineValueStrong}>₹{item.totalPrice?.toFixed(2)}</Text>
                </View>
              </View>
            ))}

            {hostelItems.map((item, i) => (
              <View key={i} style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <Text style={styles.summaryItemType}>🏨 Hostel Stay</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>Base Price</Text>
                  <Text style={styles.summaryLineValue}>₹{item.pricePerUnit?.toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryLine, styles.summaryLineStrong]}>
                  <Text style={styles.summaryLineLabelStrong}>Subtotal</Text>
                  <Text style={styles.summaryLineValueStrong}>₹{item.totalPrice?.toFixed(2)}</Text>
                </View>
              </View>
            ))}

            <View style={styles.separator} />

            <View style={styles.summaryLine}>
              <Text style={styles.summaryLineLabelStrong}>Total Amount</Text>
              <Text style={styles.summaryLineLabelStrong}>₹{total.toFixed(2)}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryPayNowRow}>
              <Text style={styles.summaryPayNowLabel}>
                {partialPayment ? 'Pay Now (25%)' : 'Pay Now (100%)'}
              </Text>
              <Text style={styles.summaryPayNowAmount}>₹{payNow.toFixed(2)}</Text>
            </View>

            {partialPayment && (
              <Text style={styles.remainingNote}>
                Remaining ₹{payLater.toFixed(2)} due before pickup/check-in
              </Text>
            )}
          </View>

          {/* ── Terms + Pay Button ── */}
          <View style={styles.card}>
            <Controller
              control={control}
              name="agreeTerms"
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => onChange(!value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, value && styles.checkboxChecked]}>
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

            <TouchableOpacity
              style={[styles.payBtn, isPending && styles.payBtnDisabled]}
              onPress={() => handleSubmit((data) => checkoutMutation.mutate(data))()}
              disabled={isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.payBtnText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.payBtnText}>Pay ₹{payNow.toFixed(2)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },

  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  pageSubtitle: { fontSize: 13, color: '#888', marginTop: 3 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },

  separator: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  // Booking item
  bookingTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  bookingTypeEmoji: { fontSize: 18 },
  bookingTypeLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  itemRow: { flexDirection: 'row', gap: 12, backgroundColor: '#f9f9f9', borderRadius: 10, padding: 10, marginBottom: 12 },
  itemImage: { width: 76, height: 76, borderRadius: 8, backgroundColor: '#eee' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  itemSub: { fontSize: 12, color: '#666', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 6 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeText: { fontSize: 11, color: '#444', fontWeight: '500' },

  datesRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dateBox: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#888', marginBottom: 3 },
  dateValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateValue: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },
  dateTime: { fontSize: 11, color: '#888', marginTop: 1 },

  // Status badges
  statusRow: { flexDirection: 'row', gap: 24 },
  statusLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  statusBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusBadgeYellow: { backgroundColor: '#fefce8' },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  statusBadgeTextYellow: { color: '#854d0e' },

  // Guest Details
  textarea: { height: 80, textAlignVertical: 'top' },

  // Payment Options
  payOption: {
    borderWidth: 2, borderColor: '#e5e5e5', borderRadius: 12,
    padding: 14, marginBottom: 12, backgroundColor: '#fff',
  },
  payOptionActive: { borderColor: '#f47b20', backgroundColor: '#fff8f3' },
  payOptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#f47b20' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f47b20' },
  payOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  popularBadge: {
    backgroundColor: '#22c55e', borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  popularText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  payOptionDesc: { fontSize: 12, color: '#666', lineHeight: 17, marginLeft: 28, marginBottom: 10 },

  miniBreakdown: {
    backgroundColor: '#fff', borderRadius: 8, padding: 10,
    marginLeft: 28, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  miniBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  miniBreakdownLabel: { fontSize: 12, color: '#666' },
  miniBreakdownValue: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },

  payAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginLeft: 28 },
  payAmountBig: { fontSize: 22, fontWeight: '800', color: '#f47b20' },
  payAmountSub: { fontSize: 12, color: '#888' },

  // Security card
  securityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#bfdbfe',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  securityText: { flex: 1 },
  securityTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  securitySub: { fontSize: 11, color: '#3b82f6', marginTop: 2, lineHeight: 15 },

  // Payment Summary
  summaryItem: {
    paddingBottom: 10, marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  summaryItemHeader: { marginBottom: 6 },
  summaryItemType: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summaryLineStrong: { marginTop: 3 },
  summaryLineLabel: { fontSize: 13, color: '#666' },
  summaryLineValue: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  summaryLineLabelStrong: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  summaryLineValueStrong: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },

  summaryPayNowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 },
  summaryPayNowLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  summaryPayNowAmount: { fontSize: 24, fontWeight: '800', color: '#f47b20' },
  remainingNote: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 6 },

  // Terms + Pay
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  termsText: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  termsLink: { color: '#f47b20', fontWeight: '600' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8 },

  payBtn: {
    backgroundColor: '#f47b20', borderRadius: 12,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#f47b20', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  payBtnDisabled: { backgroundColor: '#f9a46a', shadowOpacity: 0 },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
