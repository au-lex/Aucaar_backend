// routes/user.routes.ts
import { Router } from 'express';
import {
  getMe,
  updateProfile,
  updateSecuritySettings,
  changePassword,
  setTransactionPin,
} from '../controllers/user/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/me', getMe);
router.patch('/me', updateProfile);
router.patch('/security', updateSecuritySettings);
router.post('/change-password', changePassword);
router.post('/pin', setTransactionPin);

export default router;