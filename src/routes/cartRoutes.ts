// routes/cart.routes.ts
import { Router } from 'express';
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart/cartController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.patch('/:carId', updateCartItem);
router.delete('/:carId', removeFromCart);
router.delete('/', clearCart);

export default router;