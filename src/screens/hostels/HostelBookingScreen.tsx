import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { Cart } from '../../types/cart.types';
import { getCartTotal } from '../../types/cart.types';

type Nav = StackNavigationProp<MainStackParamList, 'HostelBooking'>;
type Route = RouteProp<MainStackParamList, 'HostelBooking'>;

interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
}
interface GuestErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  terms?: string;
}

interface CartBookingResponse {
  success: boolean;
  data: {
    paymentGroupId: string;
    bookings: { bookingId: string; type: string }[];
    totalAmount: number;
    partialAmount: number;
    remainingAmount: number;
    razorpay: { orderId: string; amount: number; currency: string };
  };
}

const MEAL_LABELS: Record<string, string> = {
  bedOnly: 'Bed Only',
  bedAndBreakfast: 'Bed & Breakfast',
  bedBreakfastAndDinner: 'Bed + Breakfast + Dinner',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
};

export default function HostelBookingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { hostelId, checkIn, checkOut, stayType } = route.params;
  const { user } = useAuthStore();
  const { clearCart } = useCartStore();

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [payPartial, setPayPartial] = useState(true); // true = 25%, false = 100%
  const [guest, setGuest] = useState<GuestDetails>({
    firstName: user?.name?.split(' ')[0] ?? '',
    lastName: user?.name?.split(' ').slice(1).join(' ') ?? '',
    email: user?.email ?? '',
    phone: user?.mobile ?? '',
    specialRequests: '',
  });
  const [errors, setErrors] = useState<GuestErrors>({});

  // Fetch cart
  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Cart }>('/cart/details');
      return res.data.data;
    },
  });

  const hostelItems = cart?.hostelItems ?? [];
  const bikeItems = cart?.bikeItems ?? [];

  // Calculate totals from cart items
  const hostelSubtotal = hostelItems.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
  const bikeSubtotal = bikeItems.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
  const subtotal = hostelSubtotal + bikeSubtotal;
  const taxes = subtotal * 0.05;
  const total = subtotal + taxes;

  const validateForm = (): boolean => {
    const e: GuestErrors = {};
    if (!guest.firstName.trim()) e.firstName = 'First name is required';
    if (!guest.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(guest.email)) e.email = 'Email is invalid';
    if (!guest.phone.trim()) e.phone = 'Mobile number is required';
    else if (!/^\d{10}$/.test(guest.phone.replace(/\s/g, ''))) e.phone = 'Mobile must be 10 digits';
    if (!agreedToTerms) e.terms = 'Please accept the terms and conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const fullName = [guest.firstName, guest.lastName].filter(Boolean).join(' ');
      const res = await api.post<CartBookingResponse>('/bookings/cart', {
        guestDetails: {
          name: fullName,
          email: guest.email,
          phone: guest.phone,
        },
        specialRequests: guest.specialRequests || '',
        partialPaymentPercentage: payPartial ? 25 : 100,
      });
      return res.data;
    },
    onSuccess: (res) => {
      const { paymentGroupId, razorpay, bookings } = res.data;
      const firstBookingId = bookings?.[0]?.bookingId ?? paymentGroupId;
      const payNowRupees = payPartial ? Math.ceil(total * 0.25) : total;

      navigation.navigate('PaymentProcessing', {
        razorpayOrderId: razorpay.orderId,
        razorpayAmount: razorpay.amount,
        razorpayCurrency: razorpay.currency,
        paymentGroupId,
        bookingId: firstBookingId,
        paymentType: payPartial ? 'partial' : 'full',
        guestName: [guest.firstName, guest.lastName].filter(Boolean).join(' '),
        guestEmail: guest.email,
        guestPhone: guest.phone,
        payNowRupees,
      });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Booking Failed',
        text2: err?.response?.data?.message ?? 'Please try again',
      });
    },
  });

  const handleProceedToPay = () => {
    if (!validateForm()) {
      Toast.show({ type: 'warning', text1: 'Validation Error', text2: 'Please fill in all required fields' });
      return;
    }
    checkoutMutation.mutate();
  };

  const updateField = (field: keyof GuestDetails, value: string) => {
    setGuest((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof GuestErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (cartLoading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#f47b20" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  if (hostelItems.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={56} color="#ef4444" />
        <Text style={styles.errorTitle}>Booking Data Not Found</Text>
        <Text style={styles.errorDesc}>Please start the booking process again.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back to Search</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Great pick! Guests love staying here</Text>
          <Text style={styles.headerSub}>Complete your hostel bed booking details below</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hostel Summary Card ── */}
          <View style={styles.card}>
            <View style={styles.hostelSummaryRow}>
              <Image
                source={{ uri: hostelItems[0]?.hostel?.images?.[0] ?? 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400' }}
                style={styles.hostelThumb}
                resizeMode="cover"
              />
              <View style={styles.hostelSummaryInfo}>
                <Text style={styles.hostelName}>{hostelItems[0]?.hostel?.name ?? 'Hostel'}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#888" />
                  <Text style={styles.hostelLocation}>{hostelItems[0]?.hostel?.location ?? ''}</Text>
                </View>
                <View style={styles.datesRow}>
                  <View style={styles.dateItem}>
                    <Ionicons name="calendar-outline" size={12} color="#888" />
                    <Text style={styles.dateText}>{formatDate(checkIn)} – {formatDate(checkOut)}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Selected hostel rooms */}
            <Text style={styles.subsectionTitle}>Selected Rooms</Text>
            <View style={styles.roomsList}>
              {hostelItems.map((item, i) => (
                <View key={i} style={styles.roomSummaryRow}>
                  <View style={styles.roomSummaryLeft}>
                    <Text style={styles.roomSummaryType}>{item.roomType}</Text>
                    <Text style={styles.roomSummaryMeal}>
                      {MEAL_LABELS[item.mealOption] ?? item.mealOption} × {item.quantity} bed(s)
                    </Text>
                    <Text style={styles.roomSummaryPrice}>
                      ₹{item.pricePerUnit?.toFixed(2)}/night × {item.numberOfNights ?? 1} nights
                    </Text>
                  </View>
                  <Text style={styles.roomSummaryTotal}>₹{item.totalPrice?.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            {/* Bikes in cart (if any) */}
            {bikeItems.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.subsectionTitle}>🏍️ Bikes in Cart</Text>
                <View style={styles.roomsList}>
                  {bikeItems.map((item, i) => (
                    <View key={i} style={[styles.roomSummaryRow, styles.bikeRow]}>
                      <View style={styles.bikeRowLeft}>
                        <Image
                          source={{ uri: item.bike?.images?.[0] ?? 'https://via.placeholder.com/48' }}
                          style={styles.bikeThumb}
                          resizeMode="cover"
                        />
                        <View>
                          <Text style={styles.roomSummaryType}>
                            {(item.bike as any)?.title ?? (item.bike as any)?.name ?? 'Bike'}
                          </Text>
                          <Text style={styles.roomSummaryMeal}>
                            Qty: {item.quantity} · {item.kmOption === 'unlimited' ? 'Unlimited KM' : 'Limited KM'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.roomSummaryTotal}>₹{item.totalPrice?.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* ── Guest Details Form ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Guest details</Text>

            <View style={styles.formRow}>
              {/* First name */}
              <View style={styles.formHalf}>
                <Text style={styles.fieldLabel}>First name</Text>
                <View style={[styles.inputBox, errors.firstName ? styles.inputBoxError : null]}>
                  <Ionicons name="person-outline" size={16} color="#aaa" />
                  <TextInput
                    style={styles.input}
                    value={guest.firstName}
                    onChangeText={(v) => updateField('firstName', v)}
                    placeholder="First name"
                    placeholderTextColor="#ccc"
                  />
                </View>
                {errors.firstName ? <Text style={styles.fieldError}>{errors.firstName}</Text> : null}
              </View>

              {/* Last name */}
              <View style={styles.formHalf}>
                <Text style={styles.fieldLabel}>Last name</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="person-outline" size={16} color="#aaa" />
                  <TextInput
                    style={styles.input}
                    value={guest.lastName}
                    onChangeText={(v) => updateField('lastName', v)}
                    placeholder="Last name"
                    placeholderTextColor="#ccc"
                  />
                </View>
              </View>
            </View>

            {/* Phone */}
            <Text style={styles.fieldLabel}>Mobile number</Text>
            <View style={[styles.inputBox, errors.phone ? styles.inputBoxError : null]}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={styles.phoneInputDivider} />
              <Ionicons name="call-outline" size={16} color="#aaa" style={{ marginLeft: 8 }} />
              <TextInput
                style={styles.input}
                value={guest.phone}
                onChangeText={(v) => updateField('phone', v)}
                placeholder="Enter 10-digit mobile"
                placeholderTextColor="#ccc"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

            {/* Email */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Email ID</Text>
            <View style={[styles.inputBox, errors.email ? styles.inputBoxError : null]}>
              <Ionicons name="mail-outline" size={16} color="#aaa" />
              <TextInput
                style={styles.input}
                value={guest.email}
                onChangeText={(v) => updateField('email', v)}
                placeholder="Enter your email address"
                placeholderTextColor="#ccc"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

            {/* Special Requests */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Special Requests (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={guest.specialRequests}
              onChangeText={(v) => updateField('specialRequests', v)}
              placeholder="Enter any special requirements or preferences..."
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Property Guidelines ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Property guidelines</Text>
            {[
              'Check-in from 1:00 PM',
              'Check-out by 10:00 AM',
              'All guests must carry a valid Govt. photo ID (PAN card not accepted)',
              'Local IDs are not accepted',
            ].map((g, i) => (
              <View key={i} style={styles.guidelineRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#888" />
                <Text style={styles.guidelineText}>{g}</Text>
              </View>
            ))}
          </View>

          {/* ── Payment Options Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Options</Text>

            {/* 25% partial */}
            <TouchableOpacity
              style={[styles.payOption, payPartial && styles.payOptionActive]}
              onPress={() => setPayPartial(true)}
              activeOpacity={0.8}
            >
              <View style={styles.payOptionHeader}>
                <View style={[styles.radio, payPartial && styles.radioActive]}>
                  {payPartial && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.payOptionTitle}>Pay 25% Now</Text>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              </View>
              <Text style={styles.payOptionDesc}>
                Reserve your stay with just 25% now. Pay the remaining 75% anytime before check-in.
              </Text>
              <View style={styles.payAmountRow}>
                <Text style={styles.payAmountBig}>₹{Math.ceil(total * 0.25).toFixed(2)}</Text>
                <Text style={styles.payAmountSub}>(25% of ₹{total.toFixed(2)})</Text>
              </View>
            </TouchableOpacity>

            {/* 100% full */}
            <TouchableOpacity
              style={[styles.payOption, !payPartial && styles.payOptionActive]}
              onPress={() => setPayPartial(false)}
              activeOpacity={0.8}
            >
              <View style={styles.payOptionHeader}>
                <View style={[styles.radio, !payPartial && styles.radioActive]}>
                  {!payPartial && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.payOptionTitle}>Pay 100% Now</Text>
              </View>
              <Text style={styles.payOptionDesc}>
                Complete full payment now. No remaining balance.
              </Text>
              <View style={styles.payAmountRow}>
                <Text style={styles.payAmountBig}>₹{total.toFixed(2)}</Text>
                <Text style={styles.payAmountSub}>(Full amount)</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Price Summary Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Price Summary</Text>

            {bikeSubtotal > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bikes</Text>
                <Text style={styles.summaryValue}>₹{bikeSubtotal.toFixed(2)}</Text>
              </View>
            )}
            {hostelSubtotal > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hostels</Text>
                <Text style={styles.summaryValue}>₹{hostelSubtotal.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxes (GST 5%)</Text>
              <Text style={styles.summaryValue}>+ ₹{taxes.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total:</Text>
              <Text style={styles.summaryTotalValue}>₹{total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryTotalLabel, { color: '#f47b20' }]}>
                Pay Now ({payPartial ? '25%' : '100%'}):
              </Text>
              <Text style={[styles.summaryTotalValue, { fontSize: 20 }]}>
                ₹{(payPartial ? Math.ceil(total * 0.25) : total).toFixed(2)}
              </Text>
            </View>

            {/* Terms */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  if (errors.terms) setErrors((p) => ({ ...p, terms: undefined }));
                }}
              >
                {agreedToTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms and Conditions</Text>
                {' '}and certify all guests are at least{' '}
                <Text style={{ fontWeight: '700' }}>18 years of age.</Text>
              </Text>
            </View>
            {errors.terms ? <Text style={styles.fieldError}>{errors.terms}</Text> : null}

            {/* Proceed to Pay */}
            <TouchableOpacity
              style={[styles.payBtn, checkoutMutation.isPending && styles.payBtnDisabled]}
              onPress={handleProceedToPay}
              disabled={checkoutMutation.isPending}
              activeOpacity={0.85}
            >
              {checkoutMutation.isPending ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.payBtnText}>Processing...</Text>
                </>
              ) : (
                <Text style={styles.payBtnText}>
                  Pay ₹{(payPartial ? Math.ceil(total * 0.25) : total).toFixed(2)}
                </Text>
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

  // Loading/Error
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 24, backgroundColor: '#f5f5f5',
  },
  loadingText: { fontSize: 14, color: '#666' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  errorDesc: { fontSize: 14, color: '#888', textAlign: 'center' },
  backBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backBtnText: { color: '#fff', fontWeight: '700' },

  // Header
  header: {
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  headerBack: { paddingTop: 2 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', lineHeight: 22 },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },

  scroll: { padding: 14, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },

  // Hostel summary
  hostelSummaryRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  hostelThumb: { width: 80, height: 80, borderRadius: 10 },
  hostelSummaryInfo: { flex: 1 },
  hostelName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  hostelLocation: { fontSize: 12, color: '#888' },
  datesRow: { gap: 4 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#555' },

  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 },
  subsectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },

  // Rooms
  roomsList: { gap: 8 },
  roomSummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: '#f9f9f9', borderRadius: 10, padding: 10,
  },
  roomSummaryLeft: { flex: 1, marginRight: 8 },
  roomSummaryType: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  roomSummaryMeal: { fontSize: 11, color: '#666', marginBottom: 2 },
  roomSummaryPrice: { fontSize: 11, color: '#999' },
  roomSummaryTotal: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flexShrink: 0 },

  // Bike row
  bikeRow: { backgroundColor: '#f0f7ff' },
  bikeRowLeft: { flexDirection: 'row', gap: 10, flex: 1 },
  bikeThumb: { width: 44, height: 44, borderRadius: 6 },

  // Form
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  formHalf: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#fff',
  },
  inputBoxError: { borderColor: '#ef4444' },
  input: { flex: 1, fontSize: 14, color: '#1a1a1a', padding: 0 },
  fieldError: { fontSize: 11, color: '#ef4444', marginTop: 3 },
  countryCode: { paddingRight: 6 },
  countryCodeText: { fontSize: 14, fontWeight: '600', color: '#555' },
  phoneInputDivider: { width: 1, height: 18, backgroundColor: '#e0e0e0' },
  textArea: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, height: 80,
    fontSize: 14, color: '#1a1a1a', backgroundColor: '#fff',
  },

  // Guidelines
  guidelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  guidelineText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 18 },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#888' },
  summaryValue: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  summaryTotalValue: { fontSize: 22, fontWeight: '800', color: '#f47b20' },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14, marginBottom: 4 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  termsText: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  termsLink: { color: '#f47b20', fontWeight: '600' },

  // Pay button
  payBtn: {
    backgroundColor: '#f47b20', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#f47b20', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  payBtnDisabled: { backgroundColor: '#f9a46a', shadowOpacity: 0 },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Payment options
  payOption: {
    borderWidth: 2, borderColor: '#e5e5e5', borderRadius: 12,
    padding: 14, marginBottom: 12, backgroundColor: '#fff',
  },
  payOptionActive: { borderColor: '#f47b20', backgroundColor: '#fff8f3' },
  payOptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#f47b20' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f47b20' },
  payOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  popularBadge: { backgroundColor: '#22c55e', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  popularText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  payOptionDesc: { fontSize: 12, color: '#666', lineHeight: 17, marginLeft: 28, marginBottom: 8 },
  payAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginLeft: 28 },
  payAmountBig: { fontSize: 20, fontWeight: '800', color: '#f47b20' },
  payAmountSub: { fontSize: 12, color: '#888' },

  // Partial banner (kept for compat, no longer used)
  partialBanner: {
    marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#bbf7d0',
  },
  partialBannerText: { fontSize: 12, color: '#166534', textAlign: 'center', fontWeight: '500' },
});
