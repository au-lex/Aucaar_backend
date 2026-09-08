// controllers/saved-card.controller.ts
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { SavedCardModel } from '../../models/card/card_model';
import { UserModel } from '../../models/users/user_model';
import { initializeTransaction, verifyTransaction, generatePaymentReference } from '../../service/paystack';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string =>
  typeof id === 'string' && Types.ObjectId.isValid(id);


const CARD_VERIFICATION_AMOUNT = Number(process.env.CARD_VERIFICATION_AMOUNT ?? 1);

// ---------- START ADD CARD (returns a Paystack checkout URL, never touches raw card data) ----------
export const initAddCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const reference = generatePaymentReference('addcard');

    const paystackData = await initializeTransaction({
      email: user.email,
      amount: CARD_VERIFICATION_AMOUNT,
      reference,
      metadata: { userId, type: 'add_card' },
    });

    return res.status(200).json({
      success: true,
      data: {
        authorizationUrl: paystackData.authorization_url,
        reference: paystackData.reference,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- CONFIRM ADD CARD (client polls this after returning from Paystack checkout) ----------
export const confirmAddCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference is required' });
    }

    const verification = await verifyTransaction(reference);

    if (verification.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Card verification not successful (status: ${verification.status})`,
      });
    }

    const auth = (verification as any).authorization;
    if (!auth?.authorization_code || !auth.reusable) {
      return res
        .status(400)
        .json({ success: false, message: 'Card is not reusable for future charges' });
    }

    const existingCount = await SavedCardModel.countDocuments({ user: userId });

    const card = await SavedCardModel.findOneAndUpdate(
      { authorizationCode: auth.authorization_code },
      {
        user: userId,
        authorizationCode: auth.authorization_code,
        last4: auth.last4,
        cardType: auth.card_type,
        bank: auth.bank,
        expMonth: auth.exp_month,
        expYear: auth.exp_year,
        isDefault: existingCount === 0,
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
};

// ---------- LIST SAVED CARDS ----------
export const getSavedCards = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const cards = await SavedCardModel.find({ user: userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });
    return res.status(200).json({ success: true, data: cards });
  } catch (err) {
    next(err);
  }
};

// ---------- SET DEFAULT CARD ----------
export const setDefaultCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card id' });
    }

    const target = await SavedCardModel.findOne({ _id: id, user: userId });
    if (!target) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    await SavedCardModel.updateMany({ user: userId }, { $set: { isDefault: false } });
    target.isDefault = true;
    await target.save();

    return res.status(200).json({ success: true, data: target });
  } catch (err) {
    next(err);
  }
};

// ---------- DELETE CARD ----------
export const deleteSavedCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card id' });
    }

    const card = await SavedCardModel.findOneAndDelete({ _id: id, user: userId });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    if (card.isDefault) {
      const next = await SavedCardModel.findOne({ user: userId }).sort({ createdAt: 1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    return res.status(200).json({ success: true, message: 'Card removed' });
  } catch (err) {
    next(err);
  }
};