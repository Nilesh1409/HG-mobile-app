import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Booking } from '../types/booking.types';
import { useAuthStore } from '../stores/authStore';

export function useBookings() {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Booking[] }>('/bookings');
      return res.data.data;
    },
    enabled: !!token,
  });
}
