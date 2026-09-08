// controllers/linked-account.controller.ts
import { Response, NextFunction } from 'express';
import { LinkedAccountModel, LinkedProvider } from '../../models/card/link_account_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const PROVIDERS: LinkedProvider[] = ['paypal', 'google_pay', 'apple_pay'];

// ---------- LIST (feeds PaymentPage's "Connected" rows) ----------
export const getLinkedAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const existing = await LinkedAccountModel.find({ user: userId });
    const byProvider = new Map(existing.map((a) => [a.provider, a]));

    // Always return all three providers, connected: false for any the user hasn't linked yet
    const data = PROVIDERS.map(
      (provider) =>
        byProvider.get(provider) ?? { provider, connected: false, user: userId }
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ---------- CONNECT ----------
// NOTE: this is a stub. Real PayPal/Google Pay/Apple Pay linking goes through each
// provider's own OAuth/SDK flow on the client; the client would send back whatever
// account/token identifier that flow returns, and this just records "connected: true".
export const connectAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { provider, externalAccountId } = req.body;

    if (!PROVIDERS.includes(provider)) {
      return res
        .status(400)
        .json({ success: false, message: `provider must be one of: ${PROVIDERS.join(', ')}` });
    }

    const account = await LinkedAccountModel.findOneAndUpdate(
      { user: userId, provider },
      {
        connected: true,
        externalAccountId,
        connectedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

// ---------- DISCONNECT ----------
export const disconnectAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { provider } = req.params;

    if (!PROVIDERS.includes(provider as LinkedProvider)) {
      return res
        .status(400)
        .json({ success: false, message: `provider must be one of: ${PROVIDERS.join(', ')}` });
    }

    const account = await LinkedAccountModel.findOneAndUpdate(
      { user: userId, provider: provider as LinkedProvider },
      { connected: false, externalAccountId: undefined },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not linked' });
    }

    return res.status(200).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};