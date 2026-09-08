// routes/address.routes.ts
import { Router } from 'express';
import {
  createAddress,
  getAddresses,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from '../controllers/shipping/addressController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getAddresses);
router.post('/', createAddress);
router.patch('/:id', updateAddress);
router.patch('/:id/default', setDefaultAddress);
router.delete('/:id', deleteAddress);

export default router;