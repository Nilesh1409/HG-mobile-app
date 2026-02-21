import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Hostel, HostelSearchParams } from '../types/hostel.types';

export function useAvailableHostels(params: Partial<HostelSearchParams>) {
  return useQuery({
    queryKey: ['hostels', 'available', params],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels/available', { params });
      return res.data.data;
    },
    enabled: !!(params.checkIn && params.checkOut),
  });
}
