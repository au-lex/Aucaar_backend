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
} from '../controllers/order/orderController';
import {
  initOrderPayment,
  verifyOrderPayment,
  confirmPayment,
} from '../controllers/paystack/paystackController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', createOrder);
router.post('/checkout', checkoutCart);
router.post('/:id/confirm-payment', confirmPayment); 
router.post('/:id/pay/paystack/init', initOrderPayment);
router.get('/:id/pay/paystack/verify', verifyOrderPayment);
router.get('/', getMyOrders); 
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus); 
router.patch('/:id/tracking', addTrackingStep); 
router.post('/:id/review', leaveReview);
router.patch('/:id/cancel', cancelOrder);

export default router;