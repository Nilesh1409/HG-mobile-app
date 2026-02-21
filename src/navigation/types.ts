export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  OTPVerify: { mobile: string; isNewUser?: boolean };
  Register: { mobile?: string } | undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  BookingsTab: undefined;
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
  } | undefined;
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
    // For cart checkout — Razorpay order pre-created by /bookings/cart
    razorpayOrderId?: string;
    razorpayAmount?: number;
    razorpayCurrency?: string;
    paymentGroupId?: string;
    // For individual booking payment — order created by /payments/booking/:id
    bookingId?: string;
    paymentType: 'partial' | 'full' | 'remaining';
    // Guest details for Razorpay prefill
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
};
