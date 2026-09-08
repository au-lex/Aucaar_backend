// controllers/address.controller.ts
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AddressModel } from '../../models/shipping/addressModel';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string =>
  typeof id === 'string' && Types.ObjectId.isValid(id);

// ---------- CREATE ----------
export const createAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, address, isDefault } = req.body;

    if (!title || !address) {
      return res.status(400).json({ success: false, message: 'title and address are required' });
    }

    if (isDefault) {
      await AddressModel.updateMany({ user: userId }, { $set: { isDefault: false } });
    }

    const existingCount = await AddressModel.countDocuments({ user: userId });

    const doc = await AddressModel.create({
      user: userId,
      title,
      address,
      // first address a user adds becomes default automatically
      isDefault: isDefault || existingCount === 0,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- LIST ----------
export const getAddresses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const addresses = await AddressModel.find({ user: userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });
    return res.status(200).json({ success: true, data: addresses });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE ----------
export const updateAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, address } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid address id' });
    }

    const doc = await AddressModel.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { ...(title && { title }), ...(address && { address }) } },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// ---------- SET DEFAULT ----------
export const setDefaultAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid address id' });
    }

    const target = await AddressModel.findOne({ _id: id, user: userId });
    if (!target) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await AddressModel.updateMany({ user: userId }, { $set: { isDefault: false } });
    target.isDefault = true;
    await target.save();

    return res.status(200).json({ success: true, data: target });
  } catch (err) {
    next(err);
  }
};

// ---------- DELETE ----------
export const deleteAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid address id' });
    }

    const doc = await AddressModel.findOneAndDelete({ _id: id, user: userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // Promote another address to default if the deleted one was default
    if (doc.isDefault) {
      const next = await AddressModel.findOne({ user: userId }).sort({ createdAt: 1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    return res.status(200).json({ success: true, message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
};