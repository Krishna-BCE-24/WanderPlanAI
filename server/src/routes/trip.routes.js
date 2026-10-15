import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  createTrip,
  getMyTrips,
  getTripById,
  generateTripItinerary,
  updateTripItinerary,
  updateTrip,
  deleteTrip,
  addTripExpense,
  deleteTripExpense,
} from '../controllers/trip.controller.js';

import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Create trip rate limiter
const createTripLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// AI itinerary generation rate limiter
const generateItineraryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Update trip rate limiter
const updateTripLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Delete trip rate limiter
const deleteTripLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Add/delete expenses rate limiter
const expenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Get all trips belonging to the logged-in user
router.get('/', requireAuth, getMyTrips);

// Generate AI itinerary
router.post(
  '/:id/generate-itinerary',
  generateItineraryLimiter,
  requireAuth,
  generateTripItinerary
);

// Update itinerary activities
router.put(
  '/:id/itinerary',
  updateTripLimiter,
  requireAuth,
  updateTripItinerary
);

// Add an expense to a trip
router.post(
  '/:id/expenses',
  expenseLimiter,
  requireAuth,
  addTripExpense
);

// Delete an expense from a trip
router.delete(
  '/:id/expenses/:expenseId',
  expenseLimiter,
  requireAuth,
  deleteTripExpense
);

// Edit saved trip details
router.put(
  '/:id',
  updateTripLimiter,
  requireAuth,
  updateTrip
);

// Delete a saved trip
router.delete(
  '/:id',
  deleteTripLimiter,
  requireAuth,
  deleteTrip
);

// Get a single trip
router.get('/:id', requireAuth, getTripById);

// Create a new trip
router.post(
  '/',
  createTripLimiter,
  requireAuth,
  createTrip
);

export default router;
