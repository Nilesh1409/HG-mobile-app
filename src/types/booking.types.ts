import type { RoomType, MealOption } from './hostel.types';

export type BookingType = 'bike' | 'hostel' | 'combined';
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'pending';

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

export interface PaymentDetails {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  partialPaymentPercentage?: number;
}

export interface BikeBookingItem {
  bike: {
    _id: string;
    /** API returns `title`; older code may use `name` */
    title?: string;
    name?: string;
    brand: string;
    images: string[];
  };
  quantity: number;
  kmOption: 'limited' | 'unlimited';
  pricePerUnit: number;
  totalPrice: number;
  additionalKmPrice?: number;
}

export interface HostelObject {
  _id: string;
  name: string;
  images: string[];
  location: string;
}

export interface Booking {
  _id: string;
  user: string;
  bookingType: BookingType;
  /** API returns `bookingStatus`; `status` kept for backward compat */
  bookingStatus?: BookingStatus;
  status?: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentGroupId?: string;

  bikeItems?: BikeBookingItem[];
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  helmetQuantity?: number;
  priceDetails?: BookingPriceDetails;
  /** Actual payment amounts from API */
  paymentDetails?: PaymentDetails;

  /** API returns `hostel` (not `hostelId`) */
  hostel?: HostelObject;
  /** Legacy alias kept for compatibility */
  hostelId?: HostelObject;
  roomType?: RoomType;
  mealOption?: MealOption;
  checkIn?: string;
  checkOut?: string;
  numberOfBeds?: number;
  numberOfNights?: number;
  people?: number;

  guestDetails?: GuestDetails;
  specialRequests?: string;

  paidAmount?: number;
  totalAmount?: number;
  remainingAmount?: number;

  aadhaarVerified?: boolean;
  dlVerified?: boolean;

  createdAt: string;
  updatedAt?: string;
}

/** Combined booking wrapping two individual bookings (hostel + bike) */
export interface CombinedBooking {
  isCombined: true;
  bookingType: 'combined';
  paymentGroupId: string;
  bookings: Booking[];
  combinedDetails: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    bookingCount: number;
    types: BookingType[];
  };
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

export type AnyBooking = Booking | CombinedBooking;

export interface CartCheckoutRequest {
  guestDetails: GuestDetails;
  specialRequests?: string;
  partialPaymentPercentage: 25 | 100;
}

export interface ExtendBookingRequest {
  newEndDate: string;
  newEndTime: string;
}
