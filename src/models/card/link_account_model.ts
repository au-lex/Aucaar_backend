// models/linked-account.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export type LinkedProvider = 'paypal' | 'google_pay' | 'apple_pay';

export interface ILinkedAccount extends Document {
  user: Types.ObjectId;
  provider: LinkedProvider;
  connected: boolean;
  externalAccountId?: string;
  connectedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const LinkedAccountSchema = new Schema<ILinkedAccount>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['paypal', 'google_pay', 'apple_pay'],
      required: true,
    },
    connected: { type: Boolean, default: false },
    externalAccountId: { type: String },
    connectedAt: { type: Date },
  },
  { timestamps: true }
);

LinkedAccountSchema.index({ user: 1, provider: 1 }, { unique: true });

export const LinkedAccountModel = model<ILinkedAccount>('LinkedAccount', LinkedAccountSchema);