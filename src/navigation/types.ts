export type AuthStackParamList = {
  Welcome: undefined;
  Register: undefined;
  Login: undefined;
  OTPVerify: { mobile: string; isNewUser?: boolean };
};

export type MainTabParamList = {
  HomeTab: undefined;
  ExploreTab: {
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    tab?: 'bikes' | 'hostels';
    checkIn?: string;
    checkOut?: string;
    people?: number;
  } | undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
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
    bookingId: string;
    paymentGroupId?: string;
    paymentType: 'partial' | 'full' | 'remaining';
  };
  BookingSuccess: { paymentGroupId: string };
  BookingDetail: { bookingId: string };
  ExtendBooking: { bookingId: string };
  AadhaarVerify: { bookingId?: string };
  UploadDL: { bookingId?: string };
  Referral: undefined;
  EditProfile: undefined;
  Search: undefined;
};
