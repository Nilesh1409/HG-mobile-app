import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Cart } from '../types/cart.types';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';

export function useCart() {
  const { token } = useAuthStore();
  const { setCart } = useCartStore();

  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Cart }>('/cart/details');
      setCart(res.data.data);
      return res.data.data;
    },
    enabled: !!token,
  });
}
