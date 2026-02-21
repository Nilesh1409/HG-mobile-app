export interface BikeKmPrice {
  price: number;
  kmLimit?: number;
  isActive: boolean;
}

export interface BikePriceDay {
  limitedKm: BikeKmPrice;
  unlimited: { price: number; isActive: boolean };
}

export interface BikePricePerDay {
  weekday: BikePriceDay;
  weekend: BikePriceDay;
}

export interface BulkDiscounts {
  twoOrMore: number;
  threeToFour: number;
  fiveOrMore: number;
}

export interface PriceBreakdown {
  type: string;
  duration: string;
  basePrice: number;
  quantity: number;
  pricePerUnit: number;
  extraCharges: number;
  subtotal: number;
  bulkDiscount: { percentage: number; amount: number };
  specialPricing: null | object;
  gst: number;
  gstPercentage: number;
  total: number;
}

export interface CalculatedPrice {
  totalPrice: number;
  breakdown: PriceBreakdown;
  isWeekendBooking: boolean;
}

export interface Bike {
  _id: string;
  id: string;
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  images: string[];
  pricePerDay: BikePricePerDay;
  bulkDiscounts: BulkDiscounts;
  additionalKmPrice: number;
  isAvailable: boolean;
  isTrending: boolean;
  location: string;
  availableQuantity: number;
  totalQuantity: number;
  bookedQuantity: number;
  extraAmount: number;
  priceLimited: CalculatedPrice | null;
  priceUnlimited: CalculatedPrice | null;
  searchPeriod?: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  };
  ratings?: number;
  numReviews?: number;
  status?: string;
}

export interface BikeSearchParams {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface BikeDetailParams extends BikeSearchParams {
  kmOption?: 'limited' | 'unlimited';
}

export const DEFAULT_LOCATION = 'Chikkamagaluru';
