// routes/saved-card.routes.ts
import { Router } from 'express';
import {
  initAddCard,
  confirmAddCard,
  getSavedCards,
  setDefaultCard,
  deleteSavedCard,
} from '../controllers/card/cardController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getSavedCards);
router.post('/init', initAddCard);
router.post('/confirm', confirmAddCard);
router.patch('/:id/default', setDefaultCard);
router.delete('/:id', deleteSavedCard);

export default router;