// controllers/cart.controller.ts
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { CartModel } from '../../models/cart/cart_model';
import { CarModel } from '../../models/vehicles/vehicle_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

// ---------- ADD TO CART ----------
export const addToCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId, quantity = 1 } = req.body;

    if (!carId || !isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Valid carId is required' });
    }

    const car = await CarModel.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const carObjectId = new Types.ObjectId(carId);

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      cart = await CartModel.create({
        user: userId,
        items: [{ car: carObjectId, quantity }],
      });
    } else {
      const existingItem = cart.items.find((item) => item.car.toString() === carId);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ car: carObjectId, quantity, addedAt: new Date() });
      }

      await cart.save();
    }

    const populated = await cart.populate('items.car');

    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ---------- GET CART ----------
export const getCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const cart = await CartModel.findOne({ user: userId }).populate('items.car');

    if (!cart) {
      return res.status(200).json({ success: true, data: { user: userId, items: [] } });
    }

    return res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE CART ITEM QUANTITY ----------
export const updateCartItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId } = req.params;
    const { quantity } = req.body;

    if (!isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Invalid carId' });
    }
    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ success: false, message: 'quantity must be a number >= 1' });
    }

    const cart = await CartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.find((i) => i.car.toString() === carId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }

    item.quantity = quantity;
    await cart.save();

    const populated = await cart.populate('items.car');

    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ---------- REMOVE ITEM FROM CART ----------
export const removeFromCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId } = req.params;

    if (!isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Invalid carId' });
    }

    const cart = await CartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const before = cart.items.length;
    cart.items = cart.items.filter((i) => i.car.toString() !== carId);

    if (cart.items.length === before) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }

    await cart.save();

    const populated = await cart.populate('items.car');

    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ---------- CLEAR CART ----------
export const clearCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const cart = await CartModel.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};