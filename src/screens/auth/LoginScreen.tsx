import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
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

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;

const schema = z.object({
  mobile: z.string().length(10, 'Mobile must be 10 digits').regex(/^\d+$/, 'Only digits allowed'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/send-mobile-otp', { mobile: data.mobile });
      Toast.show({ type: 'success', text1: 'OTP Sent', text2: `OTP sent to ${data.mobile}` });
      navigation.navigate('OTPVerify', { mobile: data.mobile });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to send OTP. Try again.';
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

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your mobile number to receive an OTP</Text>

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

          <Button
            title="Send OTP"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitBtn}
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New to HappyGo? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create Account</Text>
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
  backBtn: { marginBottom: 32 },
  backText: { color: '#f47b20', fontSize: 15, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666666', marginBottom: 32 },
  submitBtn: { marginTop: 8, marginBottom: 20 },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: '#666666', fontSize: 14 },
  registerLink: { color: '#f47b20', fontSize: 14, fontWeight: '600' },
});
