// controllers/shipping-method.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ShippingMethodModel } from '../../models/shipping/shipping-method_model';

const isValidObjectId = (id: unknown): id is string =>
  typeof id === 'string' && Types.ObjectId.isValid(id);

// ---------- LIST (public/authenticated - what ChooseShippingPage renders) ----------
export const getShippingMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const methods = await ShippingMethodModel.find({ isActive: true }).sort({ price: 1 });
    return res.status(200).json({ success: true, data: methods });
  } catch (err) {
    next(err);
  }
};

// ---------- CREATE (admin/ops) ----------
export const createShippingMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, icon, estArrival, price } = req.body;

    if (!title || !icon || !estArrival || price === undefined) {
      return res
        .status(400)
        .json({ success: false, message: 'title, icon, estArrival and price are required' });
    }

    const doc = await ShippingMethodModel.create({ title, icon, estArrival, price });
    return res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Shipping method already exists' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- UPDATE (admin/ops) ----------
export const updateShippingMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const doc = await ShippingMethodModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Shipping method not found' });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- DELETE (admin/ops) ----------
export const deleteShippingMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const doc = await ShippingMethodModel.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Shipping method not found' });
    }

    return res.status(200).json({ success: true, message: 'Shipping method deleted' });
  } catch (err) {
    next(err);
  }
};