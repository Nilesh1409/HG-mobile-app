import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ReferralData } from '../types/payment.types';
import { useAuthStore } from '../stores/authStore';

export function useReferrals() {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ReferralData }>('/referrals');
      return res.data.data;
    },
    enabled: !!token,
  });
}
