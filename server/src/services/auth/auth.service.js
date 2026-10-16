import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';
import User from '../../models/User.js';

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
);

let resendClient;

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Create a cryptographically secure, single-use token.
function createSecureToken() {
  const token = crypto.randomBytes(32).toString('hex');

  return {
    token,
    tokenHash: crypto
      .createHash('sha256')
      .update(token)
      .digest('hex'),
  };
}

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}

function getFrontendUrl(path, token) {
  const frontendUrl = process.env.CLIENT_URL;

  if (!frontendUrl) {
    throw new Error('CLIENT_URL is not configured on the server.');
  }

  const url = new URL(path, frontendUrl);
  url.searchParams.set('token', token);

  return url.toString();
}

async function sendAuthEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Email recipient, subject, and content are required.');
  }

  const resend = getResendClient();

  const from =
    process.env.EMAIL_FROM ||
    'WanderPlan AI <onboarding@resend.dev>';

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text,
    html,
  });

  if (error) {
    // Avoid logging API keys, tokens, or sensitive email content.
    console.error('Resend email delivery failed:', error.message);
    throw new Error('Unable to send email. Please try again later.');
  }

  return data;
}

// --------------------------------------------------
// EMAIL VERIFICATION EMAIL
// --------------------------------------------------

async function sendVerificationEmail(user) {
  const { token, tokenHash } = createSecureToken();

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = new Date(
    Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await user.save();

  const verificationUrl = getFrontendUrl('/verify-email', token);

  try {
    await sendAuthEmail({
      to: user.email,
      subject: 'Verify your WanderPlan AI email',
      text: [
        `Hi ${user.name},`,
        '',
        'Welcome to WanderPlan AI!',
        'Please verify your email address using this link:',
        '',
        verificationUrl,
        '',
        `This link expires in ${EMAIL_VERIFICATION_EXPIRY_HOURS} hours.`,
        'If you did not create this account, you can ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102a43">
          <h2>Verify your email address</h2>
          <p>Hi ${escapeHtml(user.name)},</p>
          <p>Welcome to WanderPlan AI! Verify your email to activate your account.</p>
          <p>
            <a
              href="${escapeHtml(verificationUrl)}"
              style="display:inline-block;padding:12px 22px;background:#3988ff;color:#fff;text-decoration:none;border-radius:8px"
            >
              Verify email address
            </a>
          </p>
          <p>This link expires in ${EMAIL_VERIFICATION_EXPIRY_HOURS} hours.</p>
          <p>If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    throw error;
  }

  return {
    message: 'Verification email sent successfully.',
  };
}

// --------------------------------------------------
// REGISTER WITH EMAIL AND PASSWORD
// --------------------------------------------------

export async function registerUser({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw createError(
      'An account with this email already exists.',
      409,
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;

  try {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createError(
        'An account with this email already exists.',
        409,
      );
    }

    throw error;
  }

  // Keep the account if email delivery fails so the user can
  // request another verification email later.
  try {
    await sendVerificationEmail(user);
  } catch (error) {
    console.error(
      'Verification email could not be sent:',
      error.message,
    );
  }

  return user;
}

// --------------------------------------------------
// VERIFY EMAIL ADDRESS
// --------------------------------------------------

export async function verifyUserEmail(token) {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    throw createError(
      'This verification link is invalid or expired.',
      400,
    );
  }

  const tokenHash = hashToken(token);

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
    emailVerified: false,
    isActive: true,
  }).select(
    '+emailVerificationTokenHash +emailVerificationExpires',
  );

  if (!user) {
    throw createError(
      'This verification link is invalid or expired. Request a new verification email.',
      400,
    );
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  return {
    message: 'Email verified successfully. You can now log in.',
  };
}

// --------------------------------------------------
// RESEND EMAIL VERIFICATION
// --------------------------------------------------

export async function requestEmailVerification(email) {
  const normalizedEmail = email.trim().toLowerCase();

  const genericResult = {
    message:
      'If this account exists and needs verification, a verification email will be sent.',
  };

  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true,
  });

  if (!user || user.emailVerified) {
    return genericResult;
  }

  await sendVerificationEmail(user);

  return genericResult;
}

// --------------------------------------------------
// LOGIN WITH EMAIL AND PASSWORD
// --------------------------------------------------

export async function authenticateUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select('+passwordHash');

  if (!user || !user.passwordHash || !user.isActive) {
    throw createError('Invalid email or password.', 401);
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw createError('Invalid email or password.', 401);
  }

  if (!user.emailVerified) {
    throw createError(
      'Please verify your email before logging in. Check your inbox or request a new verification email.',
      403,
    );
  }

  return user;
}

