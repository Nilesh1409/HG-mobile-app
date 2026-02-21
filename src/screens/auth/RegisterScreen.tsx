import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import type { AuthStackParamList } from '../../navigation/types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import api from '../../lib/api';

type Nav = StackNavigationProp<AuthStackParamList, 'Register'>;
type Route = RouteProp<AuthStackParamList, 'Register'>;

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  mobile: z.string().length(10, 'Mobile must be 10 digits').regex(/^\d+$/, 'Only digits allowed'),
  referralCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const prefillMobile = (route.params as any)?.mobile ?? '';

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mobile: prefillMobile },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', data);
      Toast.show({ type: 'success', text1: 'Account Created!', text2: 'OTP sent to your mobile' });
      navigation.navigate('OTPVerify', { mobile: data.mobile, isNewUser: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Registration failed. Please try again.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
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

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join thousands of happy travelers</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name *"
                placeholder="Enter your full name"
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email Address *"
                placeholder="Enter your email"
                onChangeText={onChange}
                value={value}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="mobile"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Mobile Number *"
                placeholder="9876543210"
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
                maxLength={10}
                error={errors.mobile?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="referralCode"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Referral Code (Optional)"
                placeholder="Enter referral code"
                onChangeText={onChange}
                value={value}
                autoCapitalize="characters"
                error={errors.referralCode?.message}
                hint="Have a referral code? Enter it to get ₹500 off your first booking!"
              />
            )}
          />

          <Button
            title="Create Account & Send OTP"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 32, paddingBottom: 40 },
  logoRow: { alignItems: 'center', marginBottom: 16 },
  logoBox: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#f47b20', alignItems: 'center', justifyContent: 'center',
  },
  logoBoxText: { color: '#fff', fontWeight: '800', fontSize: 26 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  submitBtn: { marginTop: 8, marginBottom: 16 },
  backRow: { alignItems: 'center' },
  backText: { color: '#f47b20', fontSize: 14, fontWeight: '500' },
});
