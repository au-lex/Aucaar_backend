// controllers/wishlist.controller.ts
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { WishlistModel } from '../../models/wishlist/wishlist_model';
import { CarModel } from '../../models/vehicles/vehicle_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

// ---------- ADD TO WISHLIST ----------
export const addToWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId } = req.body;

    if (!carId || !isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Valid carId is required' });
    }

    const car = await CarModel.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const wishlist = await WishlistModel.findOneAndUpdate(
      { user: userId },
      { $addToSet: { cars: carId } },
      { new: true, upsert: true }
    ).populate('cars');

    return res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
};

// ---------- REMOVE FROM WISHLIST ----------
export const removeFromWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId } = req.params;

    if (!isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Invalid carId' });
    }

    const wishlist = await WishlistModel.findOneAndUpdate(
      { user: userId },
      { $pull: { cars: carId } },
      { new: true }
    ).populate('cars');

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    return res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
};

// ---------- TOGGLE WISHLIST (add if absent, remove if present) ----------
export const toggleWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId } = req.body;

    if (!carId || !isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Valid carId is required' });
    }

    const car = await CarModel.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const carObjectId = new Types.ObjectId(carId);

    let wishlist = await WishlistModel.findOne({ user: userId });

    if (!wishlist) {
      wishlist = await WishlistModel.create({ user: userId, cars: [carObjectId] });
      const populated = await wishlist.populate('cars');
      return res.status(200).json({ success: true, inWishlist: true, data: populated });
    }

    const exists = wishlist.cars.some((c) => c.toString() === carId);

    if (exists) {
      wishlist.cars = wishlist.cars.filter((c) => c.toString() !== carId);
    } else {
      wishlist.cars.push(carObjectId);
    }

    await wishlist.save();
    const populated = await wishlist.populate('cars');

    return res.status(200).json({ success: true, inWishlist: !exists, data: populated });
  } catch (err) {
    next(err);
  }
};

// ---------- GET WISHLIST ----------
export const getWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const wishlist = await WishlistModel.findOne({ user: userId }).populate('cars');

    if (!wishlist) {
      return res.status(200).json({ success: true, data: { user: userId, cars: [] } });
    }

    return res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
};