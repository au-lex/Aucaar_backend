import { Schema, model, Document, Types } from 'mongoose';

export interface ICar extends Document {
  name: string;
  brand: string;
  rating: number;
  reviewCount: number;
  condition: 'New' | 'Used';
  price: string;
  imagePath: string;
  positionImages: string[];
  galleryImages: string[];
  availableColors: string[]; 
  description: string;
  storeName: string;
  storeVerified: boolean;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CarSchema = new Schema<ICar>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    condition: {
      type: String,
      enum: ['New', 'Used'],
      required: true,
      index: true,
    },
    price: {
      type: String,
      required: true,
    },
    imagePath: {
      type: String,
      required: true,
    },
    positionImages: {
      type: [String],
      default: [],
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    availableColors: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) =>
          arr.every((c) => /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(c)),
        message: 'availableColors must be hex color strings (e.g. #E8E8E8)',
      },
    },
    description: {
      type: String,
      default:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore ',
    },
    storeName: {
      type: String,
      default: 'Official Store',
    },
    storeVerified: {
      type: Boolean,
      default: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtuals to mirror the Dart getters
CarSchema.virtual('priceValue').get(function (this: ICar) {
  const numeric = this.price.replace(/[^0-9.]/g, '');
  return parseFloat(numeric) || 0;
});

CarSchema.virtual('displayImages').get(function (this: ICar) {
  return this.positionImages.length > 0 ? this.positionImages : [this.imagePath];
});

CarSchema.set('toJSON', { virtuals: true });
CarSchema.set('toObject', { virtuals: true });

export const CarModel = model<ICar>('Car', CarSchema);