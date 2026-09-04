// routes/wallet.routes.ts
import { Router } from 'express';
import {
  getWallet,
  startTopUp,
  confirmTopUp,
  getTransactions,
  getTransactionById,
} from '../controllers/wallet/walletController';
import { initTopUpPayment, verifyTopUpPayment } from '../controllers/paystack/paystackController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getWallet);
router.post('/top-up', startTopUp);
router.post('/top-up/:id/confirm', confirmTopUp);
router.post('/top-up/:id/pay/paystack/init', initTopUpPayment);
router.get('/top-up/:id/pay/paystack/verify', verifyTopUpPayment);
router.get('/transactions', getTransactions); 
router.get('/transactions/:id', getTransactionById);

export default router;