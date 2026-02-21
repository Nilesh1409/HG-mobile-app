import { create } from 'zustand';
import type { Cart } from '../types/cart.types';

interface CartState {
  cart: Cart | null;
  itemCount: number;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
}

const computeItemCount = (cart: Cart): number => {
  const bikeCount = cart.bikeItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const hostelCount = cart.hostelItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return bikeCount + hostelCount;
};

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  itemCount: 0,

  setCart: (cart) => {
    set({ cart, itemCount: computeItemCount(cart) });
  },

  clearCart: () => {
    set({ cart: null, itemCount: 0 });
  },
}));
