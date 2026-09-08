// utils/paystack.ts
import axios from 'axios';
import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY as string;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface InitializeTransactionParams {
  email: string;
  amount: number; 
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: string; // 'success' | 'failed' | 'abandoned' etc
  reference: string;
  amount: number; // smallest currency unit
  currency: string;
  paid_at: string | null;
  channel: string;
  customer: { email: string };
  metadata: Record<string, any>;
}

// ---------- INITIALIZE TRANSACTION ----------
export const initializeTransaction = async (
  params: InitializeTransactionParams
): Promise<PaystackInitializeResponse> => {
  const { email, amount, reference, callbackUrl, metadata } = params;

  const { data } = await paystackClient.post('/transaction/initialize', {
    email,
    amount: Math.round(amount * 100), 
    reference,
    callback_url: callbackUrl,
    metadata,
  });

  if (!data.status) {
    throw new Error(data.message || 'Failed to initialize Paystack transaction');
  }

  return data.data as PaystackInitializeResponse;
};

// ---------- VERIFY TRANSACTION ----------
export const verifyTransaction = async (reference: string): Promise<PaystackVerifyResponse> => {
  const { data } = await paystackClient.get(`/transaction/verify/${encodeURIComponent(reference)}`);

  if (!data.status) {
    throw new Error(data.message || 'Failed to verify Paystack transaction');
  }

  return data.data as PaystackVerifyResponse;
};

// ---------- VERIFY WEBHOOK SIGNATURE ----------

export const isValidPaystackSignature = (rawBody: Buffer, signatureHeader?: string): boolean => {
  if (!signatureHeader) return false;

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  return hash === signatureHeader;
};

export const generatePaymentReference = (prefix: string) => {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};