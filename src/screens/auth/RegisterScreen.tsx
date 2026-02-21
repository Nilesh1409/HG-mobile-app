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
import { useNavigation } from '@react-navigation/native';
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

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  mobile: z.string().length(10, 'Mobile must be 10 digits').regex(/^\d+$/, 'Only digits allowed'),
  referralCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', data);
      Toast.show({ type: 'success', text1: 'Registered!', text2: 'OTP sent to your mobile' });
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join HappyGo and start exploring</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name"
                placeholder="Rahul Sharma"
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
                label="Email"
                placeholder="rahul@example.com"
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
                label="Mobile Number"
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
                placeholder="HAPPY100"
                onChangeText={onChange}
                value={value}
                autoCapitalize="characters"
                error={errors.referralCode?.message}
              />
            )}
          />

          <Button
            title="Register & Get OTP"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitBtn}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 24 },
  backText: { color: '#f47b20', fontSize: 15, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666666', marginBottom: 28 },
  submitBtn: { marginTop: 8, marginBottom: 20 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: '#666666', fontSize: 14 },
  loginLink: { color: '#f47b20', fontSize: 14, fontWeight: '600' },
});
