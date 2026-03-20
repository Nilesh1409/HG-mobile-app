import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import api from '../../lib/api';
import type { Booking } from '../../types/booking.types';

type Nav = StackNavigationProp<MainStackParamList, 'BookingDetail'>;
type Route = RouteProp<MainStackParamList, 'BookingDetail'>;

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

const statusColor = (s: string) => {
  if (s === 'confirmed' || s === 'active') return '#22c55e';
  if (s === 'pending') return '#f59e0b';
  if (s === 'completed') return '#3b82f6';
  if (s === 'cancelled') return '#ef4444';
  return '#999';
};
const paymentColor = (s: string) => {
  if (s === 'paid') return '#22c55e';
  if (s === 'partial') return '#3b82f6';
  return '#f59e0b';
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[pillSt.pill, { backgroundColor: color + '22' }]}>
      <Text style={[pillSt.text, { color }]}>{label}</Text>
    </View>
  );
}
const pillSt = StyleSheet.create({
  pill: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});

// ─── Collapsible ──────────────────────────────────────────────────────────────
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={colSt.container}>
      <TouchableOpacity style={colSt.header} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={colSt.title}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
      </TouchableOpacity>
      {open && <View style={colSt.body}>{children}</View>}
    </View>
  );
}
const colSt = StyleSheet.create({
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
export default function BookingDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;
  const [copied, setCopied] = useState(false);

  const { data: booking, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Booking }>(`/bookings/${bookingId}`);
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !booking) return <ErrorState onRetry={refetch} />;

  const isBike = booking.bookingType === 'bike';
  const isActive = booking.status === 'active' || booking.status === 'confirmed';
  const isPartial = booking.paymentStatus === 'partial';
  const hasRemaining = isPartial && (booking.remainingAmount ?? 0) > 0;

  const headerBg = booking.status === 'confirmed' && !isPartial ? '#22c55e'
    : isPartial ? '#3b82f6'
    : '#f47b20';

  const copyId = async () => {
    await Clipboard.setStringAsync(booking._id);
    setCopied(true);
    Toast.show({ type: 'success', text1: 'Booking ID copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const id = (booking._id ?? '').slice(-8).toUpperCase();
    try {
      await Share.share({
        message: `My Happy Go Booking!\nID: #${id}\nTotal: ₹${booking.totalAmount}\nhttps://happygorentals.com`,
      });
    } catch {
      await Clipboard.setStringAsync(`Booking #${id}`);
      Toast.show({ type: 'success', text1: 'Copied!' });
    }
  };

  const pd = booking.priceDetails;
  const bulkSavings = pd?.bulkDiscount?.amount ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Booking Details" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Coloured header strip ── */}
        <View style={[styles.strip, { backgroundColor: headerBg }]}>
          <Text style={styles.stripTitle}>
            {isBike ? '🏍️ Bike Booking' : '🏨 Hostel Booking'}
          </Text>
          <View style={styles.statusRow}>
            <StatusPill label={booking.status ?? booking.bookingStatus ?? 'pending'} color="#fff" />
            <StatusPill label={booking.paymentStatus === 'unpaid' ? 'unpaid' : booking.paymentStatus} color="#fff" />
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Partial payment alert ── */}
          {hasRemaining && (
            <View style={styles.partialAlert}>
              <Ionicons name="information-circle" size={18} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.partialTitle}>Remaining Balance Due</Text>
                <View style={styles.partialAmtRow}>
                  <Text style={styles.partialAmt}>₹{(booking.remainingAmount ?? 0).toLocaleString()}</Text>
                  <Text style={styles.partialHint}>due before pickup</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={() => navigation.navigate('PaymentProcessing', { bookingId, paymentType: 'remaining' })}
              >
                <Text style={styles.payNowText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Booking ID ── */}
          <View style={styles.card}>
            <View style={styles.bookingIdRow}>
              <View>
                <Text style={styles.idLabel}>Booking ID</Text>
                <Text style={styles.bookingId}>#{(booking._id ?? '').slice(-8).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={copyId}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#f47b20" />
                <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Bike items ── */}
          {isBike && booking.bikeItems && booking.bikeItems.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bikes</Text>
              {booking.bikeItems.map((item, i) => (
                <View key={i} style={styles.bikeRow}>
                  {item.bike?.images?.[0] ? (
                    <Image source={{ uri: item.bike.images[0] }} style={styles.bikeThumb} resizeMode="contain" />
                  ) : (
                    <View style={[styles.bikeThumb, styles.bikePlaceholder]}>
                      <Ionicons name="bicycle" size={22} color="#ccc" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bikeName}>{item.bike?.name ?? 'Bike'}</Text>
                    <Text style={styles.bikeSub}>
                      {item.bike?.brand} • Qty: {item.quantity} •{' '}
                      {item.kmOption === 'unlimited' ? 'Unlimited km' : 'Limited km'}
                    </Text>
                    <Text style={styles.bikePrice}>₹{item.totalPrice?.toLocaleString()}</Text>
                  </View>
                </View>
              ))}

              {/* Bulk discount banner */}
              {bulkSavings > 0 && (
                <View style={styles.savingsBanner}>
                  <Ionicons name="gift-outline" size={13} color="#15803d" />
                  <Text style={styles.savingsText}>You saved ₹{bulkSavings.toLocaleString()} with bulk booking!</Text>
                </View>
              )}

              {/* Pickup / Dropoff date cards */}
              <View style={styles.dateCardsRow}>
                <View style={styles.pickupCard}>
                  <Text style={styles.dcLabel}>Pickup</Text>
                  <Text style={styles.dcDate}>{fmtDate(booking.startDate)}</Text>
                  <Text style={styles.dcTime}>{fmtTime(booking.startTime)}</Text>
                </View>
                <View style={styles.dropoffCard}>
                  <Text style={styles.dcLabel}>Dropoff</Text>
                  <Text style={styles.dcDate}>{fmtDate(booking.endDate)}</Text>
                  <Text style={styles.dcTime}>{fmtTime(booking.endTime)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Hostel info ── */}
          {!isBike && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Hostel Stay</Text>
              {booking.hostelId?.images?.[0] && (
                <Image source={{ uri: booking.hostelId.images[0] }} style={styles.hostelImage} resizeMode="cover" />
              )}
              <Text style={styles.hostelName}>{booking.hostelId?.name ?? 'Hostel'}</Text>
              <View style={styles.dateCardsRow}>
                <View style={styles.pickupCard}>
                  <Text style={styles.dcLabel}>Check-in</Text>
                  <Text style={styles.dcDate}>{fmtDate(booking.checkIn)}</Text>
                </View>
                <View style={styles.dropoffCard}>
                  <Text style={styles.dcLabel}>Check-out</Text>
                  <Text style={styles.dcDate}>{fmtDate(booking.checkOut)}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Room Type</Text>
                <Text style={styles.detailValue}>{booking.roomType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Meal Option</Text>
                <Text style={styles.detailValue}>
                  {booking.mealOption === 'bedOnly' ? 'Bed Only'
                    : booking.mealOption === 'bedAndBreakfast' ? 'Bed & Breakfast'
                    : 'Bed + Breakfast + Dinner'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Trip details grid (bike only) ── */}
          {isBike && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trip Details</Text>
              <View style={styles.tripGrid}>
                <View style={styles.tripCell}>
                  <Text style={styles.tripLabel}>Total Bikes</Text>
                  <Text style={styles.tripValue}>
                    {booking.bikeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0}
                  </Text>
                </View>
                {(booking.helmetQuantity ?? 0) > 0 && (
                  <View style={styles.tripCell}>
                    <Text style={styles.tripLabel}>Helmets</Text>
                    <Text style={styles.tripValue}>{booking.helmetQuantity}</Text>
                  </View>
                )}
                <View style={styles.tripCell}>
                  <Text style={styles.tripLabel}>Status</Text>
                  <Text style={[styles.tripValue, { color: statusColor(booking.status ?? booking.bookingStatus ?? 'pending') }]}>
                    {booking.status ?? booking.bookingStatus}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Payment summary ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Summary</Text>
            {pd && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Base Amount</Text>
                  <Text style={styles.detailValue}>₹{pd.basePrice?.toLocaleString()}</Text>
                </View>
                {(pd.bulkDiscount?.amount ?? 0) > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bulk Discount ({pd.bulkDiscount?.percentage}%)</Text>
                    <Text style={[styles.detailValue, { color: '#22c55e' }]}>
                      -₹{pd.bulkDiscount.amount.toLocaleString()}
                    </Text>
                  </View>
                )}
                {(pd.helmetCharges ?? 0) > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Helmet Charges</Text>
                    <Text style={styles.detailValue}>₹{pd.helmetCharges.toLocaleString()}</Text>
                  </View>
                )}
                {(pd.taxes ?? 0) > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>GST ({pd.gstPercentage}%)</Text>
                    <Text style={styles.detailValue}>₹{pd.taxes.toLocaleString()}</Text>
                  </View>
                )}
              </>
            )}
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{booking.totalAmount?.toLocaleString()}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Paid</Text>
              <Text style={[styles.detailValue, { color: '#22c55e', fontWeight: '700' }]}>
                ₹{booking.paidAmount?.toLocaleString()}
              </Text>
            </View>
            {hasRemaining && (
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Remaining</Text>
                <Text style={[styles.detailValue, { color: '#f47b20', fontWeight: '700' }]}>
                  ₹{booking.remainingAmount?.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* ── Customer details ── */}
          {booking.guestDetails && (
            <View style={styles.customerCard}>
              <Text style={styles.cardTitle}>Customer Details</Text>
              <View style={styles.custRow}>
                <Ionicons name="person-outline" size={14} color="#3b82f6" />
                <Text style={styles.custText}>{booking.guestDetails.name}</Text>
              </View>
              <View style={styles.custRow}>
                <Ionicons name="mail-outline" size={14} color="#3b82f6" />
                <Text style={styles.custText}>{booking.guestDetails.email}</Text>
              </View>
              <View style={styles.custRow}>
                <Ionicons name="call-outline" size={14} color="#3b82f6" />
                <Text style={styles.custText}>{booking.guestDetails.phone}</Text>
              </View>
            </View>
          )}

          {/* ── Booking timeline ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Timeline</Text>
            <View style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View>
                <Text style={styles.timelineLabel}>Booking Created</Text>
                <Text style={styles.timelineDate}>
                  {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Important instructions ── */}
          <Collapsible title="📋 Important Instructions">
            <Text style={instrSt.head}>Before Pickup</Text>
            {['Carry Driving License + Government ID', 'Complete Aadhaar verification', 'Arrive 15 minutes early'].map((t, i) => (
              <View key={i} style={instrSt.row}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
                <Text style={instrSt.text}>{t}</Text>
              </View>
            ))}
            <Text style={[instrSt.head, { marginTop: 10 }]}>Terms</Text>
            {['Restricted to Chikmagalur area', 'No refund on cancellation', '₹200/hour late return fee', '₹1000 key loss charge'].map((t, i) => (
              <View key={i} style={instrSt.row}>
                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                <Text style={instrSt.text}>{t}</Text>
              </View>
            ))}
            <Text style={instrSt.safeRide}>Have a safe ride! 🏍️</Text>
          </Collapsible>

          {/* ── Verification ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verification</Text>
            <TouchableOpacity
              style={styles.verifyRow}
              onPress={() => !booking.aadhaarVerified && navigation.navigate('AadhaarVerify', { bookingId })}
            >
              <View style={styles.verifyLeft}>
                <Ionicons
                  name={booking.aadhaarVerified ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={18}
                  color={booking.aadhaarVerified ? '#22c55e' : '#f47b20'}
                />
                <Text style={styles.verifyLabel}>Aadhaar</Text>
              </View>
              <Text style={booking.aadhaarVerified ? styles.verified : styles.notVerified}>
                {booking.aadhaarVerified ? '✓ Verified' : 'Tap to Verify →'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyRow, { borderBottomWidth: 0 }]}
              onPress={() => !booking.dlVerified && navigation.navigate('UploadDL', { bookingId })}
            >
              <View style={styles.verifyLeft}>
                <Ionicons
                  name={booking.dlVerified ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={18}
                  color={booking.dlVerified ? '#22c55e' : '#f47b20'}
                />
                <Text style={styles.verifyLabel}>Driving License</Text>
              </View>
              <Text style={booking.dlVerified ? styles.verified : styles.notVerified}>
                {booking.dlVerified ? '✓ Uploaded' : 'Tap to Upload →'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            {hasRemaining && (
              <Button
                title={`Pay Remaining ₹${(booking.remainingAmount ?? 0).toLocaleString()}`}
                onPress={() => navigation.navigate('PaymentProcessing', { bookingId, paymentType: 'remaining' })}
              />
            )}
            {isBike && isActive && (
              <Button
                title="Extend Booking"
                variant="outline"
                onPress={() => navigation.navigate('ExtendBooking', { bookingId })}
              />
            )}
            <View style={styles.bottomRow}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={15} color="#1a1a1a" />
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.receiptBtn} onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon' })}>
                <Ionicons name="download-outline" size={15} color="#1a1a1a" />
                <Text style={styles.shareBtnText}>Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Support ── */}
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <TouchableOpacity style={styles.supportRow} onPress={() => Linking.openURL('tel:+919008022800')}>
              <Ionicons name="call-outline" size={15} color="#f47b20" />
              <Text style={styles.supportText}>+91 90080-22800</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportRow} onPress={() => Linking.openURL('mailto:support@happygobike.com')}>
              <Ionicons name="mail-outline" size={15} color="#f47b20" />
              <Text style={styles.supportText}>support@happygobike.com</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const instrSt = StyleSheet.create({
  head: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 },
  text: { flex: 1, fontSize: 12, color: '#555', lineHeight: 17 },
  safeRide: { fontSize: 13, fontWeight: '700', color: '#f47b20', textAlign: 'center', marginTop: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { paddingBottom: 40 },

  // ── Strip ──
  strip: { padding: 16, gap: 6 },
  stripTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statusRow: { flexDirection: 'row', gap: 8 },

  body: { padding: 12 },

  // ── Partial alert ──
  partialAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  partialTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 4 },
  partialAmtRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  partialAmt: { fontSize: 18, fontWeight: '800', color: '#f47b20' },
  partialHint: { fontSize: 11, color: '#3b82f6' },
  payNowBtn: {
    backgroundColor: '#3b82f6', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  payNowText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  // ── Booking ID ──
  bookingIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idLabel: { fontSize: 11, color: '#999', marginBottom: 3 },
  bookingId: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  copyText: { color: '#f47b20', fontSize: 13, fontWeight: '700' },

  // ── Bike row ──
  bikeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', marginBottom: 12,
  },
  bikeThumb: { width: 56, height: 56, borderRadius: 8 },
  bikePlaceholder: { backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
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
  dateCardsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pickupCard: {
    flex: 1, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  dropoffCard: {
    flex: 1, backgroundColor: '#fff1f2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fecdd3',
  },
  dcLabel: { fontSize: 10, fontWeight: '700', color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dcDate: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },
  dcTime: { fontSize: 11, color: '#555', marginTop: 2 },

  // ── Hostel ──
  hostelImage: { width: '100%', height: 130, borderRadius: 8, marginBottom: 10 },
  hostelName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },

  // ── Trip grid ──
  tripGrid: { flexDirection: 'row', gap: 8 },
  tripCell: {
    flex: 1, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center',
  },
  tripLabel: { fontSize: 10, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  tripValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', textTransform: 'capitalize' },

  // ── Detail rows ──
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  detailLabel: { fontSize: 13, color: '#666' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#1a1a1a', textTransform: 'capitalize' },
  totalRow: { borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingTop: 10, marginTop: 2 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#f47b20' },

  // ── Customer card ──
  customerCard: {
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  custText: { fontSize: 13, color: '#1e40af', fontWeight: '500' },

  // ── Timeline ──
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f47b20', marginTop: 3 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  timelineDate: { fontSize: 12, color: '#666', marginTop: 2 },

  // ── Verification ──
  verifyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  verifyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifyLabel: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  verified: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  notVerified: { fontSize: 13, color: '#f47b20', fontWeight: '600' },

  // ── Actions ──
  actions: { gap: 10, marginBottom: 14 },
  bottomRow: { flexDirection: 'row', gap: 10 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingVertical: 10,
    backgroundColor: '#fff',
  },
  receiptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingVertical: 10,
    backgroundColor: '#fff',
  },
  shareBtnText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },

  // ── Support ──
  supportCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', gap: 10,
  },
  supportTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  supportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  supportText: { fontSize: 14, color: '#f47b20', fontWeight: '600' },
});
