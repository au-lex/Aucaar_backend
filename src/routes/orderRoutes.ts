// routes/order.routes.ts
import { Router } from 'express';
import {
  createOrder,
  checkoutCart,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  addTrackingStep,
  leaveReview,
  cancelOrder,
  confirmPayment,
} from '../controllers/order/orderController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', createOrder);
router.post('/checkout', checkoutCart);
router.post('/:id/confirm-payment', confirmPayment); 
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/tracking', addTrackingStep);
router.post('/:id/review', leaveReview);
router.patch('/:id/cancel', cancelOrder);

export default router;