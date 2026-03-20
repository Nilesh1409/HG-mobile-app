import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/types';
import api from '../../lib/api';

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;

const LOGO = require('../../../assets/happygo.jpeg');

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = mobile.length === 10 && /^\d+$/.test(mobile);

  const handleSendOTP = async () => {
    if (!isValid) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-mobile-otp', { mobile });
      Toast.show({ type: 'success', text1: 'OTP Sent', text2: `OTP sent to +91 ${mobile}` });
      navigation.navigate('OTPVerify', { mobile });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('not found') || err?.response?.status === 404) {
        navigation.navigate('Register', { mobile } as never);
      } else {
        setError(msg || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
          {/* Logo + Brand */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.brandName}>Happy Go</Text>
            <Text style={styles.brandSub}>Happy Ride Happy Stay</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login</Text>
            <Text style={styles.cardSubtitle}>Enter your mobile number to continue</Text>

            {/* Error banner */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Mobile input */}
            <View style={[styles.inputRow, !!error && styles.inputRowError]}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(t) => { setMobile(t.replace(/\D/g, '')); setError(''); }}
                accessibilityLabel="Mobile number"
              />
            </View>

            {/* Send OTP button */}
            <TouchableOpacity
              style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
              onPress={handleSendOTP}
              disabled={!isValid || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
            </TouchableOpacity>

            {/* Sign up link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12,
    overflow: 'hidden', marginBottom: 20,
  },
  inputRowError: { borderColor: '#ef4444' },
  prefix: {
    backgroundColor: '#f5f5f5', paddingHorizontal: 14, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: '#e5e5e5',
  },
  prefixText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' },

  // Button
  btn: {
    backgroundColor: '#f47b20', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
  },
  btnDisabled: { backgroundColor: '#f7c49f' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Sign up
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  signupText: { color: '#666', fontSize: 14 },
  signupLink: { color: '#f47b20', fontSize: 14, fontWeight: '600' },

  // Help
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  helpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  helpText: { fontSize: 13, color: '#999' },
  helpLink: { fontSize: 13, color: '#f47b20', fontWeight: '500' },
});
