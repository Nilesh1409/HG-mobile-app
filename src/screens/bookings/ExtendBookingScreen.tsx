import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import Button from '../../components/common/Button';
import api from '../../lib/api';

type Nav = StackNavigationProp<MainStackParamList, 'ExtendBooking'>;
type Route = RouteProp<MainStackParamList, 'ExtendBooking'>;

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function ExtendBookingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;

  const [newEndDate, setNewEndDate] = useState(new Date());
  const [newEndTime, setNewEndTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const extendMutation = useMutation({
    mutationFn: () =>
      api.put(`/bookings/${bookingId}/extend/user`, {
        newEndDate: formatDate(newEndDate),
        newEndTime: formatTime(newEndTime),
      }),
    onSuccess: (res: any) => {
      const booking = res.data.data;
      if (booking) {
        navigation.navigate('PaymentProcessing', {
          bookingId: booking._id,
          paymentType: 'remaining',
        });
      } else {
        Toast.show({ type: 'success', text1: 'Booking extended' });
        navigation.goBack();
      }
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Extension failed',
        text2: err?.response?.data?.message ?? 'Please try again',
      });
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Extend Booking" />
      <View style={styles.content}>
        <Text style={styles.description}>
          Select the new end date and time for your booking.
          Extension charges will be calculated automatically.
        </Text>

        <Text style={styles.label}>New End Date</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowDate(true)}>
          <Text style={styles.pickerText}>{formatDate(newEndDate)}</Text>
        </TouchableOpacity>

        {showDate && (
          <DateTimePicker
            value={newEndDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDate(Platform.OS === 'ios');
              if (date) setNewEndDate(date);
            }}
          />
        )}

        <Text style={styles.label}>New End Time</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowTime(true)}>
          <Text style={styles.pickerText}>{formatTime(newEndTime)}</Text>
        </TouchableOpacity>

        {showTime && (
          <DateTimePicker
            value={newEndTime}
            mode="time"
            is24Hour
            minuteInterval={30}
            onChange={(_, date) => {
              setShowTime(Platform.OS === 'ios');
              if (date) setNewEndTime(date);
            }}
          />
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Extension charges will be displayed and payment will be processed via Razorpay.
          </Text>
        </View>

        <Button
          title="Confirm Extension"
          onPress={() => extendMutation.mutate()}
          loading={extendMutation.isPending}
          style={styles.confirmBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, padding: 20 },
  description: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', marginBottom: 8 },
  picker: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  pickerText: { fontSize: 16, color: '#1a1a1a' },
  infoBox: {
    backgroundColor: '#fff5ed',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffd4a8',
    marginBottom: 24,
  },
  infoText: { fontSize: 13, color: '#666', lineHeight: 20 },
  confirmBtn: {},
});
