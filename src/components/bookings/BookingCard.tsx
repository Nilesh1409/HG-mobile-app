import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Badge from '../common/Badge';
import type { Booking } from '../../types/booking.types';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

export default function BookingCard({ booking, onPress }: BookingCardProps) {
  const isBike = booking.bookingType === 'bike';
  const title = isBike
    ? booking.bikeItems?.map((b) => `${b.bike?.name}`).join(', ') ?? 'Bike Booking'
    : booking.hostelId?.name ?? 'Hostel Booking';

  const dateRange = isBike
    ? `${booking.startDate} → ${booking.endDate}`
    : `${booking.checkIn} → ${booking.checkOut}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityLabel={`Booking ${title}`}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={isBike ? 'bicycle' : 'bed'}
          size={24}
          color="#f47b20"
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.date}>{dateRange}</Text>
        <View style={styles.row}>
          <Badge label={booking.status} variant={booking.status} />
          <Text style={styles.amount}>₹{booking.totalAmount}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff5ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  date: { fontSize: 12, color: '#999', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
});
