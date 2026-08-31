// routes/wishlist.routes.ts
import { Router } from 'express';
import {
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlist,
} from '../controllers/wishlist/wishlistController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.post('/toggle', toggleWishlist);
router.delete('/:carId', removeFromWishlist);

export default router;