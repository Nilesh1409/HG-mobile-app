export type StayType = 'hostel' | 'workstation';
export type MealOption = 'bedOnly' | 'bedAndBreakfast' | 'bedBreakfastAndDinner';

// Legacy — kept for backward compat with HostelDetailScreen old approach
export type RoomType = string;

export interface HostelAmenity {
  name: string;
  icon?: string;
  description?: string;
}

// Pricing for a single meal-option on a room (returned by /api/hostels/available)
export interface MealOptionPricing {
  totalPrice: number;
  originalPrice?: number;
  pricePerNight: number;
  discountApplied?: boolean;
  savings?: number;
}

export interface CalculatedPricing {
  bedOnly?: MealOptionPricing;
  bedAndBreakfast?: MealOptionPricing;
  bedBreakfastAndDinner?: MealOptionPricing;
}

export interface HostelRoom {
  _id?: string;
  type: string;
  capacity?: number;
  availableBeds: number;
  availableRooms?: number;
  amenities?: string[];
  images?: string[];
  description?: string;
  calculatedPricing?: CalculatedPricing;
}

export interface HostelPolicies {
  checkIn?: string[];
  house?: string[];
  cancellation?: string[];
}

export interface HostelContactInfo {
  phone?: string;
  email?: string;
}

export interface Hostel {
  _id: string;
  name: string;
  images: string[];
  location: string;
  address?: string;
  description?: string;
  amenities: HostelAmenity[];
  rooms?: HostelRoom[];
  // Legacy pricing array — used by old HostelDetailScreen
  pricing?: {
    roomType: string;
    mealOption: MealOption;
    pricePerNight: number;
    pricePerPerson: number;
  }[];
  checkInTime?: string;
  checkOutTime?: string;
  rating?: number;
  ratings?: number;
  reviewCount?: number;
  supportsWorkstation?: boolean;
  policies?: HostelPolicies;
  contactInfo?: HostelContactInfo;
  bookingDetails?: {
    nights?: number;
  };
}

export interface HostelSearchParams {
  checkIn: string;
  checkOut: string;
  people: number;
  location?: string;
  stayType?: StayType;
}
