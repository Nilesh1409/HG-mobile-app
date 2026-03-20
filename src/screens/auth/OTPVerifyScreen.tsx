import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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

  // ── OTP digits state ─────────────────────────────────────────────────────────
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [resending, setResending] = useState(false);
  // Fallback: a plain visible input shown when user can't interact with boxes
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackOtp, setFallbackOtp] = useState('');

  const boxRefs = useRef<(TextInput | null)[]>([]);
  const fallbackRef = useRef<TextInput>(null);

  const otp = showFallback
    ? fallbackOtp.replace(/\D/g, '').slice(0, OTP_LENGTH)
    : digits.join('');

  // Focus first box on mount (delayed slightly for Android transition)
  useEffect(() => {
    const t = setTimeout(() => boxRefs.current[0]?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // ── Digit change handler ─────────────────────────────────────────────────────
  const handleDigitChange = useCallback((text: string, index: number) => {
    // Handle paste — fill all boxes at once
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const filled = cleaned.slice(0, OTP_LENGTH).split('');
      const newDigits = Array(OTP_LENGTH).fill('');
      filled.forEach((d, i) => { newDigits[i] = d; });
      setDigits(newDigits);
      const lastFilled = Math.min(filled.length - 1, OTP_LENGTH - 1);
      boxRefs.current[lastFilled]?.focus();
      return;
    }
    // Single digit
    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  // ── Backspace handler ────────────────────────────────────────────────────────
  const handleKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        boxRefs.current[index - 1]?.focus();
      }
    }
  }, [digits]);

  // ── Verify ───────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const finalOtp = otp.trim();
    if (finalOtp.length !== OTP_LENGTH) {
      Toast.show({ type: 'error', text1: 'Enter all 6 digits' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/verify-mobile-otp', {
        mobile,
        otp: finalOtp,
      });
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

  // ── Resend ───────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/send-mobile-otp', { mobile });
      setResendTimer(RESEND_TIMEOUT);
      setDigits(Array(OTP_LENGTH).fill(''));
      setFallbackOtp('');
      Toast.show({ type: 'success', text1: 'OTP Resent', text2: `New OTP sent to +91 ${mobile}` });
      setTimeout(() => {
        if (showFallback) fallbackRef.current?.focus();
        else boxRefs.current[0]?.focus();
      }, 200);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to resend OTP' });
    } finally {
      setResending(false);
    }
  };

  // ── Switch to fallback ────────────────────────────────────────────────────────
  const toggleFallback = () => {
    setShowFallback((v) => {
      const next = !v;
      setDigits(Array(OTP_LENGTH).fill(''));
      setFallbackOtp('');
      setTimeout(() => {
        if (next) fallbackRef.current?.focus();
        else boxRefs.current[0]?.focus();
      }, 200);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP sent to{'\n'}
            <Text style={styles.mobileText}>+91 {mobile}</Text>
          </Text>

          {/* ── OTP boxes (primary) ── */}
          {!showFallback && (
            <>
              {/* Tap anywhere on the row to focus first empty box */}
              <Pressable
                style={styles.otpRow}
                onPress={() => {
                  const firstEmpty = digits.findIndex((d) => d === '');
                  const target = firstEmpty === -1 ? OTP_LENGTH - 1 : firstEmpty;
                  boxRefs.current[target]?.focus();
                }}
              >
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { boxRefs.current[i] = r; }}
                    style={[
                      styles.otpBox,
                      digits[i] ? styles.otpBoxFilled : null,
                    ]}
                    value={digits[i]}
                    onChangeText={(t) => handleDigitChange(t, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH} // allows paste
                    textAlign="center"
                    caretHidden
                    selectTextOnFocus
                    contextMenuHidden
                  />
                ))}
              </Pressable>

              {/* Keyboard not showing? Fallback link */}
              <TouchableOpacity style={styles.fallbackLink} onPress={toggleFallback}>
                <Ionicons name="keypad-outline" size={14} color="#888" />
                <Text style={styles.fallbackLinkText}>Keyboard not showing? Tap here</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Fallback: plain single TextInput ── */}
          {showFallback && (
            <>
              <View style={styles.fallbackWrapper}>
                <TextInput
                  ref={fallbackRef}
                  style={styles.fallbackInput}
                  value={fallbackOtp}
                  onChangeText={(t) => setFallbackOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#bbb"
                  textAlign="center"
                  autoFocus
                />
                {/* Show digit count hint */}
                <Text style={styles.fallbackCount}>{fallbackOtp.length}/{OTP_LENGTH}</Text>
              </View>

              <TouchableOpacity style={styles.fallbackLink} onPress={toggleFallback}>
                <Ionicons name="grid-outline" size={14} color="#888" />
                <Text style={styles.fallbackLinkText}>Switch back to OTP boxes</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Verify button */}
          <Button
            title="Verify OTP"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length !== OTP_LENGTH}
            style={styles.verifyBtn}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <View style={styles.timerRow}>
                <Ionicons name="time-outline" size={14} color="#999" />
                <Text style={styles.timerText}>Resend OTP in {resendTimer}s</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
                <Ionicons name="refresh-outline" size={14} color="#f47b20" />
                <Text style={styles.resendLink}>
                  {resending ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Help */}
          <View style={styles.helpRow}>
            <Ionicons name="call-outline" size={13} color="#ccc" />
            <Text style={styles.helpText}>Need help? Call +91 90080-22800</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 20 },

  backBtn: { marginBottom: 28 },
  backText: { color: '#f47b20', fontSize: 15, fontWeight: '600' },

  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 32, lineHeight: 22 },
  mobileText: { fontWeight: '700', color: '#1a1a1a' },

  // OTP boxes
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  otpBox: {
    width: 48, height: 56,
    borderRadius: 12, borderWidth: 2, borderColor: '#e5e5e5',
    backgroundColor: '#f9f9f9',
    fontSize: 22, fontWeight: '700', color: '#1a1a1a',
  },
  otpBoxFilled: {
    borderColor: '#f47b20', backgroundColor: '#fff5ed',
  },

  // Fallback toggle link
  fallbackLink: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    justifyContent: 'center', marginBottom: 24,
  },
  fallbackLinkText: { fontSize: 12, color: '#888' },

  // Fallback plain input
  fallbackWrapper: { marginBottom: 8 },
  fallbackInput: {
    borderWidth: 2, borderColor: '#f47b20', borderRadius: 14,
    paddingVertical: 16, fontSize: 24, fontWeight: '700',
    color: '#1a1a1a', letterSpacing: 8, backgroundColor: '#fff5ed',
    marginBottom: 6,
  },
  fallbackCount: { fontSize: 12, color: '#aaa', textAlign: 'right' },

  // Buttons
  verifyBtn: { marginBottom: 20 },
  resendRow: { alignItems: 'center', marginBottom: 24 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timerText: { color: '#999', fontSize: 14 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resendLink: { color: '#f47b20', fontSize: 14, fontWeight: '600' },

  // Help
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  helpText: { fontSize: 12, color: '#ccc' },
});
