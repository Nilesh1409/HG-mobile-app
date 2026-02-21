import React from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { User } from '../../types/auth.types';
import queryClient from '../../lib/queryClient';

type Nav = StackNavigationProp<MainStackParamList, 'EditProfile'>;

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Enter valid email'),
  mobile: z.string().length(10, '10-digit mobile required').regex(/^\d+$/),
});
type FormData = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, updateUser } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      mobile: user?.mobile ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.put<{ success: boolean; data: User }>('/users/profile', data),
    onSuccess: (res) => {
      updateUser(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      navigation.goBack();
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: err?.response?.data?.message ?? 'Please try again',
      });
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Edit Profile" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input label="Full Name" onChangeText={onChange} value={value} error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email"
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
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
                maxLength={10}
                error={errors.mobile?.message}
              />
            )}
          />
          <Button
            title="Save Changes"
            onPress={handleSubmit((data) => updateMutation.mutate(data))}
            loading={isSubmitting || updateMutation.isPending}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: 20 },
  saveBtn: { marginTop: 8 },
});
