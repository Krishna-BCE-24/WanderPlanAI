import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import {
  signupSchema,
  loginSchema,
} from '../validators/auth.validator.js';

import {
  signup,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getMe,
  logout,
} from '../controllers/auth.controller.js';

import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Rate limit authentication, verification and password-reset attempts.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many authentication attempts. Please try again later.',
  },
});

// Validate request body with Zod.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check your input.',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    return next();
  };
}

// Email/password authentication.
router.post(
  '/signup',
  authRateLimit,
  validateBody(signupSchema),
  signup,
);

router.post(
  '/login',
  authRateLimit,
  validateBody(loginSchema),
  login,
);

// Google OAuth authentication.
router.post(
  '/google',
  authRateLimit,
  googleLogin,
);

// Email verification.
router.post(
  '/verify-email',
  authRateLimit,
  verifyEmail,
);

// Request another verification email.
router.post(
  '/resend-verification',
  authRateLimit,
  resendVerification,
);

// Request a password-reset email.
router.post(
  '/forgot-password',
  authRateLimit,
  forgotPassword,
);

// Reset password using a valid, unexpired token.
router.post(
  '/reset-password',
  authRateLimit,
  resetPassword,
);

// Current authenticated user.
router.get('/me', requireAuth, getMe);

// Logout.
router.post('/logout', logout);

export default router;
