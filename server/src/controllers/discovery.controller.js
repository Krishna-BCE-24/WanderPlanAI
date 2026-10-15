import {
  generateDestinationRecommendations,
} from '../services/discovery.service.js';

export async function getDestinationRecommendations(req, res, next) {
  try {
    const {
      prompt,
      budget,
      duration,
      travellers,
      interests,
      travelStyle,
    } = req.body || {};

    if (
      typeof prompt !== 'string' ||
      !prompt.trim() ||
      prompt.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a travel description of up to 1000 characters.',
      });
    }

    const numericBudget = Number(budget);
    const numericDuration = Number(duration);
    const numericTravellers = Number(travellers);

    if (
      !Number.isFinite(numericBudget) ||
      numericBudget < 1 ||
      numericBudget > 100000000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Budget must be between ₹1 and ₹10 crore.',
      });
    }

    if (
      !Number.isInteger(numericDuration) ||
      numericDuration < 1 ||
      numericDuration > 30
    ) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 30 days.',
      });
    }

    if (
      !Number.isInteger(numericTravellers) ||
      numericTravellers < 1 ||
      numericTravellers > 50
    ) {
      return res.status(400).json({
        success: false,
        message: 'Travellers must be between 1 and 50.',
      });
    }

    const allowedStyles = ['budget', 'balanced', 'comfort'];

    if (
      travelStyle !== undefined &&
      !allowedStyles.includes(travelStyle)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid travel style.',
      });
    }

    if (
      interests !== undefined &&
      (
        !Array.isArray(interests) ||
        interests.length > 15 ||
        interests.some(
          (interest) =>
            typeof interest !== 'string' ||
            interest.length > 50
        )
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please select valid travel interests.',
      });
    }

    const result = await generateDestinationRecommendations({
      prompt: prompt.trim(),
      budget: numericBudget,
      duration: numericDuration,
      travellers: numericTravellers,
      interests: interests || [],
      travelStyle: travelStyle || 'balanced',
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
