// models/user.model.ts
import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  nickname?: string;
  email: string;
  password: string;
  isVerified: boolean;

  phone?: string;
  dateOfBirth?: string;
  country?: string;
  gender?: string;
  avatarUrl?: string;

  otp?: string;
  otpExpiry?: Date;

  resetOtp?: string;
  resetOtpExpiry?: Date;

  walletBalance: number;
  transactionPin?: string;

  security: {
    rememberMe: boolean;
    faceId: boolean;
    biometricId: boolean;
    googleAuthEnabled: boolean;
  };

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
  comparePin(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    nickname: { type: String, trim: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: String }, // stored as-is (e.g. "12/27/1995") to match the Flutter text field
    country: { type: String, trim: true },
    gender: { type: String, trim: true },
    avatarUrl: { type: String },

    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },

    resetOtp: {
      type: String,
      select: false,
    },
    resetOtpExpiry: {
      type: Date,
      select: false,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactionPin: {
      type: String,
      select: false,
    },

    security: {
      rememberMe: { type: Boolean, default: true },
      faceId: { type: Boolean, default: false },
      biometricId: { type: Boolean, default: false },
      googleAuthEnabled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before save
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


UserSchema.pre('save', async function () {
  if (!this.isModified('transactionPin') || !this.transactionPin) return;
  const salt = await bcrypt.genSalt(10);
  this.transactionPin = await bcrypt.hash(this.transactionPin, salt);
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.comparePin = async function (candidate: string) {
  if (!this.transactionPin) return false;
  return bcrypt.compare(candidate, this.transactionPin);
};

UserSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.password;
    delete ret.otp;
    delete ret.otpExpiry;
    delete ret.resetOtp;
    delete ret.resetOtpExpiry;
    delete ret.transactionPin;
    delete ret.__v;
    return ret;
  },
});

export const UserModel = model<IUser>('User', UserSchema);