// controllers/order.controller.ts
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  OrderModel,
  ACTIVE_STATUSES,
  COMPLETED_STATUSES,
  OrderStatus,
} from '../../models/orders/order_model';
import { CarModel } from '../../models/vehicles/vehicle_model';
import { CartModel } from '../../models/cart/cart_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

// ---------- CREATE ORDER (single car, e.g. "Buy now") ----------
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId, colorName, colorHex } = req.body;

    if (!carId || !isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Valid carId is required' });
    }

    const car = await CarModel.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const priceValue = parseFloat(car.price.replace(/[^0-9.]/g, '')) || 0;

    const order = await OrderModel.create({
      user: userId,
      car: car._id,
      name: car.name,
      imageUrl: car.imagePath,
      colorName: colorName || 'Default',
      colorHex: colorHex || (car.availableColors[0] ?? '#CCCCCC'),
      price: priceValue,
      status: 'pending',
      trackingSteps: [
        {
          title: 'Verified Payments',
          location: 'Users',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    });

    return res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- CHECKOUT CART (turn every cart item into an order, then clear cart) ----------
export const checkoutCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const cart = await CartModel.findOne({ user: userId }).populate('items.car');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const orders = await Promise.all(
      cart.items.map(async (item) => {
        const car = item.car as any;
        const priceValue = parseFloat((car.price as string).replace(/[^0-9.]/g, '')) || 0;

        return OrderModel.create({
          user: userId,
          car: car._id,
          name: car.name,
          imageUrl: car.imagePath,
          colorName: car.availableColors?.[0] ? 'Default' : 'Default',
          colorHex: car.availableColors?.[0] ?? '#CCCCCC',
          price: priceValue * item.quantity,
          status: 'pending',
          trackingSteps: [
            {
              title: 'Verified Payments',
              location: 'Users',
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        });
      })
    );

    cart.items = [];
    await cart.save();

    return res.status(201).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

// ---------- GET MY ORDERS (grouped active/completed, matches the two Flutter tabs) ----------
export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { group } = req.query as { group?: 'active' | 'completed' };

    const filter: Record<string, any> = { user: userId };

    if (group === 'active') {
      filter.status = { $in: ACTIVE_STATUSES };
    } else if (group === 'completed') {
      filter.status = { $in: COMPLETED_STATUSES };
    }

    const orders = await OrderModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

// ---------- GET ORDER BY ID ----------
export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }

    const order = await OrderModel.findOne({ _id: id, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE ORDER STATUS (admin/ops action) ----------
export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: OrderStatus };

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }

    const validStatuses: OrderStatus[] = [
      'pending',
      'processing',
      'in_delivery',
      'completed',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ---------- ADD TRACKING STEP (admin/ops action, drives the Track Order screen) ----------
export const addTrackingStep = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, location, date, time } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }
    if (!title || !location || !date || !time) {
      return res
        .status(400)
        .json({ success: false, message: 'title, location, date and time are required' });
    }

    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Newest step goes first, matching how the Flutter UI displays trackingSteps[0] as current
    order.trackingSteps.unshift({ title, location, date, time, createdAt: new Date() });
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ---------- LEAVE REVIEW ----------
export const leaveReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'rating must be a number 1-5' });
    }

    const order = await OrderModel.findOne({ _id: id, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'completed') {
      return res
        .status(400)
        .json({ success: false, message: 'Only completed orders can be reviewed' });
    }

    order.review = { rating, review: review || '', createdAt: new Date() };
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ---------- CANCEL ORDER ----------
export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }

    const order = await OrderModel.findOne({ _id: id, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      return res
        .status(400)
        .json({ success: false, message: `Order already ${order.status}, cannot cancel` });
    }

    order.status = 'cancelled';
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};