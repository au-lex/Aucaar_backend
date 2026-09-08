// models/transaction.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export type TransactionType = 'top_up' | 'order_payment';
export type TransactionStatus = 'pending' | 'paid' | 'failed';

export interface ITransaction extends Document {
  user: Types.ObjectId;
  type: TransactionType;
  title: string; // "Top Up Wallet" 
  amount: number;
  method: string; // 'wallet' | 'paypal' | 'google_pay' | 'apple_pay' | 'card'
  status: TransactionStatus;
  transactionId: string; 

  order?: Types.ObjectId; 
  imageUrl?: string; // car image, for the transaction list icon
  paystackReference?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['top_up', 'order_payment'],
      required: true,
    },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    imageUrl: { type: String },
    paystackReference: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

export const generateTransactionId = () => {
  const digits = Math.floor(1000000000 + Math.random() * 9000000000);
  return `SK${digits}`;
};

export const TransactionModel = model<ITransaction>('Transaction', TransactionSchema);