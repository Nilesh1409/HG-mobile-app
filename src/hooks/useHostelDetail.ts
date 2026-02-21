import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Hostel, HostelSearchParams } from '../types/hostel.types';

export function useHostelDetail(hostelId: string, params?: Partial<HostelSearchParams>) {
  return useQuery({
    queryKey: ['hostel', hostelId, params],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel }>(`/hostels/${hostelId}`, { params });
      return res.data.data;
    },
    enabled: !!hostelId,
  });
}
