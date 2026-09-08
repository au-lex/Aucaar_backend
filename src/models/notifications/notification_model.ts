// models/notification.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'order_status'
  | 'payment'
  | 'wallet'
  | 'promo'
  | 'system';

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;

  order?: Types.ObjectId;
  transaction?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['order_status', 'payment', 'wallet', 'promo', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },

    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    transaction: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

export const NotificationModel = model<INotification>('Notification', NotificationSchema);