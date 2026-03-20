import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Image,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import api from '../../lib/api';
import type { Booking } from '../../types/booking.types';

type Nav = StackNavigationProp<MainStackParamList, 'BookingSuccess'>;
type Route = RouteProp<MainStackParamList, 'BookingSuccess'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};

// ─── Collapsible section ──────────────────────────────────────────────────────
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={colStyles.container}>
      <TouchableOpacity style={colStyles.header} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={colStyles.title}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
      </TouchableOpacity>
      {open && <View style={colStyles.body}>{children}</View>}
    </View>
  );
}

const colStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 12,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  body: { padding: 14, paddingTop: 0 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { paymentGroupId } = route.params;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
    }).start();
  }, []);

  const { data: groupData } = useQuery({
    queryKey: ['bookingGroup', paymentGroupId],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: any }>(`/bookings/group/${paymentGroupId}`);
        return res.data.data;
      } catch {
        const res = await api.get<{ success: boolean; data: Booking }>(`/bookings/${paymentGroupId}`);
        return { bookings: [res.data.data], groupTotalAmount: res.data.data.totalAmount };
      }
    },
    enabled: !!paymentGroupId,
    retry: 1,
  });

  const bookings: Booking[] = groupData?.bookings ?? [];
  const firstBooking = bookings[0];
  const isBike = firstBooking?.bookingType === 'bike';
  const isPartial = firstBooking?.paymentStatus === 'partial';
  const isConfirmed = firstBooking?.status === 'confirmed';
  const totalPaid = groupData?.groupPaidAmount ?? groupData?.groupTotalAmount ?? firstBooking?.paidAmount ?? 0;
  const totalAmount = groupData?.groupTotalAmount ?? firstBooking?.totalAmount ?? 0;
  const remaining = firstBooking?.remainingAmount ?? 0;
  const displayId = paymentGroupId?.slice(-8).toUpperCase() ?? '';

  // Dynamic header colour
  const headerColor = isConfirmed && !isPartial ? '#22c55e'
    : isPartial ? '#3b82f6'
    : '#f47b20';

  const copyBookingId = async () => {
    await Clipboard.setStringAsync(paymentGroupId ?? '');
    setCopied(true);
    Toast.show({ type: 'success', text1: 'Booking ID copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Happy Go booking is confirmed!\nBooking ID: #${displayId}\nTotal: ₹${totalAmount}\nFor more info: https://happygorentals.com`,
        title: 'Happy Go Booking',
      });
    } catch {
      await Clipboard.setStringAsync(`Booking ID: #${displayId}`);
      Toast.show({ type: 'success', text1: 'Booking ID copied!' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Dynamic header ── */}
        <View style={[styles.hero, { backgroundColor: headerColor }]}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="checkmark" size={52} color="#fff" />
          </Animated.View>
          <Text style={styles.heroTitle}>
            {isPartial ? '✅ Booking Reserved!' : isConfirmed ? '🎉 Booking Confirmed!' : '📝 Booking Created!'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isPartial
              ? 'Booking reserved. Pay remaining at pickup/check-in.'
              : 'Your booking has been confirmed. Enjoy your trip!'}
          </Text>
        </View>

        <View style={styles.body}>
          {/* ── Partial payment alert ── */}
          {isPartial && remaining > 0 && (
            <View style={styles.partialAlert}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.partialAlertTitle}>Payment Due</Text>
                <View style={styles.partialRow}>
                  <Text style={styles.partialLabel}>Total:</Text>
                  <Text style={styles.partialVal}>₹{totalAmount?.toLocaleString()}</Text>
                </View>
                <View style={styles.partialRow}>
                  <Text style={styles.partialLabel}>Paid (25%):</Text>
                  <Text style={[styles.partialVal, { color: '#22c55e' }]}>₹{totalPaid?.toLocaleString()}</Text>
                </View>
                <View style={styles.partialRow}>
                  <Text style={styles.partialLabel}>Remaining (75%):</Text>
                  <Text style={[styles.partialVal, { color: '#f47b20' }]}>₹{remaining?.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.payRemainingBtn}
                  onPress={() => firstBooking && navigation.navigate('PaymentProcessing', {
                    bookingId: firstBooking._id,
                    paymentType: 'remaining',
                  })}
                >
                  <Text style={styles.payRemainingText}>Pay Remaining ₹{remaining?.toLocaleString()}</Text>
                </TouchableOpacity>
                <Text style={styles.payRemainingHint}>Pay remaining amount anytime before your booking date</Text>
              </View>
            </View>
          )}

          {/* ── Booking ID card ── */}
          <View style={styles.card}>
            <View style={styles.bookingIdRow}>
              <View>
                <Text style={styles.bookingIdLabel}>Booking ID</Text>
                <Text style={styles.bookingId}>#{displayId}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={copyBookingId}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#f47b20" />
                <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Bike items ── */}
          {isBike && firstBooking?.bikeItems && firstBooking.bikeItems.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏍️ Bikes</Text>
              {firstBooking.bikeItems.map((item, i) => (
                <View key={i} style={styles.bikeItemRow}>
                  {item.bike?.images?.[0] ? (
                    <Image source={{ uri: item.bike.images[0] }} style={styles.bikeThumb} resizeMode="contain" />
                  ) : (
                    <View style={[styles.bikeThumb, { backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="bicycle" size={22} color="#ccc" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bikeName}>{item.bike?.name ?? 'Bike'}</Text>
                    <Text style={styles.bikeSub}>
                      {item.bike?.brand} • Qty: {item.quantity} •{' '}
                      {item.kmOption === 'unlimited' ? 'Unlimited km' : `Limited km`}
                    </Text>
                    <Text style={styles.bikePrice}>₹{item.totalPrice?.toLocaleString()}</Text>
                  </View>
                </View>
              ))}

              {/* Bulk discount banner */}
              {(firstBooking.priceDetails?.bulkDiscount?.amount ?? 0) > 0 && (
                <View style={styles.savingsBanner}>
                  <Ionicons name="gift-outline" size={14} color="#15803d" />
                  <Text style={styles.savingsText}>
                    You saved ₹{firstBooking.priceDetails!.bulkDiscount.amount.toLocaleString()} by booking multiple bikes!
                  </Text>
                </View>
              )}

              {/* Pickup/Dropoff date cards */}
              <View style={styles.dateCardsRow}>
                <View style={styles.pickupCard}>
                  <Text style={styles.dateCardLabel}>Pickup</Text>
                  <Text style={styles.dateCardValue}>{fmtDate(firstBooking.startDate)}</Text>
                  <Text style={styles.dateCardTime}>{fmtTime(firstBooking.startTime)}</Text>
                </View>
                <View style={styles.dropoffCard}>
                  <Text style={styles.dateCardLabel}>Dropoff</Text>
                  <Text style={styles.dateCardValue}>{fmtDate(firstBooking.endDate)}</Text>
                  <Text style={styles.dateCardTime}>{fmtTime(firstBooking.endTime)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Trip details grid ── */}
          {isBike && firstBooking && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trip Details</Text>
              <View style={styles.tripGrid}>
                <View style={styles.tripCell}>
                  <Text style={styles.tripCellLabel}>Total Bikes</Text>
                  <Text style={styles.tripCellValue}>
                    {firstBooking.bikeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0}
                  </Text>
                </View>
                {firstBooking.helmetQuantity != null && firstBooking.helmetQuantity > 0 && (
                  <View style={styles.tripCell}>
                    <Text style={styles.tripCellLabel}>Helmets</Text>
                    <Text style={styles.tripCellValue}>{firstBooking.helmetQuantity}</Text>
                  </View>
                )}
                <View style={styles.tripCell}>
                  <Text style={styles.tripCellLabel}>Status</Text>
                  <Text style={[styles.tripCellValue, { color: '#22c55e' }]}>{firstBooking.status}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Payment summary ── */}
          {firstBooking && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Summary</Text>
              {bookings.map((b, i) => (
                <View key={i} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {b.bookingType === 'bike' ? '🏍️ Bike Rental' : '🏨 Hostel'}
                  </Text>
                  <Text style={styles.summaryValue}>₹{b.totalAmount?.toLocaleString()}</Text>
                </View>
              ))}
              {(firstBooking.priceDetails?.bulkDiscount?.amount ?? 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bulk Discount</Text>
                  <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                    -₹{firstBooking.priceDetails!.bulkDiscount.amount.toLocaleString()}
                  </Text>
                </View>
              )}
              {(firstBooking.priceDetails?.helmetCharges ?? 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Helmet Charges</Text>
                  <Text style={styles.summaryValue}>₹{firstBooking.priceDetails!.helmetCharges.toLocaleString()}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.paidRow]}>
                <Text style={styles.paidLabel}>Total Paid</Text>
                <Text style={styles.paidAmount}>₹{totalPaid?.toLocaleString()}</Text>
              </View>
              {isPartial && remaining > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Remaining (due at pickup)</Text>
                  <Text style={[styles.summaryValue, { color: '#f47b20', fontWeight: '700' }]}>
                    ₹{remaining?.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Customer details ── */}
          {firstBooking?.guestDetails && (
            <View style={styles.customerCard}>
              <Text style={styles.cardTitle}>Customer Details</Text>
              <View style={styles.custRow}>
                <Ionicons name="person-outline" size={15} color="#3b82f6" />
                <Text style={styles.custText}>{firstBooking.guestDetails.name}</Text>
              </View>
              <View style={styles.custRow}>
                <Ionicons name="mail-outline" size={15} color="#3b82f6" />
                <Text style={styles.custText}>{firstBooking.guestDetails.email}</Text>
              </View>
              <View style={styles.custRow}>
                <Ionicons name="call-outline" size={15} color="#3b82f6" />
                <Text style={styles.custText}>{firstBooking.guestDetails.phone}</Text>
              </View>
            </View>
          )}

          {/* ── Booking timeline ── */}
          {firstBooking?.createdAt && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Booking Timeline</Text>
              <View style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View>
                  <Text style={styles.timelineLabel}>Booking Created</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(firstBooking.createdAt).toLocaleDateString('en-IN', {
                      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Important instructions ── */}
          <Collapsible title="📋 Important Instructions">
            <Text style={instrStyles.sectionHead}>Before Pickup</Text>
            {[
              'Carry your Driving License and a valid Government ID',
              'Complete Aadhaar verification in the app',
              'Arrive at pickup location 15 minutes early',
            ].map((t, i) => (
              <View key={i} style={instrStyles.row}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#22c55e" />
                <Text style={instrStyles.text}>{t}</Text>
              </View>
            ))}
            <Text style={[instrStyles.sectionHead, { marginTop: 12 }]}>During Trip</Text>
            {[
              'Fuel is not included in the rental price',
              'Extra charges apply for KM beyond your plan',
              'Return on time to avoid late charges',
              'Inform us 10 minutes before returning',
            ].map((t, i) => (
              <View key={i} style={instrStyles.row}>
                <Ionicons name="information-circle-outline" size={15} color="#f47b20" />
                <Text style={instrStyles.text}>{t}</Text>
              </View>
            ))}
            <Text style={[instrStyles.sectionHead, { marginTop: 12 }]}>Terms</Text>
            {[
              'Rental restricted to Chikmagalur area',
              'No refund for cancellations',
              '₹200/hour late return fee',
              '₹1000 charge for key loss',
              'Damage charged at showroom rates',
            ].map((t, i) => (
              <View key={i} style={instrStyles.row}>
                <Ionicons name="alert-circle-outline" size={15} color="#ef4444" />
                <Text style={instrStyles.text}>{t}</Text>
              </View>
            ))}
            <Text style={instrStyles.safeRide}>Have a safe ride! 🏍️</Text>
          </Collapsible>

          {/* ── Verification prompt ── */}
          {firstBooking && (!firstBooking.aadhaarVerified || !firstBooking.dlVerified) && (
            <View style={styles.verifyBanner}>
              <Ionicons name="warning-outline" size={18} color="#f47b20" />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>Complete Verification</Text>
                <Text style={styles.verifySub}>Verify Aadhaar & DL to avoid issues at pickup</Text>
              </View>
              <TouchableOpacity
                style={styles.verifyNowBtn}
                onPress={() => navigation.navigate('AadhaarVerify', { bookingId: firstBooking._id })}
              >
                <Text style={styles.verifyNowText}>Verify Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Action buttons ── */}
          <View style={styles.actions}>
            {isPartial && remaining > 0 && firstBooking && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('PaymentProcessing', {
                  bookingId: firstBooking._id,
                  paymentType: 'remaining',
                })}
              >
                <Ionicons name="card-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Complete Remaining Payment</Text>
              </TouchableOpacity>
            )}
            {firstBooking && (
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: firstBooking._id })}
              >
                <Text style={styles.outlineBtnText}>View All Booking Details</Text>
              </TouchableOpacity>
            )}
            <View style={styles.secondaryRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={16} color="#1a1a1a" />
                <Text style={styles.secondaryBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Download receipt feature coming soon!' })}
              >
                <Ionicons name="download-outline" size={16} color="#1a1a1a" />
                <Text style={styles.secondaryBtnText}>Receipt</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
            >
              <Text style={styles.homeBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>

          {/* ── Support ── */}
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <TouchableOpacity style={styles.supportRow} onPress={() => Linking.openURL('tel:+919008022800')}>
              <Ionicons name="call-outline" size={16} color="#f47b20" />
              <Text style={styles.supportText}>+91 90080-22800</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportRow} onPress={() => Linking.openURL('mailto:support@happygobike.com')}>
              <Ionicons name="mail-outline" size={16} color="#f47b20" />
              <Text style={styles.supportText}>support@happygobike.com</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const instrStyles = StyleSheet.create({
  sectionHead: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  text: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
  safeRide: { fontSize: 14, fontWeight: '700', color: '#f47b20', textAlign: 'center', marginTop: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { paddingBottom: 40 },

  // ── Hero ──
  hero: {
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, gap: 12,
  },
  iconContainer: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 18 },

  body: { padding: 14 },

  // ── Partial alert ──
  partialAlert: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  partialAlertTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  partialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  partialLabel: { fontSize: 13, color: '#3b82f6' },
  partialVal: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  payRemainingBtn: {
    backgroundColor: '#3b82f6', borderRadius: 8,
    paddingVertical: 9, alignItems: 'center', marginTop: 10,
  },
  payRemainingText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  payRemainingHint: { fontSize: 11, color: '#93c5fd', textAlign: 'center', marginTop: 5 },

  // ── Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  // ── Booking ID ──
  bookingIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingIdLabel: { fontSize: 11, color: '#999', marginBottom: 3 },
  bookingId: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  copyText: { color: '#f47b20', fontSize: 13, fontWeight: '700' },

  // ── Bike items ──
  bikeItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', marginBottom: 12,
  },
  bikeThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f5f5f5' },
  bikeName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  bikeSub: { fontSize: 11, color: '#666', marginBottom: 4 },
  bikePrice: { fontSize: 14, fontWeight: '700', color: '#f47b20' },

  savingsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12,
  },
  savingsText: { fontSize: 12, color: '#15803d', fontWeight: '600' },

  // ── Date cards ──
  dateCardsRow: { flexDirection: 'row', gap: 10 },
  pickupCard: {
    flex: 1, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  dropoffCard: {
    flex: 1, backgroundColor: '#fff1f2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fecdd3',
  },
  dateCardLabel: { fontSize: 10, fontWeight: '700', color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateCardValue: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },
  dateCardTime: { fontSize: 12, color: '#555', marginTop: 2 },

  // ── Trip grid ──
  tripGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tripCell: {
    flex: 1, minWidth: '30%', backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center',
  },
  tripCellLabel: { fontSize: 10, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  tripCellValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', textTransform: 'capitalize' },

  // ── Payment summary ──
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  summaryLabel: { fontSize: 13, color: '#666' },
  summaryValue: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  paidRow: { borderBottomWidth: 0, paddingTop: 10 },
  paidLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  paidAmount: { fontSize: 18, fontWeight: '800', color: '#22c55e' },

  // ── Customer card ──
  customerCard: {
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  custText: { fontSize: 13, color: '#1e40af', fontWeight: '500' },

  // ── Timeline ──
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#f47b20', marginTop: 4,
  },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  timelineDate: { fontSize: 12, color: '#666', marginTop: 2 },

  // ── Verify banner ──
  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff5ed', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#ffd4a8',
  },
  verifyTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  verifySub: { fontSize: 11, color: '#666', marginTop: 2 },
  verifyNowBtn: { backgroundColor: '#f47b20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  verifyNowText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── Actions ──
  actions: { gap: 10, marginBottom: 14 },
  primaryBtn: {
    backgroundColor: '#f47b20', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    borderWidth: 2, borderColor: '#f47b20', borderRadius: 12, paddingVertical: 13,
    alignItems: 'center',
  },
  outlineBtnText: { color: '#f47b20', fontWeight: '700', fontSize: 14 },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingVertical: 11,
    backgroundColor: '#fff',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  homeBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Support ──
  supportCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', gap: 10,
  },
  supportTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  supportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  supportText: { fontSize: 14, color: '#f47b20', fontWeight: '600' },
});
