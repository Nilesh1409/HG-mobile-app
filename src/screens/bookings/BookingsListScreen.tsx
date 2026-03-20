import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Linking,
  Modal,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import api from '../../lib/api';
import queryClient from '../../lib/queryClient';
import type { AnyBooking, Booking, BookingStatus, CombinedBooking } from '../../types/booking.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'BookingsTab'>,
  StackNavigationProp<MainStackParamList>
>;

// ─── Status tabs ──────────────────────────────────────────────────────────────
const TABS: { label: string; statuses: BookingStatus[] | null }[] = [
  { label: 'All', statuses: null },
  { label: 'Confirmed', statuses: ['confirmed', 'active'] },
  { label: 'Pending', statuses: ['pending'] },
  { label: 'Completed', statuses: ['completed'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};
const formatISODate = (d: Date) => d.toISOString().split('T')[0];
const formatISOTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Returns the effective booking status regardless of which field the API used. */
const getStatus = (b: AnyBooking): BookingStatus => {
  if ((b as any).isCombined === true) return (b as CombinedBooking).bookingStatus ?? 'pending';
  return (b as Booking).bookingStatus ?? (b as Booking).status ?? 'pending';
};

/** Returns the effective total amount for any booking item. */
const getTotal = (b: AnyBooking): number => {
  if ((b as any).isCombined === true) return (b as CombinedBooking).combinedDetails?.totalAmount ?? 0;
  const bk = b as Booking;
  return bk.paymentDetails?.totalAmount ?? bk.totalAmount ?? 0;
};

/** Returns a safe key for use in FlatList / .map(). */
const getKey = (b: AnyBooking): string => {
  if ((b as any).isCombined === true) return (b as CombinedBooking).paymentGroupId;
  return (b as Booking)._id ?? (b as any).paymentGroupId ?? Math.random().toString();
};

// ─── Status / payment colour helpers ─────────────────────────────────────────
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

// ─── Status icon helper ───────────────────────────────────────────────────────
const statusIcon = (s: string): keyof typeof Ionicons.glyphMap => {
  if (s === 'confirmed' || s === 'active') return 'checkmark-circle';
  if (s === 'pending') return 'time';
  if (s === 'completed') return 'checkmark-done-circle';
  if (s === 'cancelled') return 'close-circle';
  return 'ellipse-outline';
};

const paymentIcon = (s: string): keyof typeof Ionicons.glyphMap => {
  if (s === 'paid') return 'checkmark-circle';
  if (s === 'partial') return 'card';
  return 'hourglass-outline'; // pending payment
};

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: color + '20' }]}>
      <Ionicons name={statusIcon(label)} size={11} color={color} />
      <Text style={[pillStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

/** Separate pill for payment status — uses a card/payment icon + "Payment:" prefix */
function PaymentPill({ status, color }: { status: string; color: string }) {
  const label = status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid';
  return (
    <View style={[pillStyles.pill, pillStyles.paymentPill, { borderColor: color + '55' }]}>
      <Ionicons name={paymentIcon(status)} size={11} color={color} />
      <Text style={[pillStyles.text, { color }]}>₹ {label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start',
  },
  paymentPill: {
    borderWidth: 1, backgroundColor: 'transparent',
  },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});

// ─── Extend Booking Modal ─────────────────────────────────────────────────────
function ExtendModal({ booking, visible, onClose }: { booking: Booking; visible: boolean; onClose: () => void }) {
  const navigation = useNavigation<Nav>();
  const [newEndDate, setNewEndDate] = useState(new Date());
  const [newEndTime, setNewEndTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const extendMutation = useMutation({
    mutationFn: () =>
      api.put(`/bookings/${booking._id}/extend/user`, {
        newEndDate: formatISODate(newEndDate),
        newEndTime: formatISOTime(newEndTime),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Toast.show({ type: 'success', text1: 'Booking extended!' });
      onClose();
      const updatedBooking = res.data.data;
      if (updatedBooking?.paymentDetails?.remainingAmount > 0) {
        navigation.navigate('PaymentProcessing', { bookingId: booking._id, paymentType: 'remaining' });
      }
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: 'Extension failed', text2: err?.response?.data?.message ?? 'Please try again' });
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={extStyles.overlay}>
        <View style={extStyles.sheet}>
          <View style={extStyles.handle} />
          <Text style={extStyles.title}>Extend Booking</Text>
          <Text style={extStyles.desc}>
            Select a new end date and time. Extension charges will be calculated automatically.
          </Text>
          <Text style={extStyles.label}>New End Date</Text>
          <TouchableOpacity style={extStyles.field} onPress={() => setShowDate(true)}>
            <Ionicons name="calendar-outline" size={16} color="#f47b20" />
            <Text style={extStyles.fieldText}>{formatISODate(newEndDate)}</Text>
          </TouchableOpacity>
          <Text style={extStyles.label}>New End Time</Text>
          <TouchableOpacity style={extStyles.field} onPress={() => setShowTime(true)}>
            <Ionicons name="time-outline" size={16} color="#f47b20" />
            <Text style={extStyles.fieldText}>{formatISOTime(newEndTime)}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker value={newEndDate} mode="date" minimumDate={new Date()}
              onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) setNewEndDate(d); }} />
          )}
          {showTime && (
            <DateTimePicker value={newEndTime} mode="time" is24Hour minuteInterval={30}
              onChange={(_, d) => { setShowTime(Platform.OS === 'ios'); if (d) setNewEndTime(d); }} />
          )}
          <View style={extStyles.infoBox}>
            <Ionicons name="information-circle-outline" size={15} color="#f47b20" />
            <Text style={extStyles.infoText}>Extension charges will be processed via Razorpay</Text>
          </View>
          <Button title="Confirm Extension" onPress={() => extendMutation.mutate()} loading={extendMutation.isPending} />
          <Button title="Cancel" variant="outline" onPress={onClose} style={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}
const extStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  desc: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f9f9f9', borderRadius: 10, padding: 13, marginBottom: 16, borderWidth: 1, borderColor: '#e5e5e5' },
  fieldText: { fontSize: 15, color: '#1a1a1a' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff5ed', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ffd4a8', marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#666', lineHeight: 18 },
});

