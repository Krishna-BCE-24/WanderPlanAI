import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AUTH_COOKIE_NAME } from '../utils/cookies.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to continue',
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured correctly',
      });
    }

    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your session is invalid. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please log in again.',
      });
    }

    next(error);
  }
}
