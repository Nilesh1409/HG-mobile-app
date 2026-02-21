import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import api from '../../lib/api';

type Nav = StackNavigationProp<MainStackParamList, 'AadhaarVerify'>;
type Route = RouteProp<MainStackParamList, 'AadhaarVerify'>;

const CASHFREE_BASE = 'https://sandbox.cashfree.com/verification';

export default function AadhaarVerifyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params ?? {};

  const [step, setStep] = useState<1 | 2>(1);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [refId, setRefId] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedData, setVerifiedData] = useState<null | {
    name: string;
    dob: string;
    gender: string;
    address: string;
  }>(null);

  const handleSendOTP = async () => {
    if (aadhaarNumber.length !== 12) {
      Toast.show({ type: 'error', text1: 'Enter valid 12-digit Aadhaar number' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${CASHFREE_BASE}/offline-aadhaar/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.EXPO_PUBLIC_CASHFREE_CLIENT_ID ?? '',
          'x-client-secret': process.env.EXPO_PUBLIC_CASHFREE_CLIENT_SECRET ?? '',
        },
        body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setRefId(data.ref_id);
        setStep(2);
        Toast.show({ type: 'success', text1: 'OTP sent to your Aadhaar-linked mobile' });
      } else {
        Toast.show({ type: 'error', text1: 'Failed to send OTP', text2: data.message });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter valid 6-digit OTP' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${CASHFREE_BASE}/offline-aadhaar/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.EXPO_PUBLIC_CASHFREE_CLIENT_ID ?? '',
          'x-client-secret': process.env.EXPO_PUBLIC_CASHFREE_CLIENT_SECRET ?? '',
        },
        body: JSON.stringify({ otp, ref_id: refId }),
      });
      const data = await res.json();
      if (data.status === 'VALID') {
        const aadhaarData = {
          name: data.name,
          dob: data.dob,
          gender: data.gender,
          address: data.address,
          verificationStatus: 'verified',
          refId,
        };
        await api.post('/users/aadhaar', { aadhaarDetails: aadhaarData });
        if (bookingId) {
          await api.post(`/bookings/${bookingId}/aadhaar`, {
            aadhaarNumber,
            verificationData: aadhaarData,
          });
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setVerifiedData({ name: data.name, dob: data.dob, gender: data.gender, address: data.address });
      } else {
        Toast.show({ type: 'error', text1: 'Verification failed', text2: 'Invalid OTP' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (verifiedData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Aadhaar Verification" />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Aadhaar Verified!</Text>
          <View style={styles.verifiedCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{verifiedData.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DOB</Text>
              <Text style={styles.value}>{verifiedData.dob}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>{verifiedData.gender}</Text>
            </View>
          </View>
          <Button title="Done" onPress={() => navigation.goBack()} style={styles.doneBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Aadhaar Verification" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
              <Text style={styles.stepNum}>2</Text>
            </View>
          </View>

          {step === 1 ? (
            <>
              <Text style={styles.stepTitle}>Enter Aadhaar Number</Text>
              <Text style={styles.stepSubtitle}>
                We'll send an OTP to the mobile number linked with your Aadhaar.
              </Text>
              <Input
                label="12-digit Aadhaar Number"
                placeholder="1234 5678 9012"
                value={aadhaarNumber}
                onChangeText={(t) => setAadhaarNumber(t.replace(/\D/g, '').slice(0, 12))}
                keyboardType="number-pad"
                maxLength={12}
              />
              <Button
                title="Send OTP"
                onPress={handleSendOTP}
                loading={loading}
                disabled={aadhaarNumber.length !== 12}
              />
            </>
          ) : (
            <>
              <Text style={styles.stepTitle}>Enter OTP</Text>
              <Text style={styles.stepSubtitle}>
                Enter the 6-digit OTP sent to your Aadhaar-linked mobile number.
              </Text>
              <Input
                label="6-digit OTP"
                placeholder="123456"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                title="Verify Aadhaar"
                onPress={handleVerify}
                loading={loading}
                disabled={otp.length !== 6}
              />
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep(1)}
                style={styles.backBtn}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: 20 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#f47b20' },
  stepNum: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e5e5', marginHorizontal: 8 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  backBtn: { marginTop: 10 },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  successIcon: {
    fontSize: 48,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    textAlign: 'center',
    lineHeight: 80,
    color: '#fff',
    overflow: 'hidden',
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  verifiedCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  doneBtn: { width: '100%' },
});
