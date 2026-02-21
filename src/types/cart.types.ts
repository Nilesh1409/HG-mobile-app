import type { RoomType, MealOption } from './hostel.types';

export interface CartBikeItem {
  _id: string;
  bike: {
    _id: string;
    id?: string;
    title: string;
    name?: string; // fallback
    brand: string;
    images: string[];
    availableQuantity?: number;
    pricePerDay?: {
      weekday?: {
        limitedKm?: { kmLimit?: number };
        unlimited?: { price?: number };
      };
      weekend?: {
        limitedKm?: { kmLimit?: number };
      };
    };
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
  numberOfNights?: number;
  checkIn: string;
  checkOut: string;
  people: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface CartPricing {
  subtotal: number;
  bulkDiscount: {
    amount: number;
    percentage: number;
  };
  surgeMultiplier?: number;
  extraCharges?: number;
  gst: number;
  gstPercentage: number;
  total: number;
  // legacy field support
  totalAmount?: number;
  helmetCharges?: number;
  discount?: number;
}

export interface CartHelmetDetails {
  quantity: number;
  charges: number;
  message?: string;
}

export interface CartBikeDates {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface CartHostelDates {
  checkIn: string;
  checkOut: string;
}

export interface Cart {
  _id: string;
  userId?: string;
  bikeItems: CartBikeItem[];
  hostelItems: CartHostelItem[];
  helmetDetails?: CartHelmetDetails;
  helmetQuantity?: number;     // legacy
  helmetCharges?: number;      // legacy
  bikeDates?: CartBikeDates;
  hostelDates?: CartHostelDates;
  pricing?: CartPricing;
  priceBreakdown?: {            // legacy
    subtotal: number;
    discount: number;
    gst: number;
    helmetCharges: number;
    totalAmount: number;
  };
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

// Helper: get cart total from either pricing.total or priceBreakdown.totalAmount
export const getCartTotal = (cart: Cart): number =>
  cart.pricing?.total ?? cart.pricing?.totalAmount ?? cart.priceBreakdown?.totalAmount ?? 0;

// Helper: get helmet quantity
export const getHelmetQty = (cart: Cart): number =>
  cart.helmetDetails?.quantity ?? cart.helmetQuantity ?? 0;

// Helper: get km limit label
export const getKmLabel = (item: CartBikeItem): string => {
  if (item.kmOption === 'unlimited') return 'Unlimited KM';
  const weekdayLimit = item.bike?.pricePerDay?.weekday?.limitedKm?.kmLimit;
  const weekendLimit = item.bike?.pricePerDay?.weekend?.limitedKm?.kmLimit;
  const limit = weekdayLimit ?? weekendLimit ?? 0;
  return limit > 0 ? `${limit} KM Limited` : '100 KM Limited';
};
