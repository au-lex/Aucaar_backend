
import { Response, NextFunction } from 'express';
import { UserModel } from '../../models/users/user_model';
import { AuthRequest } from '../../middleware/authMiddleware';

const ALLOWED_PROFILE_FIELDS = [
  'name',
  'nickname',
  'dateOfBirth',
  'country',
  'phone',
  'gender',
  'avatarUrl',
] as const;

// ---------- GET PROFILE ----------
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ---------- SET / CHANGE TRANSACTION PIN ----------

export const setTransactionPin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { currentPin, newPin } = req.body;

    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ success: false, message: 'newPin must be a 4-digit code' });
    }

    const user = await UserModel.findById(userId).select('+transactionPin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.transactionPin) {
      if (!currentPin) {
        return res
          .status(400)
          .json({ success: false, message: 'currentPin is required to change an existing PIN' });
      }
      const matches = await user.comparePin(currentPin);
      if (!matches) {
        return res.status(401).json({ success: false, message: 'Incorrect current PIN' });
      }
    }

    user.transactionPin = newPin; // hashed by the pre-save hook
    await user.save();

    return res.status(200).json({ success: true, message: 'Transaction PIN set' });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE PROFILE (EditProfilePage: name, nickname, dob, country, phone, gender, avatar) ----------

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const updates: Record<string, any> = {};
    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid profile fields provided' });
    }

    const user = await UserModel.findByIdAndUpdate(userId, { $set: updates }, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- UPDATE SECURITY SETTINGS (SecurityPage toggles) ----------
export const updateSecuritySettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { rememberMe, faceId, biometricId } = req.body;

    const updates: Record<string, any> = {};
    if (typeof rememberMe === 'boolean') updates['security.rememberMe'] = rememberMe;
    if (typeof faceId === 'boolean') updates['security.faceId'] = faceId;
    if (typeof biometricId === 'boolean') updates['security.biometricId'] = biometricId;

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Provide at least one of rememberMe, faceId, biometricId' });
    }

    const user = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user.security });
  } catch (err) {
    next(err);
  }
};

// ---------- CHANGE PASSWORD (SecurityPage "Change Password" button) ----------
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'newPassword must be at least 8 characters' });
    }

    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword; // rehashed by the pre-save hook
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed' });
  } catch (err) {
    next(err);
  }
};