// utils/sendEmail.ts
import { Resend } from 'resend';

let resend: Resend | null = null;

const getResendClient = (): Resend => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    resend = new Resend(apiKey);
  }
  return resend;
};

const getFromEmail = (): string => process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com';

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
};

export const sendOtpEmail = async (
  to: string,
  otp: string,
  purpose: 'verify' | 'reset'
) => {
  const subject =
    purpose === 'verify' ? 'Verify your account' : 'Reset your password';

  const heading =
    purpose === 'verify' ? 'Verify your email' : 'Reset your password';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${heading}</h2>
      <p>Use the code below. It expires in 10 minutes.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">
        ${otp}
      </div>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  const { data, error } = await getResendClient().emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};