// --------------------------------------------------
// GOOGLE OAUTH LOGIN
// --------------------------------------------------

export async function authenticateGoogleUser(idToken) {
  if (
    typeof idToken !== 'string' ||
    idToken.length === 0 ||
    idToken.length > 10000
  ) {
    throw createError(
      'A valid Google credential is required.',
      400,
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      'GOOGLE_CLIENT_ID is not configured on the server.',
    );
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    payload = ticket.getPayload();
  } catch {
    throw createError(
      'Google sign-in verification failed. Please try again.',
      401,
    );
  }

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw createError(
      'A Google account with a verified email is required.',
      401,
    );
  }

  const googleId = payload.sub;
  const normalizedEmail = payload.email.trim().toLowerCase();
  const name =
    payload.name?.trim() ||
    normalizedEmail.split('@')[0];
  const avatar = payload.picture || null;

  let user = await User.findOne({
    googleId,
  }).select('+googleId');

  if (user) {
    if (!user.isActive) {
      throw createError('This account is inactive.', 403);
    }

    let changed = false;

    if (!user.emailVerified) {
      user.emailVerified = true;
      changed = true;
    }

    if (avatar && user.avatar !== avatar) {
      user.avatar = avatar;
      changed = true;
    }

    if (changed) {
      await user.save();
    }

    return user;
  }

  user = await User.findOne({
    email: normalizedEmail,
  }).select('+googleId');

  if (user) {
    if (!user.isActive) {
      throw createError('This account is inactive.', 403);
    }

    if (user.googleId && user.googleId !== googleId) {
      throw createError(
        'This email is linked to a different Google account.',
        409,
      );
    }

    user.googleId = googleId;
    user.emailVerified = true;

    if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    return user;
  }

  try {
    return await User.create({
      name,
      email: normalizedEmail,
      googleId,
      avatar,
      emailVerified: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createError(
        'An account with this email already exists. Please try logging in again.',
        409,
      );
    }

    throw error;
  }
}

// --------------------------------------------------
// SEND PASSWORD RESET EMAIL
// --------------------------------------------------

export async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();

  const genericResult = {
    message:
      'If an account exists for that email, a password reset link will be sent shortly.',
  };

  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true,
  });

  if (!user) {
    return genericResult;
  }

  const { token, tokenHash } = createSecureToken();

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpires = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
  );

  await user.save();

  const resetUrl = getFrontendUrl('/reset-password', token);

  try {
    await sendAuthEmail({
      to: user.email,
      subject: 'Reset your WanderPlan AI password',
      text: [
        `Hi ${user.name},`,
        '',
        'We received a request to reset your WanderPlan AI password.',
        '',
        `Reset your password using this link: ${resetUrl}`,
        '',
        `This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.`,
        'If you did not request this, you can safely ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102a43">
          <h2>Reset your password</h2>
          <p>Hi ${escapeHtml(user.name)},</p>
          <p>We received a request to reset your WanderPlan AI password.</p>
          <p>
            <a
              href="${escapeHtml(resetUrl)}"
              style="display:inline-block;padding:12px 22px;background:#3988ff;color:#fff;text-decoration:none;border-radius:8px"
            >
              Reset password
            </a>
          </p>
          <p>This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    throw error;
  }

  return genericResult;
}

// --------------------------------------------------
// RESET PASSWORD
// --------------------------------------------------

export async function resetUserPassword({ token, password }) {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    throw createError(
      'This password reset link is invalid or expired.',
      400,
    );
  }

  const tokenHash = hashToken(token);

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
    isActive: true,
  }).select(
    '+passwordResetTokenHash +passwordResetExpires',
  );

  if (!user) {
    throw createError(
      'This password reset link is invalid or expired.',
      400,
    );
  }

  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  return {
    message: 'Password reset successful. You can now log in.',
  };
}

// --------------------------------------------------
// SAFE PUBLIC USER DATA
// --------------------------------------------------

export function getPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}
