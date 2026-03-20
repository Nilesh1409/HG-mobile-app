import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import api from '../lib/api';
import queryClient from '../lib/queryClient';

interface AddHostelToCartParams {
  hostelId: string;
  roomType: string;
  mealOption: 'bedOnly' | 'bedAndBreakfast' | 'bedBreakfastAndDinner';
  quantity: number;
  checkIn: string;
  checkOut: string;
  isWorkstation?: boolean;
}

interface UpdateHostelCartParams {
  itemId: string;
  quantity: number;
}

interface RemoveHostelCartParams {
  itemId: string;
}

export function useHostelCartMutations() {
  const addToCartMutation = useMutation({
    mutationFn: (params: AddHostelToCartParams) =>
      api.post('/cart/hostels', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.message ?? 'Failed to add to cart',
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: UpdateHostelCartParams) =>
      api.put(`/cart/hostels/${itemId}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.message ?? 'Failed to update cart',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ itemId }: RemoveHostelCartParams) =>
      api.delete(`/cart/hostels/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.message ?? 'Failed to remove from cart',
      });
    },
  });

  return { addToCartMutation, updateQuantityMutation, removeMutation };
}