// ─── Combined Booking Card ────────────────────────────────────────────────────
function CombinedBookingCard({ item, onNavigate }: { item: CombinedBooking; onNavigate: (id: string) => void }) {
  const bookingStatus = item.bookingStatus ?? 'pending';
  const paymentStatus = item.paymentStatus ?? 'pending';
  const shortId = item.paymentGroupId?.slice(-8)?.toUpperCase() ?? '';

  return (
    <View style={cardStyles.card}>
      {/* Combined badge + status pills */}
      <View style={cardStyles.combinedHeader}>
        <View style={[pillStyles.pill, { backgroundColor: '#ede9fe' }]}>
          <Text style={[pillStyles.text, { color: '#7c3aed' }]}>Combined Booking</Text>
        </View>
        <StatusPill label={bookingStatus} color={statusColor(bookingStatus)} />
        <StatusPill label={paymentStatus} color={paymentColor(paymentStatus)} />
      </View>

      {/* Payment group ID */}
      <Text style={cardStyles.pgId}>Payment Group ID: {shortId}</Text>

      {/* Sub-bookings side by side */}
      <View style={cardStyles.subRow}>
        {item.bookings.map((sub) => {
          const isSubBike = sub.bookingType === 'bike';
          const subImage = isSubBike
            ? sub.bikeItems?.[0]?.bike?.images?.[0]
            : (sub.hostel?.images?.[0] ?? sub.hostelId?.images?.[0]);
          const subTitle = isSubBike
            ? sub.bikeItems?.map(b => b.bike?.title ?? b.bike?.name ?? '').join(', ') || 'Bike'
            : (sub.hostel?.name ?? sub.hostelId?.name ?? 'Hostel');
          const subDesc = isSubBike
            ? (sub.bikeItems?.[0]?.kmOption === 'unlimited' ? 'Unlimited km' : 'Limited km')
            : sub.roomType;
          const subAmount = sub.paymentDetails?.totalAmount ?? sub.totalAmount;

          return (
            <TouchableOpacity
              key={sub._id}
              style={cardStyles.subCard}
              onPress={() => sub._id && onNavigate(sub._id)}
              activeOpacity={0.8}
            >
              <View style={cardStyles.subImageBox}>
                {subImage ? (
                  <Image source={{ uri: subImage }} style={cardStyles.subImage} resizeMode="cover" />
                ) : (
                  <Ionicons name={isSubBike ? 'bicycle' : 'bed'} size={22} color="#f47b20" />
                )}
              </View>
              <View style={cardStyles.subInfo}>
                <View style={cardStyles.subTypeRow}>
                  <Ionicons name={isSubBike ? 'bicycle' : 'bed'} size={11} color="#888" />
                  <Text style={cardStyles.subType}>{isSubBike ? 'Bike' : 'Hostel'}</Text>
                </View>
                <Text style={cardStyles.subTitle} numberOfLines={2}>{subTitle}</Text>
                {!!subDesc && <Text style={cardStyles.subDesc} numberOfLines={1}>{subDesc}</Text>}
                {subAmount != null && (
                  <Text style={cardStyles.subAmount}>₹{subAmount.toLocaleString()}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dates row */}
      <View style={cardStyles.datesRow}>
        <View style={cardStyles.dateItem}>
          <Text style={cardStyles.dateLabel}>Start Date</Text>
          <Text style={cardStyles.dateValue}>{formatDate(item.startDate)}</Text>
        </View>
        <View style={cardStyles.dateItem}>
          <Text style={cardStyles.dateLabel}>End Date</Text>
          <Text style={cardStyles.dateValue}>{formatDate(item.endDate)}</Text>
        </View>
        <View style={cardStyles.dateItem}>
          <Text style={cardStyles.dateLabel}>Total Amount</Text>
          <Text style={[cardStyles.dateValue, { color: '#f47b20' }]}>
            ₹{item.combinedDetails?.totalAmount?.toLocaleString() ?? '—'}
          </Text>
        </View>
      </View>

      {/* Support button */}
      <View style={cardStyles.actions}>
        <TouchableOpacity style={cardStyles.supportBtn} onPress={() => Linking.openURL('tel:+919008022800')}>
          <Ionicons name="call-outline" size={13} color="#666" />
          <Text style={cardStyles.supportBtnText}>Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Individual Booking Card ──────────────────────────────────────────────────
function IndividualBookingCard({
  booking,
  onPress,
  onCompletePayment,
  onExtend,
}: {
  booking: Booking;
  onPress: () => void;
  onCompletePayment: () => void;
  onExtend: () => void;
}) {
  const bookingStatus = booking.bookingStatus ?? booking.status ?? 'pending';
  const paymentStatus = booking.paymentStatus ?? 'pending';
  const isBike = booking.bookingType === 'bike';
  const isActive = bookingStatus === 'active' || bookingStatus === 'confirmed';
  const isPartial = paymentStatus === 'partial';
  const canViewDetails = paymentStatus !== 'unpaid';

  const hostelObj = booking.hostel ?? booking.hostelId;
  const title = isBike
    ? booking.bikeItems?.map(b => b.bike?.title ?? b.bike?.name ?? '').join(', ') || 'Bike Booking'
    : hostelObj?.name ?? 'Hostel Booking';

  const image = isBike
    ? booking.bikeItems?.[0]?.bike?.images?.[0]
    : hostelObj?.images?.[0];

  const dateRange = isBike
    ? `${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}`
    : `${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)}`;

  const timeRange = isBike && booking.startTime
    ? `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`
    : '';

  const totalAmt = booking.paymentDetails?.totalAmount ?? booking.totalAmount;
  const shortId = booking._id ? booking._id.slice(-8).toUpperCase() : '—';

  return (
    <View style={cardStyles.card}>
      {booking.paymentGroupId && (
        <View style={cardStyles.combinedBadge}>
          <Ionicons name="link-outline" size={10} color="#7c3aed" />
          <Text style={cardStyles.combinedText}>Part of Combined Booking</Text>
        </View>
      )}

      {/* Type + status header strip */}
      <View style={cardStyles.typeStrip}>
        <View style={[cardStyles.typeTag, isBike ? cardStyles.typeTagBike : cardStyles.typeTagHostel]}>
          <Ionicons name={isBike ? 'bicycle' : 'bed'} size={11} color={isBike ? '#b45309' : '#1d4ed8'} />
          <Text style={[cardStyles.typeTagText, isBike ? cardStyles.typeTagTextBike : cardStyles.typeTagTextHostel]}>
            {isBike ? 'Bike Rental' : 'Hostel Stay'}
          </Text>
        </View>
        <View style={cardStyles.statusGroup}>
          <StatusPill label={bookingStatus} color={statusColor(bookingStatus)} />
          <PaymentPill status={paymentStatus} color={paymentColor(paymentStatus)} />
        </View>
      </View>

      <TouchableOpacity style={cardStyles.mainRow} onPress={canViewDetails ? onPress : undefined} activeOpacity={0.75}>
        <View style={cardStyles.iconBox}>
          {image ? (
            <Image source={{ uri: image }} style={cardStyles.bikeImage} resizeMode="cover" />
          ) : (
            <Ionicons name={isBike ? 'bicycle' : 'bed'} size={22} color="#f47b20" />
          )}
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.title} numberOfLines={1}>{title}</Text>
          <Text style={cardStyles.idText}>ID: {shortId}</Text>
          <View style={cardStyles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="#999" />
            <Text style={cardStyles.dateText}>{dateRange}</Text>
          </View>
          {!!timeRange && (
            <View style={cardStyles.dateRow}>
              <Ionicons name="time-outline" size={12} color="#999" />
              <Text style={cardStyles.dateText}>{timeRange}</Text>
            </View>
          )}
          {totalAmt != null && (
            <Text style={cardStyles.amount}>₹{totalAmt.toLocaleString()}</Text>
          )}
          {bookingStatus === 'pending' && (
            <View style={cardStyles.pendingHint}>
              <Ionicons name="information-circle-outline" size={12} color="#92400e" />
              <Text style={cardStyles.pendingHintText}>
                {paymentStatus === 'pending' ? 'Awaiting payment confirmation' : 'Booking under review'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={cardStyles.actions}>
        {isPartial && (
          <TouchableOpacity style={cardStyles.payBtn} onPress={onCompletePayment}>
            <Ionicons name="card-outline" size={13} color="#fff" />
            <Text style={cardStyles.payBtnText}>Complete Payment</Text>
          </TouchableOpacity>
        )}
        {canViewDetails && (
          <TouchableOpacity style={cardStyles.viewBtn} onPress={onPress}>
            <Text style={cardStyles.viewBtnText}>View Details</Text>
            <Ionicons name="chevron-forward" size={13} color="#f47b20" />
          </TouchableOpacity>
        )}
        {isBike && isActive && (
          <TouchableOpacity style={cardStyles.extendBtn} onPress={onExtend}>
            <Ionicons name="time-outline" size={13} color="#3b82f6" />
            <Text style={cardStyles.extendBtnText}>Extend</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={cardStyles.supportBtn} onPress={() => Linking.openURL('tel:+919008022800')}>
          <Ionicons name="call-outline" size={13} color="#666" />
          <Text style={cardStyles.supportBtnText}>Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2, overflow: 'hidden',
  },
  combinedHeader: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
    backgroundColor: '#faf8ff', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#ede9fe',
  },
  combinedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: '#ede9fe',
  },
  combinedText: { fontSize: 10, color: '#7c3aed', fontWeight: '700' },
  pgId: { fontSize: 11, color: '#888', paddingHorizontal: 12, paddingTop: 8 },

  subRow: { flexDirection: 'row', gap: 10, padding: 12 },
  subCard: {
    flex: 1, backgroundColor: '#f9f9f9', borderRadius: 8,
    borderWidth: 1, borderColor: '#f0f0f0', padding: 10, gap: 6,
  },
  subImageBox: {
    width: 44, height: 44, borderRadius: 6, backgroundColor: '#fff5ed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  subImage: { width: 44, height: 44 },
  subInfo: { gap: 2 },
  subTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  subType: { fontSize: 10, color: '#888', fontWeight: '600' },
  subTitle: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },
  subDesc: { fontSize: 11, color: '#888' },
  subAmount: { fontSize: 13, fontWeight: '700', color: '#f47b20', marginTop: 2 },

  datesRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 10, gap: 8,
  },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 10, color: '#999', marginBottom: 2 },
  dateValue: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },

  mainRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, paddingTop: 10, gap: 12 },
  iconBox: {
    width: 56, height: 56, borderRadius: 10,
    backgroundColor: '#fff5ed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  bikeImage: { width: 56, height: 56 },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  idText: { fontSize: 11, color: '#999' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#666' },
  amount: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
  badges: { gap: 4, alignItems: 'flex-end' },

  // Type strip
  typeStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  typeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  typeTagBike: { backgroundColor: '#fffbeb' },
  typeTagHostel: { backgroundColor: '#eff6ff' },
  typeTagText: { fontSize: 11, fontWeight: '700' },
  typeTagTextBike: { color: '#b45309' },
  typeTagTextHostel: { color: '#1d4ed8' },
  statusGroup: { flexDirection: 'row', gap: 5, alignItems: 'center' },

  // Pending hint
  pendingHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3,
    backgroundColor: '#fefce8', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pendingHintText: { fontSize: 10, color: '#92400e', fontWeight: '500' },

  actions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f47b20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  payBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#f47b20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  viewBtnText: { color: '#f47b20', fontSize: 11, fontWeight: '700' },
  extendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#3b82f6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  extendBtnText: { color: '#3b82f6', fontSize: 11, fontWeight: '700' },
  supportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  supportBtnText: { color: '#666', fontSize: 11, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingsListScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);

  const { data: rawBookings, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AnyBooking[] }>('/bookings');
      return res.data.data ?? [];
    },
    enabled: !!token,
  });

  const filteredBookings = useMemo(() => {
    let list: AnyBooking[] = rawBookings ?? [];

    // Status filter
    const tab = TABS[activeTab];
    if (tab.statuses !== null) {
      list = list.filter(b => {
        const s = getStatus(b);
        return tab.statuses!.includes(s);
      });
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(b => {
        if ((b as any).isCombined === true) {
          const cb = b as CombinedBooking;
          return (
            cb.paymentGroupId?.toLowerCase().includes(q) ||
            cb.bookings.some(sub => {
              const t = sub.bookingType === 'bike'
                ? sub.bikeItems?.map(i => i.bike?.title ?? i.bike?.name ?? '').join(' ') ?? ''
                : (sub.hostel?.name ?? sub.hostelId?.name ?? '');
              return t.toLowerCase().includes(q) || (sub._id?.toLowerCase() ?? '').includes(q);
            })
          );
        }
        const bk = b as Booking;
        const hostelObj = bk.hostel ?? bk.hostelId;
        const title = bk.bookingType === 'bike'
          ? bk.bikeItems?.map(i => i.bike?.title ?? i.bike?.name ?? '').join(' ') ?? ''
          : (hostelObj?.name ?? '');
        const id = bk._id ?? '';
        return title.toLowerCase().includes(q) || id.toLowerCase().includes(q);
      });
    }

    return list;
  }, [rawBookings, activeTab, search]);

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <EmptyState icon="calendar-outline" title="Login to view bookings" subtitle="See all your bike and hostel bookings here" />
          <Button title="Login" onPress={() => navigation.navigate('Login' as never)} style={styles.loginBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or booking ID..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow} style={styles.tabsScroll}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={tab.label} style={[styles.tab, activeTab === i && styles.tabActive]} onPress={() => setActiveTab(i)}>
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={getKey}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if ((item as any).isCombined === true) {
              const cb = item as CombinedBooking;
              return (
                <CombinedBookingCard
                  item={cb}
                  onNavigate={(id) => navigation.navigate('BookingDetail', { bookingId: id })}
                />
              );
            }
            const bk = item as Booking;
            return (
              <IndividualBookingCard
                booking={bk}
                onPress={() => bk._id && navigation.navigate('BookingDetail', { bookingId: bk._id })}
                onCompletePayment={() =>
                  bk._id && navigation.navigate('PaymentProcessing', { bookingId: bk._id, paymentType: 'remaining' })
                }
                onExtend={() => setExtendBooking(bk)}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={search ? 'No bookings found' : `No ${TABS[activeTab].label.toLowerCase()} bookings`}
              subtitle={search ? 'Try a different search term' : 'Your bookings will appear here'}
            />
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />}
        />
      )}

      {extendBooking && (
        <ExtendModal booking={extendBooking} visible={!!extendBooking} onClose={() => setExtendBooking(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e5e5e5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', padding: 0 },
  tabsScroll: { paddingVertical: 8 },
  tabsRow: { paddingLeft: 12, paddingRight: 20, gap: 6, alignItems: 'center' },
  tab: {height: 36, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5' },
  tabActive: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  list: { padding: 12, paddingBottom: 40 },
  loginPrompt: { flex: 1, padding: 24 },
  loginBtn: { marginTop: 16 },
});
