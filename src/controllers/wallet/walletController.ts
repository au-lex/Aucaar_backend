// controllers/wallet.controller.ts
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { UserModel } from '../../models/users/user_model';
import {
  TransactionModel,
  generateTransactionId,
  TransactionType,
} from '../../models/transactions/transactions_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string =>
  typeof id === 'string' && Types.ObjectId.isValid(id);

// ---------- GET WALLET (balance + recent transactions, feeds EWalletPage) ----------
export const getWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const recentTransactions = await TransactionModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      data: {
        balance: user.walletBalance,
        hasPin: Boolean(user.transactionPin),
        recentTransactions,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- START TOP UP (amount chosen, before redirecting to Paystack) ----------
export const startTopUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    const transaction = await TransactionModel.create({
      user: userId,
      type: 'top_up' as TransactionType,
      title: 'Top Up Wallet',
      amount,
      method: 'paystack',
      status: 'pending',
      transactionId: generateTransactionId(),
    });

    return res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

// ---------- TRANSACTION HISTORY (feeds TransactionHistoryPage) ----------
export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query as { type?: TransactionType };

    const filter: Record<string, any> = { user: userId };
    if (type === 'top_up' || type === 'order_payment') {
      filter.type = type;
    }

    const transactions = await TransactionModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

// ---------- GET SINGLE TRANSACTION (feeds EReceiptPage) ----------
export const getTransactionById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction id' });
    }

    const transaction = await TransactionModel.findOne({ _id: id, user: userId }).populate(
      'order'
    );
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    return res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};