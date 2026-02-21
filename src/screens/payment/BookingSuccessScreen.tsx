import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import type { MainStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import api from '../../lib/api';
import type { Booking } from '../../types/booking.types';

type Nav = StackNavigationProp<MainStackParamList, 'BookingSuccess'>;
type Route = RouteProp<MainStackParamList, 'BookingSuccess'>;

export default function BookingSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { paymentGroupId } = route.params;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const { data: bookings } = useQuery({
    queryKey: ['bookingGroup', paymentGroupId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Booking[] }>(
        `/bookings/group/${paymentGroupId}`
      );
      return res.data.data;
    },
  });

  const firstBooking = bookings?.[0];
  const isPartial = firstBooking?.paymentStatus === 'partial';

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.checkIcon}>✓</Text>
      </Animated.View>

      <Text style={styles.title}>Booking Confirmed!</Text>
      <Text style={styles.subtitle}>
        {isPartial
          ? 'Your booking is confirmed. Pay the remaining amount on pickup.'
          : 'Your booking has been confirmed. Have a great trip!'}
      </Text>

      {firstBooking && (
        <View style={styles.summaryCard}>
          <Text style={styles.bookingId}>Booking #{firstBooking._id.slice(-8).toUpperCase()}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>{firstBooking.status}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={styles.summaryValue}>₹{firstBooking.paidAmount}</Text>
          </View>
          {isPartial && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, styles.remaining]}>₹{firstBooking.remainingAmount}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actions}>
        {firstBooking && (
          <Button
            title="View Booking"
            onPress={() => navigation.navigate('BookingDetail', { bookingId: firstBooking._id })}
            style={styles.actionBtn}
          />
        )}
        <Button
          title="Go Home"
          variant="outline"
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
          }
          style={styles.actionBtn}
        />
      </View>
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
    gap: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  checkIcon: { fontSize: 48, color: '#ffffff', lineHeight: 56 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginTop: -8 },
  summaryCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  bookingId: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 10 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', textTransform: 'capitalize' },
  remaining: { color: '#f47b20' },
  actions: { width: '100%', gap: 10 },
  actionBtn: {},
});
