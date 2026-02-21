import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Hostel } from '../types/hostel.types';

export function useHostels() {
  return useQuery({
    queryKey: ['hostels'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}
