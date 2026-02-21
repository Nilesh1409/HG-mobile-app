import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Bike, BikeDetailParams } from '../types/bike.types';

export function useBikeDetail(bikeId: string, params?: Partial<BikeDetailParams>) {
  return useQuery({
    queryKey: ['bike', bikeId, params],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike }>(`/bikes/${bikeId}`, { params });
      return res.data.data;
    },
    enabled: !!bikeId,
  });
}
