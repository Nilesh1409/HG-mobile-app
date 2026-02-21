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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import api from '../../lib/api';
import type { Booking } from '../../types/booking.types';

type Nav = StackNavigationProp<MainStackParamList, 'BookingDetail'>;
type Route = RouteProp<MainStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;

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
  const hasRemaining = booking.paymentStatus === 'partial' && booking.remainingAmount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Booking Details" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />
        }
      >
        {/* Status Row */}
        <View style={styles.statusRow}>
          <Badge label={booking.status} variant={booking.status} />
          <Badge label={booking.paymentStatus} variant={booking.paymentStatus} />
        </View>

        {/* Booking Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isBike ? '🏍 Bike Booking' : '🏨 Hostel Booking'}</Text>
          <Text style={styles.bookingId}>#{booking._id.slice(-8).toUpperCase()}</Text>

          {isBike ? (
            <>
              {booking.bikeItems?.map((item, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.label}>{item.bike?.name}</Text>
                  <Text style={styles.value}>x{item.quantity} ({item.kmOption})</Text>
                </View>
              ))}
              <View style={styles.row}>
                <Text style={styles.label}>Dates</Text>
                <Text style={styles.value}>{booking.startDate} → {booking.endDate}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Time</Text>
                <Text style={styles.value}>{booking.startTime} – {booking.endTime}</Text>
              </View>
              {(booking.helmetQuantity ?? 0) > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Helmets</Text>
                  <Text style={styles.value}>{booking.helmetQuantity}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Hostel</Text>
                <Text style={styles.value}>{booking.hostelId?.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Dates</Text>
                <Text style={styles.value}>{booking.checkIn} → {booking.checkOut}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Room</Text>
                <Text style={styles.value}>{booking.roomType}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Meal</Text>
                <Text style={styles.value}>{booking.mealOption}</Text>
              </View>
            </>
          )}
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount</Text>
            <Text style={styles.value}>₹{booking.totalAmount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Paid</Text>
            <Text style={[styles.value, styles.paid]}>₹{booking.paidAmount}</Text>
          </View>
          {hasRemaining && (
            <View style={styles.row}>
              <Text style={styles.label}>Remaining</Text>
              <Text style={[styles.value, styles.remaining]}>₹{booking.remainingAmount}</Text>
            </View>
          )}
        </View>

        {/* Verification Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verification</Text>
          <TouchableOpacity
            style={styles.verifyRow}
            onPress={() => !booking.aadhaarVerified && navigation.navigate('AadhaarVerify', { bookingId })}
          >
            <Text style={styles.label}>Aadhaar</Text>
            <Text style={booking.aadhaarVerified ? styles.verified : styles.notVerified}>
              {booking.aadhaarVerified ? '✓ Verified' : '✗ Not Verified — Tap to Verify'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.verifyRow}
            onPress={() => !booking.dlVerified && navigation.navigate('UploadDL', { bookingId })}
          >
            <Text style={styles.label}>Driving License</Text>
            <Text style={booking.dlVerified ? styles.verified : styles.notVerified}>
              {booking.dlVerified ? '✓ Verified' : '✗ Not Uploaded — Tap to Upload'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {hasRemaining && (
            <Button
              title={`Pay Remaining ₹${booking.remainingAmount}`}
              onPress={() =>
                navigation.navigate('PaymentProcessing', {
                  bookingId,
                  paymentType: 'remaining',
                })
              }
            />
          )}
          {isBike && isActive && (
            <Button
              title="Extend Booking"
              variant="outline"
              onPress={() => navigation.navigate('ExtendBooking', { bookingId })}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scroll: { padding: 16, paddingBottom: 40 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  bookingId: { fontSize: 12, color: '#999', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', textTransform: 'capitalize', flex: 1, textAlign: 'right' },
  paid: { color: '#22c55e' },
  remaining: { color: '#f47b20' },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  verified: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  notVerified: { fontSize: 13, color: '#f47b20', fontWeight: '500' },
  actions: { gap: 10 },
});
