// controllers/notification.controller.ts
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { NotificationModel } from '../../models/notifications/notification_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

// ---------- LIST ----------
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { unreadOnly, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, any> = { user: userId };
    if (unreadOnly === 'true') filter.read = false;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments({ user: userId, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- MARK ONE AS READ ----------
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// ---------- MARK ALL AS READ ----------
export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    await NotificationModel.updateMany({ user: userId, read: false }, { $set: { read: true } });

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// ---------- DELETE ----------
export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }

    const notification = await NotificationModel.findOneAndDelete({ _id: id, user: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

// ---------- CLEAR ALL ----------
export const clearAllNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await NotificationModel.deleteMany({ user: userId });
    return res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    next(err);
  }
};