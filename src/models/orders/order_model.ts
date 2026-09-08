// models/order.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'in_delivery'
  | 'completed'
  | 'cancelled';

export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'processing', 'in_delivery'];
export const COMPLETED_STATUSES: OrderStatus[] = ['completed'];

export interface ITrackingStep {
  title: string;
  location: string;
  date: string;
  time: string;
  createdAt: Date;
}

export interface IOrderReview {
  rating: number;
  review: string;
  createdAt: Date;
}

export type PaymentMethodType =
  | 'wallet'
  | 'paypal'
  | 'google_pay'
  | 'apple_pay'
  | 'card'
  | 'paystack';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed';


export interface IOrderShippingAddress {
  title: string;
  address: string;
}

export interface IOrderShipping {
  title: string;
  estArrival: string;
  price: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  car: Types.ObjectId;

  name: string;
  imageUrl: string;
  colorName: string;
  colorHex: string;
  price: number;

  shippingAddress: IOrderShippingAddress;
  shipping: IOrderShipping;
  tax: number;
  totalPrice: number;

  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  paystackReference?: string;

  status: OrderStatus;
  trackingSteps: ITrackingStep[];
  review?: IOrderReview;

  createdAt: Date;
  updatedAt: Date;
}

const TrackingStepSchema = new Schema<ITrackingStep>(
  {
    title: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderReviewSchema = new Schema<IOrderReview>(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderShippingAddressSchema = new Schema<IOrderShippingAddress>(
  {
    title: { type: String, required: true },
    address: { type: String, required: true },
  },
  { _id: false }
);

const OrderShippingSchema = new Schema<IOrderShipping>(
  {
    title: { type: String, required: true },
    estArrival: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    car: {
      type: Schema.Types.ObjectId,
      ref: 'Car',
      required: true,
    },

    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    colorName: { type: String, required: true },
    colorHex: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(v),
        message: 'colorHex must be a hex color string (e.g. #E8E8E8)',
      },
    },
    price: { type: Number, required: true, min: 0 },

    shippingAddress: { type: OrderShippingAddressSchema, required: true },
    shipping: { type: OrderShippingSchema, required: true },
    tax: { type: Number, required: true, default: 0, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ['wallet', 'paypal', 'google_pay', 'apple_pay', 'card', 'paystack'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed'],
      default: 'unpaid',
    },
    paystackReference: {
      type: String,
      index: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ['pending', 'processing', 'in_delivery', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    trackingSteps: {
      type: [TrackingStepSchema],
      default: [],
    },

    review: {
      type: OrderReviewSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);


OrderSchema.methods.currentStep = function (this: IOrder) {
  return this.trackingSteps[0];
};

export const OrderModel = model<IOrder>('Order', OrderSchema);