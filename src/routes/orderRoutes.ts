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
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', createOrder);
router.post('/checkout', checkoutCart);
router.get('/', getMyOrders); // ?group=active | ?group=completed
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus); // admin/ops
router.patch('/:id/tracking', addTrackingStep); // admin/ops
router.post('/:id/review', leaveReview);
router.patch('/:id/cancel', cancelOrder);

export default router;