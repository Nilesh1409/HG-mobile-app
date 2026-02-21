export interface BikeSpec {
  cc?: string;
  fuel?: string;
  transmission?: string;
  mileage?: string;
}

export interface BikePricing {
  limited: {
    pricePerDay: number;
    kmLimit: number;
    extraKmCharge: number;
  };
  unlimited: {
    pricePerDay: number;
  };
}

export interface Bike {
  _id: string;
  name: string;
  brand: string;
  model: string;
  images: string[];
  specs: BikeSpec;
  pricing: BikePricing;
  description: string;
  location: string;
  isAvailable: boolean;
  helmetAvailable: boolean;
  helmetPrice: number;
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

export interface BikePriceDetails {
  basePrice: number;
  subtotal: number;
  bulkDiscount: {
    amount: number;
    percentage: number;
  };
  surgeMultiplier: number;
  extraCharges: number;
  helmetCharges: number;
  taxes: number;
  gstPercentage: number;
  discount: number;
  totalAmount: number;
}
