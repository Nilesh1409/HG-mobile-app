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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import api from '../../lib/api';

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = mobile.length === 10 && /^\d+$/.test(mobile);

  const handleContinue = async () => {
    if (!isValid) {
      setError('Enter a valid 10-digit mobile number');
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
        // User doesn't exist → go to Register with mobile pre-filled
        navigation.navigate('Register', { mobile } as never);
      } else {
        setError(msg || 'Failed to send OTP. Please try again.');
        Toast.show({ type: 'error', text1: 'Error', text2: msg || 'Failed to send OTP' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoBoxText}>H</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome to Happy Go!</Text>
          <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

          {/* Mobile Input */}
          <Text style={styles.label}>Mobile Number</Text>
          <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter mobile number"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(t) => { setMobile(t.replace(/\D/g, '')); setError(''); }}
              accessibilityLabel="Mobile number"
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.hint}>We'll send an OTP to verify your number</Text>

          <Button
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!isValid}
            style={styles.btn}
          />

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New user? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Help */}
          <View style={styles.helpRow}>
            <Ionicons name="call-outline" size={13} color="#999" />
            <Text style={styles.helpText}>Need help? Call </Text>
            <Text style={styles.helpLink}>+91 90080-22800</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: 28, paddingTop: 40 },
  logoRow: { alignItems: 'center', marginBottom: 20 },
  logoBox: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: '#f47b20', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f47b20', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  logoBoxText: { color: '#fff', fontWeight: '800', fontSize: 28 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 10,
    overflow: 'hidden', marginBottom: 6,
  },
  inputRowError: { borderColor: '#ef4444' },
  prefix: {
    backgroundColor: '#f5f5f5', paddingHorizontal: 14, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: '#e5e5e5',
  },
  prefixText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: '#1a1a1a',
  },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8 },
  hint: { fontSize: 12, color: '#999', marginBottom: 24 },
  btn: { marginBottom: 20 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  registerText: { color: '#666', fontSize: 14 },
  registerLink: { color: '#f47b20', fontSize: 14, fontWeight: '600' },
  helpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  helpText: { fontSize: 12, color: '#999' },
  helpLink: { fontSize: 12, color: '#f47b20', fontWeight: '500' },
});
