import express from 'express';

import {
  getDestinationRecommendations,
} from '../controllers/discovery.controller.js';

import {
  requireAuth,
} from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/discover/recommendations
router.post(
  '/recommendations',
  requireAuth,
  getDestinationRecommendations
);

export default router;

