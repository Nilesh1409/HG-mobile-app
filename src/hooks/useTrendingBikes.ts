import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Bike } from '../types/bike.types';

export function useTrendingBikes() {
  return useQuery({
    queryKey: ['bikes', 'trending'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/trending');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}
