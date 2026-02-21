import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
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

  // Try fetching by group ID first, then individual booking
  const { data: groupData } = useQuery({
    queryKey: ['bookingGroup', paymentGroupId],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: any }>(
          `/bookings/group/${paymentGroupId}`
        );
        return res.data.data;
      } catch {
        // Might be a single booking ID
        const res = await api.get<{ success: boolean; data: Booking }>(
          `/bookings/${paymentGroupId}`
        );
        return { bookings: [res.data.data], groupTotalAmount: res.data.data.totalAmount };
      }
    },
    enabled: !!paymentGroupId,
    retry: 1,
  });

  const bookings: Booking[] = groupData?.bookings ?? [];
  const firstBooking = bookings[0];
  const totalPaid = groupData?.groupPaidAmount ?? groupData?.groupTotalAmount ?? firstBooking?.paidAmount ?? 0;
  const isPartial = firstBooking?.paymentStatus === 'partial';
  const displayId = paymentGroupId?.slice(-8).toUpperCase() ?? '';

  const copyBookingId = async () => {
    await Clipboard.setStringAsync(paymentGroupId ?? '');
    Toast.show({ type: 'success', text1: 'Booking ID copied!' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={52} color="#ffffff" />
        </Animated.View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>
          {isPartial
            ? 'Your booking is confirmed. Pay remaining amount at pickup/check-in.'
            : 'Your booking has been confirmed. Enjoy your trip!'}
        </Text>

        {/* Booking ID */}
        <TouchableOpacity style={styles.bookingIdCard} onPress={copyBookingId}>
          <View>
            <Text style={styles.bookingIdLabel}>Booking ID</Text>
            <Text style={styles.bookingId}>#{displayId}</Text>
          </View>
          <View style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={16} color="#f47b20" />
            <Text style={styles.copyText}>Copy</Text>
          </View>
        </TouchableOpacity>

        {/* Payment Summary */}
        {firstBooking && (
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Payment Summary</Text>
            {bookings.map((b, i) => (
              <View key={i} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {b.bookingType === 'bike' ? '🏍 Bike Rental' : '🏨 Hostel'}
                </Text>
                <Text style={styles.summaryValue}>₹{b.totalAmount}</Text>
              </View>
            ))}
            <View style={[styles.summaryRow, styles.paidRow]}>
              <Text style={styles.paidLabel}>Paid Now</Text>
              <Text style={styles.paidAmount}>₹{totalPaid}</Text>
            </View>
            {isPartial && firstBooking.remainingAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.remainingLabel}>Due on Pickup</Text>
                <Text style={styles.remainingAmount}>₹{firstBooking.remainingAmount}</Text>
              </View>
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.cardTitle}>What to bring on pickup</Text>
          <View style={styles.instrRow}>
            <Ionicons name="card-outline" size={16} color="#f47b20" />
            <Text style={styles.instrText}>Aadhaar Card (original)</Text>
          </View>
          <View style={styles.instrRow}>
            <Ionicons name="car-outline" size={16} color="#f47b20" />
            <Text style={styles.instrText}>Driving License (original)</Text>
          </View>
          <View style={styles.instrRow}>
            <Ionicons name="phone-portrait-outline" size={16} color="#f47b20" />
            <Text style={styles.instrText}>Phone with booking confirmation</Text>
          </View>
        </View>

        {/* Verification prompt */}
        {firstBooking && (!firstBooking.aadhaarVerified || !firstBooking.dlVerified) && (
          <View style={styles.verifyBanner}>
            <Ionicons name="warning-outline" size={18} color="#f47b20" />
            <View style={styles.verifyBannerText}>
              <Text style={styles.verifyBannerTitle}>Complete verification</Text>
              <Text style={styles.verifyBannerSub}>
                Verify Aadhaar & DL to avoid issues at pickup
              </Text>
            </View>
            <TouchableOpacity
              style={styles.verifyNowBtn}
              onPress={() => navigation.navigate('AadhaarVerify', { bookingId: firstBooking._id })}
            >
              <Text style={styles.verifyNowText}>Verify Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {firstBooking && (
            <Button
              title="View Booking Details"
              onPress={() => navigation.navigate('BookingDetail', { bookingId: firstBooking._id })}
              style={styles.actionBtn}
            />
          )}
          <Button
            title="Go to Home"
            variant="outline"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  iconContainer: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, marginTop: 20,
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 20, paddingHorizontal: 10 },
  bookingIdCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, width: '100%',
    marginBottom: 14, borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  bookingIdLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  bookingId: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  copyText: { color: '#f47b20', fontSize: 13, fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, width: '100%',
    marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  paidRow: { borderBottomWidth: 0, paddingTop: 10 },
  paidLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  paidAmount: { fontSize: 18, fontWeight: '800', color: '#22c55e' },
  remainingLabel: { fontSize: 13, color: '#999' },
  remainingAmount: { fontSize: 14, fontWeight: '600', color: '#f47b20' },
  instructionsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, width: '100%',
    marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1, gap: 8,
  },
  instrRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  instrText: { fontSize: 13, color: '#666' },
  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff5ed', borderRadius: 12, padding: 14, width: '100%',
    marginBottom: 14, borderWidth: 1, borderColor: '#ffd4a8',
  },
  verifyBannerText: { flex: 1 },
  verifyBannerTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  verifyBannerSub: { fontSize: 11, color: '#666', marginTop: 2 },
  verifyNowBtn: { backgroundColor: '#f47b20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  verifyNowText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actions: { width: '100%', gap: 10, marginTop: 4 },
  actionBtn: {},
});
