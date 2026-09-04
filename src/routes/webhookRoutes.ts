// routes/webhook.routes.ts
import { Router, raw } from 'express';
import { handlePaystackWebhook } from '../controllers/paystack/paystackController';

const router = Router();


router.post('/paystack', raw({ type: 'application/json' }), handlePaystackWebhook);

export default router;