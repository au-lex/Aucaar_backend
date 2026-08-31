// models/wishlist.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IWishlist extends Document {
  user: Types.ObjectId;
  cars: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    cars: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Car',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const WishlistModel = model<IWishlist>('Wishlist', WishlistSchema);