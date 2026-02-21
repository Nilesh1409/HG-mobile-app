export type PaymentType = 'partial' | 'full' | 'remaining';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface PaymentInitRequest {
  paymentType: PaymentType;
}

export interface RazorpayVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CartPaymentVerifyRequest extends RazorpayVerifyRequest {
  paymentGroupId: string;
}

export interface ReferralStat {
  _id: string;
  referredUser: {
    _id: string;
    name: string;
  };
  status: 'pending' | 'completed';
  rewardAmount: number;
  createdAt: string;
}

export interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalRewards: number;
  referrals: ReferralStat[];
}
