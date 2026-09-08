// routes/linked-account.routes.ts
import { Router } from 'express';
import {
  getLinkedAccounts,
  connectAccount,
  disconnectAccount,
} from '../controllers/card/linke_accController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getLinkedAccounts);
router.post('/connect', connectAccount);
router.delete('/:provider', disconnectAccount);

export default router;