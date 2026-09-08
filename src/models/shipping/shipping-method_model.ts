// models/shipping-method.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IShippingMethod extends Document {
  title: string; // e.g. "Truck", "Train", "Container Ship", "Plane"
  icon: string; // icon key the client maps to a Flutter IconData
  estArrival: string; // e.g. "Dec 20-23"
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingMethodSchema = new Schema<IShippingMethod>(
  {
    title: { type: String, required: true, trim: true, unique: true },
    icon: { type: String, required: true },
    estArrival: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ShippingMethodModel = model<IShippingMethod>(
  'ShippingMethod',
  ShippingMethodSchema
);