export type RoomType = 'dormitory' | 'private';
export type MealOption = 'bedOnly' | 'bedAndBreakfast' | 'bedBreakfastAndDinner';
export type StayType = 'overnight' | 'dayuse';

export interface HostelAmenity {
  name: string;
  icon?: string;
}

export interface HostelRoomPricing {
  roomType: RoomType;
  mealOption: MealOption;
  pricePerNight: number;
  pricePerPerson: number;
}

export interface Hostel {
  _id: string;
  name: string;
  images: string[];
  location: string;
  address: string;
  description: string;
  amenities: HostelAmenity[];
  pricing: HostelRoomPricing[];
  checkInTime: string;
  checkOutTime: string;
  rating?: number;
  reviewCount?: number;
}

export interface HostelSearchParams {
  checkIn: string;
  checkOut: string;
  people: number;
  location?: string;
  stayType?: StayType;
}
