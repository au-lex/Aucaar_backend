// controllers/paystack.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { TransactionModel, TransactionType } from '../../models/transactions/transactions_model';
import { UserModel } from '../../models/users/user_model';
import {
  initializeTransaction,
  verifyTransaction,
  isValidPaystackSignature,
  generatePaymentReference,
} from '../../service/paystack';
import { AuthRequest } from '../../middleware/authMiddleware';

const isValidObjectId = (id: unknown): id is string =>
  typeof id === 'string' && Types.ObjectId.isValid(id);
const CALLBACK_BASE_URL = process.env.PAYSTACK_CALLBACK_URL;


// ---------- INIT PAYSTACK PAYMENT FOR A WALLET TOP-UP ----------
export const initTopUpPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction id' });
    }

    const transaction = await TransactionModel.findOne({
      _id: id,
      user: userId,
      type: 'top_up',
    });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (transaction.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Transaction already completed' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const reference = generatePaymentReference('topup');

    const paystackData = await initializeTransaction({
      email: user.email,
      amount: transaction.amount,
      reference,
      callbackUrl: CALLBACK_BASE_URL,
      metadata: { transactionId: transaction._id.toString(), userId, type: 'top_up' },
    });

    transaction.method = 'paystack';
    transaction.paystackReference = reference;
    await transaction.save();

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

// ---------- VERIFY PAYSTACK PAYMENT FOR A WALLET TOP-UP ----------
export const verifyTopUpPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction id' });
    }

    const transaction = await TransactionModel.findOne({
      _id: id,
      user: userId,
      type: 'top_up',
    });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (transaction.status === 'paid') {
      return res.status(200).json({ success: true, data: transaction });
    }
    if (!transaction.paystackReference) {
      return res.status(400).json({
        success: false,
        message: 'No Paystack payment has been initiated for this transaction',
      });
    }

    const verification = await verifyTransaction(transaction.paystackReference);

    if (verification.status !== 'success') {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(400).json({
        success: false,
        message: `Payment not successful (status: ${verification.status})`,
      });
    }

    const balance = await markTopUpPaid(transaction);

    return res.status(200).json({ success: true, data: { transaction, balance } });
  } catch (err) {
    next(err);
  }
};

// ---------- WEBHOOK (top-ups only) ----------
export const handlePaystackWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string | undefined;
  const rawBody = req.body as Buffer;

  if (!isValidPaystackSignature(rawBody, signature)) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  res.status(200).json({ received: true });

  try {
    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.event !== 'charge.success') return;

    const metadata = event.data.metadata || {};

    if (metadata.type === 'top_up' && metadata.transactionId) {
      const transaction = await TransactionModel.findById(metadata.transactionId);
      if (transaction && transaction.status !== 'paid') {
        await markTopUpPaid(transaction);
      }
    }
  } catch (err) {
    // Already responded 200 above; log for investigation rather than throwing
    console.error('Paystack webhook processing error:', err);
  }
};

// ---------- shared helper ----------

async function markTopUpPaid(transaction: InstanceType<typeof TransactionModel>) {
  const user = await UserModel.findById(transaction.user);
  if (!user) throw new Error('User not found for transaction');

  user.walletBalance += transaction.amount;
  await user.save();

  transaction.status = 'paid';
  await transaction.save();

  return user.walletBalance;
}