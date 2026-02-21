import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { User } from '../types/auth.types';
import { useAuthStore } from '../stores/authStore';

export function useUserProfile() {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: User }>('/users/profile');
      return res.data.data;
    },
    enabled: !!token,
  });
}
