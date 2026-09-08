// utils/notify.ts
import { NotificationModel, NotificationType } from '../models/notifications/notification_model';
import { Types } from 'mongoose';

interface NotifyParams {
  user: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  body: string;
  order?: Types.ObjectId | string;
  transaction?: Types.ObjectId | string;
}


export const notify = async (params: NotifyParams) => {
  try {
    await NotificationModel.create(params);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};