import type { RoomType, MealOption } from './hostel.types';

export type BookingType = 'bike' | 'hostel';
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
}

export interface BookingPriceDetails {
  basePrice: number;
  subtotal: number;
  bulkDiscount: { amount: number; percentage: number };
  surgeMultiplier: number;
  extraCharges: number;
  helmetCharges: number;
  taxes: number;
  gstPercentage: number;
  discount: number;
  totalAmount: number;
}

export interface BikeBookingItem {
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
}

export interface Booking {
  _id: string;
  user: string;
  bookingType: BookingType;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentGroupId?: string;

  bikeItems?: BikeBookingItem[];
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  helmetQuantity?: number;
  priceDetails?: BookingPriceDetails;

  hostelId?: {
    _id: string;
    name: string;
    images: string[];
    location: string;
  };
  roomType?: RoomType;
  mealOption?: MealOption;
  checkIn?: string;
  checkOut?: string;
  people?: number;

  guestDetails?: GuestDetails;
  specialRequests?: string;

  paidAmount: number;
  totalAmount: number;
  remainingAmount: number;

  aadhaarVerified: boolean;
  dlVerified: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CartCheckoutRequest {
  guestDetails: GuestDetails;
  specialRequests?: string;
  partialPaymentPercentage: 25 | 100;
}

export interface ExtendBookingRequest {
  newEndDate: string;
  newEndTime: string;
}
