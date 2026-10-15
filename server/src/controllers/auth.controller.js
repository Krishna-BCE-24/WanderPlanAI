import jwt from 'jsonwebtoken';

import {
  registerUser,
  authenticateUser,
  authenticateGoogleUser,
  requestPasswordReset,
  resetUserPassword,
  verifyUserEmail,
  requestEmailVerification,
  getPublicUser,
} from '../services/auth/auth.service.js';

import {
  setAuthCookie,
  clearAuthCookie,
} from '../utils/cookies.js';

// --------------------------------------------------
// CREATE JWT FOR AUTHENTICATED USERS
// --------------------------------------------------

function createAuthToken(userId) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short');
  }

  return jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: userId.toString(),
    expiresIn: '7d',
  });
}

// --------------------------------------------------
// SIGNUP
// --------------------------------------------------

export async function signup(req, res, next) {
  try {
    const user = await registerUser(req.body);

    // Email verification is required before password login.
    // Do not issue an authenticated session at signup.
    return res.status(201).json({
      success: true,
      message:
        'Account created. Please check your email for a verification link before logging in.',
      user: getPublicUser(user),
      requiresEmailVerification: !user.emailVerified,
    });
  } catch (error) {
    return next(error);
  }
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

export async function login(req, res, next) {
  try {
    const user = await authenticateUser(req.body);
    const token = createAuthToken(user._id);

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: getPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

// --------------------------------------------------
// GOOGLE LOGIN
// --------------------------------------------------

export async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body || {};

    if (
      typeof credential !== 'string' ||
      credential.length === 0 ||
      credential.length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid Google credential is required.',
      });
    }

    const user = await authenticateGoogleUser(credential);

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account is inactive.',
      });
    }

    const token = createAuthToken(user._id);

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Google login successful.',
      user: getPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

// --------------------------------------------------
// FORGOT PASSWORD
// --------------------------------------------------

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};

    if (
      typeof email !== 'string' ||
      email.trim().length === 0 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const result = await requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return next(error);
  }
}

// --------------------------------------------------
// RESET PASSWORD
// --------------------------------------------------

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link is invalid or expired.',
      });
    }

    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain 8 to 128 characters.',
      });
    }

    const result = await resetUserPassword({
      token,
      password,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return next(error);
  }
}

// --------------------------------------------------
// VERIFY EMAIL
// --------------------------------------------------

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body || {};

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: 'This verification link is invalid or expired.',
      });
    }

    const result = await verifyUserEmail(token);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return next(error);
  }
}

// --------------------------------------------------
// RESEND VERIFICATION EMAIL
// --------------------------------------------------

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body || {};

    if (
      typeof email !== 'string' ||
      email.trim().length === 0 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const result = await requestEmailVerification(email);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return next(error);
  }
}

// --------------------------------------------------
// CURRENT AUTHENTICATED USER
// --------------------------------------------------

export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: getPublicUser(req.user),
  });
}

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

export function logout(req, res) {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}
