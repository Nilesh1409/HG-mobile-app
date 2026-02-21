export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  OTPVerify: { mobile: string; isNewUser?: boolean };
  Register: { mobile?: string } | undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  BookingsTab: undefined;
  HostelTab: undefined;
  ReferEarnTab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  // Bike search results (pushed from HomeTab search)
  BikeSearch: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location?: string;
  };
  BikeDetail: {
    bikeId: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
  HostelDetail: {
    hostelId: string;
    checkIn?: string;
    checkOut?: string;
    people?: number;
  };
  Cart: undefined;
  Checkout: undefined;
  PaymentProcessing: {
    razorpayOrderId?: string;
    razorpayAmount?: number;
    razorpayCurrency?: string;
    paymentGroupId?: string;
    bookingId?: string;
    paymentType: 'partial' | 'full' | 'remaining';
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
  };
  BookingSuccess: { paymentGroupId: string };
  BookingDetail: { bookingId: string };
  ExtendBooking: { bookingId: string };
  AadhaarVerify: { bookingId?: string };
  UploadDL: { bookingId?: string };
  Referral: undefined;
  EditProfile: undefined;
  Search: undefined;
  // Legacy (keep for backward compat)
  ExploreTab: {
    tab?: 'bikes' | 'hostels';
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    checkIn?: string;
    checkOut?: string;
    people?: number;
  };
};
