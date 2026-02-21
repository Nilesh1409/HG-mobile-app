import type { RoomType, MealOption } from './hostel.types';

export interface CartBikeItem {
  _id: string;
  bike: {
    _id: string;
    name: string;
    brand: string;
    images: string[];
  };
  quantity: number;
  kmOption: 'limited' | 'unlimited';
  pricePerUnit: number;
  totalPrice: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface CartHostelItem {
  _id: string;
  hostel: {
    _id: string;
    name: string;
    images: string[];
    location: string;
  };
  roomType: RoomType;
  mealOption: MealOption;
  quantity: number;
  checkIn: string;
  checkOut: string;
  people: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface CartPriceBreakdown {
  subtotal: number;
  discount: number;
  gst: number;
  helmetCharges: number;
  totalAmount: number;
}

export interface Cart {
  _id: string;
  user: string;
  bikeItems: CartBikeItem[];
  hostelItems: CartHostelItem[];
  helmetQuantity: number;
  helmetCharges: number;
  priceBreakdown: CartPriceBreakdown;
  updatedAt: string;
}

export interface AddBikeToCartRequest {
  bikeId: string;
  quantity: number;
  kmOption: 'limited' | 'unlimited';
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface AddHostelToCartRequest {
  hostelId: string;
  roomType: RoomType;
  mealOption: MealOption;
  quantity: number;
  checkIn: string;
  checkOut: string;
  people: number;
}
