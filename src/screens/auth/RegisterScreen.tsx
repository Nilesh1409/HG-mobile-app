import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/types';
import api from '../../lib/api';

type Nav = StackNavigationProp<AuthStackParamList, 'Register'>;
type Route = RouteProp<AuthStackParamList, 'Register'>;

const LOGO = require('../../../assets/happygo.jpeg');

interface ReferralState {
  isValidating: boolean;
  isValid: boolean | null;
  referrerName: string;
  reward: number;
  message: string;
}

const DEFAULT_REFERRAL: ReferralState = {
  isValidating: false,
  isValid: null,
  referrerName: '',
  reward: 0,
  message: '',
};

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const prefillMobile = (route.params as any)?.mobile ?? '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState(prefillMobile);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referral, setReferral] = useState<ReferralState>(DEFAULT_REFERRAL);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateReferral = useCallback(async (code: string) => {
    if (!code || code.length < 3) {
      setReferral(DEFAULT_REFERRAL);
      return;
    }
    setReferral((prev) => ({ ...prev, isValidating: true }));
    try {
      const res = await api.post('/referrals/apply', { referralCode: code });
      const d = res.data;
      setReferral({
        isValidating: false,
        isValid: true,
        referrerName: d?.data?.referrer?.name ?? '',
        reward: d?.data?.reward ?? 0,
        message: d?.data?.message ?? '',
      });
    } catch (err: any) {
      setReferral({
        isValidating: false,
        isValid: false,
        referrerName: '',
        reward: 0,
        message: err?.response?.data?.message ?? 'Invalid referral code',
      });
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (referralCode) validateReferral(referralCode);
      else setReferral(DEFAULT_REFERRAL);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [referralCode, validateReferral]);

  const validate = () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return false;
    }
    if (!email.trim() || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!mobile.trim() || mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return false;
    }
    if (referralCode && referral.isValid === false) {
      setError('Please enter a valid referral code or leave it empty');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile.trim(),
      };
      if (referralCode && referral.isValid) {
        payload.referralCode = referralCode.toUpperCase();
      }
      await api.post('/auth/register', payload);
      Toast.show({ type: 'success', text1: 'Account Created!', text2: 'OTP sent to your mobile' });
      navigation.navigate('OTPVerify', { mobile: mobile.trim(), isNewUser: true } as never);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const ReferralIcon = () => {
    if (referral.isValidating) return <ActivityIndicator size="small" color="#999" />;
    if (referral.isValid === true) return <Ionicons name="checkmark-circle" size={18} color="#22c55e" />;
    if (referral.isValid === false) return <Ionicons name="alert-circle" size={18} color="#ef4444" />;
    return <Ionicons name="gift-outline" size={18} color="#f47b20" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.brandName}>Happy Go</Text>
            <Text style={styles.brandSub}>Happy Ride Happy Stay</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSubtitle}>Join thousands of happy travelers</Text>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Full Name */}
            <InputField
              placeholder="Full Name"
              value={name}
              onChangeText={(t) => { setName(t); setError(''); }}
              autoCapitalize="words"
            />

            {/* Email */}
            <InputField
              placeholder="Email Address"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Mobile */}
            <View style={styles.mobileRow}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.mobileInput}
                placeholder="Mobile Number"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(t) => { setMobile(t.replace(/\D/g, '')); setError(''); }}
              />
            </View>

            {/* Referral Code */}
            <View style={styles.referralWrapper}>
              <View style={styles.referralRow}>
                <TextInput
                  style={styles.referralInput}
                  placeholder="Referral Code (Optional)"
                  placeholderTextColor="#aaa"
                  value={referralCode}
                  onChangeText={(t) => { setReferralCode(t.toUpperCase()); setError(''); }}
                  autoCapitalize="characters"
                />
                <View style={styles.referralIcon}>
                  <ReferralIcon />
                </View>
              </View>

              {referral.isValid === true && (
                <View style={styles.referralSuccess}>
                  <Ionicons name="people-outline" size={14} color="#15803d" />
                  <Text style={styles.referralSuccessText}>
                    Referred by <Text style={{ fontWeight: '700' }}>{referral.referrerName}</Text>
                    {!!referral.reward && ` · 🎉 ₹${referral.reward} off your first booking!`}
                  </Text>
                </View>
              )}

              {referral.isValid === false && !!referralCode && (
                <View style={styles.referralError}>
                  <Text style={styles.referralErrorText}>{referral.message}</Text>
                </View>
              )}

              {!referralCode && (
                <Text style={styles.referralHint}>
                  Have a referral code? Enter it to get ₹100 off your first booking!
                </Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, (loading || referral.isValidating) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading || referral.isValidating}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnText}>Create Account & Send OTP</Text>
              }
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Help */}
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.helpRow}
              onPress={() => Linking.openURL('tel:+919008022800')}
            >
              <Ionicons name="call-outline" size={14} color="#999" />
              <Text style={styles.helpText}>Need help? Call </Text>
              <Text style={styles.helpLink}>+91 90080-22800</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  placeholder, value, onChangeText, keyboardType, autoCapitalize,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}) {
  return (
    <TextInput
      style={styles.textInput}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize ?? 'sentences'}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 },

  // Brand
  brand: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#f47b20', overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#f47b20', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  logoImage: { width: 80, height: 80 },
  brandName: { fontSize: 30, fontWeight: '800', color: '#f47b20', letterSpacing: 0.3 },
  brandSub: { fontSize: 13, color: '#888', marginTop: 2 },

  // Card
  card: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorBannerText: { fontSize: 13, color: '#dc2626', flex: 1 },

  // Inputs
  textInput: {
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: '#1a1a1a', marginBottom: 14,
  },
  mobileRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12,
    overflow: 'hidden', marginBottom: 14,
  },
  prefix: {
    backgroundColor: '#f5f5f5', paddingHorizontal: 14, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: '#e5e5e5',
  },
  prefixText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  mobileInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' },

  // Referral
  referralWrapper: { marginBottom: 14 },
  referralRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12,
    overflow: 'hidden',
  },
  referralInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: '#1a1a1a',
  },
  referralIcon: { paddingRight: 12 },
  referralSuccess: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 8, padding: 10, marginTop: 8,
  },
  referralSuccessText: { fontSize: 12, color: '#15803d', flex: 1 },
  referralError: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 8, padding: 10, marginTop: 8,
  },
  referralErrorText: { fontSize: 12, color: '#dc2626' },
  referralHint: { fontSize: 11, color: '#aaa', marginTop: 6 },

  // Button
  btn: {
    backgroundColor: '#f47b20', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
  },
  btnDisabled: { backgroundColor: '#f7c49f' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Login link
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#f47b20', fontSize: 14, fontWeight: '600' },

  // Help
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  helpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  helpText: { fontSize: 13, color: '#999' },
  helpLink: { fontSize: 13, color: '#f47b20', fontWeight: '500' },
});
