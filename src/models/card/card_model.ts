// models/saved-card.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ISavedCard extends Document {
  user: Types.ObjectId;


  authorizationCode: string;
  last4: string;
  cardType: string; // 'visa', 'mastercard', etc
  bank?: string;
  expMonth: string;
  expYear: string;

  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const SavedCardSchema = new Schema<ISavedCard>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorizationCode: { type: String, required: true, unique: true },
    last4: { type: String, required: true },
    cardType: { type: String, required: true },
    bank: { type: String },
    expMonth: { type: String, required: true },
    expYear: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SavedCardSchema.set('toJSON', {
  transform: (_doc, ret: any) => {

    delete ret.authorizationCode;
    return ret;
  },
});

export const SavedCardModel = model<ISavedCard>('SavedCard', SavedCardSchema);