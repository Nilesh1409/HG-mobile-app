import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import type { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { AuthResponse } from '../../types/auth.types';

type Nav = StackNavigationProp<AuthStackParamList, 'OTPVerify'>;
type Route = RouteProp<AuthStackParamList, 'OTPVerify'>;

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 60;

export default function OTPVerifyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { mobile } = route.params;
  const { login } = useAuthStore();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      Toast.show({ type: 'error', text1: 'Enter all 6 digits' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/verify-mobile-otp', { mobile, otp });
      await login(res.data.token, res.data.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Welcome!', text2: `Hi ${res.data.data.name}` });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid OTP. Please try again.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/send-mobile-otp', { mobile });
      setResendTimer(RESEND_TIMEOUT);
      setOtp('');
      Toast.show({ type: 'success', text1: 'OTP Resent', text2: `New OTP sent to ${mobile}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to resend OTP' });
    } finally {
      setResending(false);
    }
  };

  const otpDisplay = otp.padEnd(OTP_LENGTH, ' ');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP sent to{'\n'}
            <Text style={styles.mobile}>{mobile}</Text>
          </Text>

          <TouchableOpacity onPress={() => inputRef.current?.focus()} activeOpacity={1}>
            <View style={styles.otpRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    otp.length === i && styles.otpBoxActive,
                    otp.length > i && styles.otpBoxFilled,
                  ]}
                >
                  <Text style={styles.otpDigit}>{otpDisplay[i]?.trim() || ''}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            style={styles.hiddenInput}
            autoFocus
          />

          <Button
            title="Verify OTP"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length !== OTP_LENGTH}
            style={styles.verifyBtn}
          />

          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={styles.timerText}>Resend OTP in {resendTimer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text style={styles.resendLink}>
                  {resending ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  content: { flex: 1, padding: 24 },
  backBtn: { marginBottom: 32 },
  backText: { color: '#f47b20', fontSize: 15, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666666', marginBottom: 32, lineHeight: 22 },
  mobile: { fontWeight: '600', color: '#1a1a1a' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  otpBoxActive: { borderColor: '#f47b20' },
  otpBoxFilled: { borderColor: '#f47b20', backgroundColor: '#fff5ed' },
  otpDigit: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  verifyBtn: { marginTop: 32, marginBottom: 20 },
  resendRow: { alignItems: 'center' },
  timerText: { color: '#999999', fontSize: 14 },
  resendLink: { color: '#f47b20', fontSize: 14, fontWeight: '600' },
});
