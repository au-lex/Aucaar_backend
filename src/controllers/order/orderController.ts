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
import { UserModel } from '../../models/users/user_model';
import { TransactionModel, generateTransactionId } from '../../models/transactions/transactions_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order Pending',
  processing: 'Payment Verified',
  in_delivery: 'Out for Delivery',
  completed: 'Delivered',
  cancelled: 'Order Cancelled',
};

// Recomputes a car's rating/reviewCount from every order review left against it
const syncCarRating = async (carId: Types.ObjectId) => {
  const stats = await OrderModel.aggregate([
    { $match: { car: carId, review: { $exists: true } } },
    {
      $group: {
        _id: '$car',
        avgRating: { $avg: '$review.rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const { avgRating = 0, count = 0 } = stats[0] ?? {};

  await CarModel.findByIdAndUpdate(carId, {
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: count,
  });
};

// ---------- CREATE ORDER
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { carId, colorName, colorHex, shippingAddress, shipping, tax = 0 } = req.body;

    if (!carId || !isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: 'Valid carId is required' });
    }
    if (!shippingAddress?.title || !shippingAddress?.address) {
      return res.status(400).json({ success: false, message: 'shippingAddress is required' });
    }
    if (!shipping?.title || !shipping?.estArrival) {
      return res.status(400).json({ success: false, message: 'shipping option is required' });
    }

    const car = await CarModel.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const priceValue = parseFloat(car.price.replace(/[^0-9.]/g, '')) || 0;
    const shippingPrice = typeof shipping.price === 'number' ? shipping.price : 0;
    const totalPrice = priceValue + tax + shippingPrice;

    const order = await OrderModel.create({
      user: userId,
      car: car._id,
      name: car.name,
      imageUrl: car.imagePath,
      colorName: colorName || 'Default',
      colorHex: colorHex || (car.availableColors[0] ?? '#CCCCCC'),
      price: priceValue,
      shippingAddress,
      shipping: { ...shipping, price: shippingPrice },
      tax,
      totalPrice,
      paymentMethod: 'wallet',
      paymentStatus: 'unpaid',
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

// ---------- CHECKOUT CART
export const checkoutCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { shippingAddress, shipping, tax = 0 } = req.body;

    if (!shippingAddress?.title || !shippingAddress?.address) {
      return res.status(400).json({ success: false, message: 'shippingAddress is required' });
    }
    if (!shipping?.title || !shipping?.estArrival) {
      return res.status(400).json({ success: false, message: 'shipping option is required' });
    }

    const cart = await CartModel.findOne({ user: userId }).populate('items.car');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const shippingPrice = typeof shipping.price === 'number' ? shipping.price : 0;

    const orders = await Promise.all(
      cart.items.map(async (item) => {
        const car = item.car as any;
        const priceValue = parseFloat((car.price as string).replace(/[^0-9.]/g, '')) || 0;
        const itemPrice = priceValue * item.quantity;

        return OrderModel.create({
          user: userId,
          car: car._id,
          name: car.name,
          imageUrl: car.imagePath,
          colorName: car.availableColors?.[0] ? 'Default' : 'Default',
          colorHex: car.availableColors?.[0] ?? '#CCCCCC',
          price: itemPrice,
          shippingAddress,
          shipping: { ...shipping, price: shippingPrice },
          tax,
          totalPrice: itemPrice + tax + shippingPrice,
          paymentMethod: 'wallet',
          paymentStatus: 'unpaid',
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

// ---------- GET MY ORDERS
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
    const { status, location } = req.body as { status: OrderStatus; location?: string };

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

    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    order.trackingSteps.unshift({
      title: STATUS_LABELS[status],
      location: location || 'Logistics',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date(),
    });
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ---------- ADD TRACKING STEP (admin/ops action — for custom notes without changing status) ----------
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

    // Keep the car's aggregate rating/reviewCount in sync with order reviews
    await syncCarRating(order.car);

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

// ---------- CONFIRM PAYMENT (PIN entry -> "Order Successful"; always debits wallet) ----------
export const confirmPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { pin } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ success: false, message: 'pin is required' });
    }

    const order = await OrderModel.findOne({ _id: id, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const user = await UserModel.findById(userId).select('+transactionPin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.transactionPin) {
      return res
        .status(400)
        .json({ success: false, message: 'No transaction PIN set on this account' });
    }

    const pinMatches = await user.comparePin(pin);
    if (!pinMatches) {
      return res.status(401).json({ success: false, message: 'Incorrect PIN' });
    }

    if (user.walletBalance < order.totalPrice) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_WALLET_BALANCE',
        message: 'Insufficient wallet balance. Please fund your wallet to continue.',
        data: { balance: user.walletBalance, required: order.totalPrice },
      });
    }

    user.walletBalance -= order.totalPrice;
    await user.save();

    order.paymentStatus = 'paid';
    order.status = 'processing';
    await order.save();

    await TransactionModel.create({
      user: userId,
      type: 'order_payment',
      title: order.name,
      amount: order.totalPrice,
      method: 'wallet',
      status: 'paid',
      transactionId: generateTransactionId(),
      order: order._id,
      imageUrl: order.imageUrl,
    });

    return res.status(200).json({
      success: true,
      data: { order, balance: user.walletBalance },
    });
  } catch (err) {
    next(err);
  }
};