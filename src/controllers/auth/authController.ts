// controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../../models/users/user_model';
import { generateOtp, sendOtpEmail } from '../../service/emailService';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_TTL_MINUTES = 10;

const signToken = (userId: string) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

const otpExpiryDate = () =>
  new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

// ---------- SIGNUP ----------
export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'name, email and password are required' });
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const otp = generateOtp();

    const user = await UserModel.create({
      name,
      email: email.toLowerCase(),
      password,
      isVerified: false,
      otp,
      otpExpiry: otpExpiryDate(),
    });

    await sendOtpEmail(user.email, otp, 'verify');

    return res.status(201).json({
      success: true,
      message: 'Signup successful. Check your email for the verification code.',
      data: { id: user._id, email: user.email },
    });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- VERIFY OTP (email verification) ----------
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'email and otp are required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
      '+otp +otpExpiry'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'No pending verification for this account' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: 'Account verified',
      token,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ---------- RESEND OTP ----------
export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'email is required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = otpExpiryDate();
    await user.save();

    await sendOtpEmail(user.email, otp, 'verify');

    return res.status(200).json({ success: true, message: 'OTP resent' });
  } catch (err) {
    next(err);
  }
};

// ---------- LOGIN ----------
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Account not verified. Please verify your email first.',
      });
    }

    const token = signToken(user._id.toString());

    return res.status(200).json({
      success: true,
      token,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ---------- FORGOT PASSWORD (request reset OTP) ----------
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'email is required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    // Do not reveal whether the email exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset code has been sent.',
      });
    }

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpiry = otpExpiryDate();
    await user.save();

    await sendOtpEmail(user.email, otp, 'reset');

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset code has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// ---------- RESET PASSWORD ----------
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'email, otp and newPassword are required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
      '+resetOtp +resetOtpExpiry'
    );

    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset request' });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.resetOtpExpiry.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    user.password = newPassword; // hashed by pre-save hook
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};