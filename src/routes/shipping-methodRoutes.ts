// routes/shipping-method.routes.ts
import { Router } from 'express';
import {
  getShippingMethods,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
} from '../controllers/shipping/shipping-methodController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getShippingMethods);
router.post('/', createShippingMethod); // admin/ops — see note below
router.patch('/:id', updateShippingMethod); // admin/ops
router.delete('/:id', deleteShippingMethod); // admin/ops

export default router;