import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Bike, BikeSearchParams } from '../types/bike.types';

export function useAvailableBikes(params: Partial<BikeSearchParams>) {
  return useQuery({
    queryKey: ['bikes', 'available', params],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/available', { params });
      return res.data.data;
    },
    enabled: !!(params.startDate && params.endDate),
  });
}
