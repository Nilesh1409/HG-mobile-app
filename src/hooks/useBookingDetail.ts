import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Booking } from '../types/booking.types';

export function useBookingDetail(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Booking }>(`/bookings/${bookingId}`);
      return res.data.data;
    },
    enabled: !!bookingId,
  });
}
