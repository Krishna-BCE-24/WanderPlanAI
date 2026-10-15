import mongoose from 'mongoose';
import Trip from '../models/trip.js';
import { generateItineraryWithGemini } from '../services/itinerary.service.js';

const EXPENSE_CATEGORIES = [
  'Food',
  'Hotel',
  'Transport',
  'Activities',
  'Shopping',
  'Miscellaneous',
];

// Create and save a new trip
export async function createTrip(req, res, next) {
  try {
    const {
      origin,
      destination,
      startDate,
      endDate,
      adults = 2,
      children = 0,
      budget,
      travelStyle = 'balanced',
      transport = 'flexible',
      interests = ['Nature'],
    } = req.body;

    if (
      typeof origin !== 'string' ||
      !origin.trim() ||
      typeof destination !== 'string' ||
      !destination.trim() ||
      !startDate ||
      !endDate ||
      budget === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide origin, destination, dates and budget.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const parsedBudget = Number(budget);
    const parsedAdults = Number(adults);
    const parsedChildren = Number(children);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid travel dates.',
      });
    }

    if (
      !Number.isFinite(parsedBudget) ||
      parsedBudget < 1 ||
      parsedBudget > 100000000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid trip budget.',
      });
    }

    if (
      !Number.isInteger(parsedAdults) ||
      parsedAdults < 1 ||
      parsedAdults > 10 ||
      !Number.isInteger(parsedChildren) ||
      parsedChildren < 0 ||
      parsedChildren > 6
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid traveller count.',
      });
    }

    const allowedStyles = ['budget', 'balanced', 'comfort'];
    const allowedTransport = [
      'flight',
      'train',
      'bus',
      'car',
      'flexible',
    ];
    const allowedInterests = [
      'Nature',
      'Adventure',
      'Mountains',
      'Beaches',
      'Culture',
      'Food',
      'History',
      'Shopping',
    ];

    if (!allowedStyles.includes(travelStyle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel style.',
      });
    }

    if (!allowedTransport.includes(transport)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transport preference.',
      });
    }

    if (
      !Array.isArray(interests) ||
      interests.length < 1 ||
      interests.length > 8 ||
      !interests.every((interest) =>
        allowedInterests.includes(interest)
      ) ||
      new Set(interests).size !== interests.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please select valid trip interests.',
      });
    }

    const trip = await Trip.create({
      user: req.user._id,
      origin: origin.trim(),
      destination: destination.trim(),
      startDate: start,
      endDate: end,
      travellers: {
        adults: parsedAdults,
        children: parsedChildren,
      },
      budget: parsedBudget,
      travelStyle,
      transport,
      interests,
      status: 'draft',
    });

    return res.status(201).json({
      success: true,
      message: 'Trip saved successfully.',
      trip,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: 'Trip validation failed.',
        errors: Object.values(error.errors).map(
          (item) => item.message
        ),
      });
    }

    return next(error);
  }
}

// Fetch trips belonging to the logged-in user
export async function getMyTrips(req, res, next) {
  try {
    const trips = await Trip.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: trips.length,
      trips,
    });
  } catch (error) {
    return next(error);
  }
}

// Fetch a single trip
export async function getTripById(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID.',
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      user: req.user._id,
    }).lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    return res.status(200).json({
      success: true,
      trip,
    });
  } catch (error) {
    return next(error);
  }
}

// Generate and save an AI itinerary
export async function generateTripItinerary(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID.',
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    const itinerary = await generateItineraryWithGemini(trip);

    trip.itinerary = itinerary.days;
    trip.estimatedCost = itinerary.estimatedCost;

    await trip.save();

    return res.status(200).json({
      success: true,
      message: 'AI itinerary generated and saved successfully.',
      summary: itinerary.summary,
      budgetNotes: itinerary.budgetNotes,
      trip,
    });
  } catch (error) {
    console.error('Generate itinerary error:', error.message);

    if (
      error.message?.includes('GEMINI_API_KEY') ||
      error.message?.includes('Gemini returned')
    ) {
      return res.status(502).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
}

// Update itinerary
export async function updateTripItinerary(req, res, next) {
  try {
    const { id } = req.params;
    const { itinerary, estimatedCost } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID.',
      });
    }

    if (
      !Array.isArray(itinerary) ||
      itinerary.length < 1 ||
      itinerary.length > 30
    ) {
      return res.status(400).json({
        success: false,
        message: 'Itinerary must contain between 1 and 30 days.',
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    if (estimatedCost !== undefined) {
      const cost = Number(estimatedCost);

      if (!Number.isFinite(cost) || cost < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid estimated cost.',
        });
      }

      trip.estimatedCost = cost;
    }

    trip.itinerary = itinerary;
    await trip.save();

    return res.status(200).json({
      success: true,
      message: 'Itinerary updated successfully.',
      trip,
    });
  } catch (error) {
    return next(error);
  }
}

// Update saved trip details
export async function updateTrip(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID.',
      });
    }

    const {
      origin,
      destination,
      startDate,
      endDate,
      budget,
      adults,
      children,
      travelStyle,
      transport,
      interests,
    } = req.body;

    if (
      typeof origin !== 'string' ||
      !origin.trim() ||
      typeof destination !== 'string' ||
      !destination.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const parsedBudget = Number(budget);
    const parsedAdults = Number(adults);
    const parsedChildren = Number(children);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel dates.',
      });
    }

    if (
      !Number.isFinite(parsedBudget) ||
      parsedBudget < 1 ||
      parsedBudget > 100000000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid budget.',
      });
    }

    if (
      !Number.isInteger(parsedAdults) ||
      parsedAdults < 1 ||
      parsedAdults > 10 ||
      !Number.isInteger(parsedChildren) ||
      parsedChildren < 0 ||
      parsedChildren > 6
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid traveller count.',
      });
    }

    const allowedStyles = ['budget', 'balanced', 'comfort'];
    const allowedTransport = [
      'flight',
      'train',
      'bus',
      'car',
      'flexible',
    ];
    const allowedInterests = [
      'Nature',
      'Adventure',
      'Mountains',
      'Beaches',
      'Culture',
      'Food',
      'History',
      'Shopping',
    ];

    if (!allowedStyles.includes(travelStyle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel style.',
      });
    }

    if (!allowedTransport.includes(transport)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transport.',
      });
    }

    if (
      !Array.isArray(interests) ||
      interests.length < 1 ||
      interests.length > 8 ||
      !interests.every((item) => allowedInterests.includes(item)) ||
      new Set(interests).size !== interests.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interests.',
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    trip.origin = origin.trim();
    trip.destination = destination.trim();
    trip.title = `${destination.trim()} Trip`;
    trip.startDate = start;
    trip.endDate = end;
    trip.budget = parsedBudget;
    trip.travellers = {
      adults: parsedAdults,
      children: parsedChildren,
    };
    trip.travelStyle = travelStyle;
    trip.transport = transport;
    trip.interests = interests;

    await trip.save();

    return res.status(200).json({
      success: true,
      message: 'Trip updated successfully.',
      trip,
    });
  } catch (error) {
    return next(error);
  }
}

// Delete a saved trip
export async function deleteTrip(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID.',
      });
    }

    const trip = await Trip.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Trip deleted successfully.',
      deletedTripId: trip._id,
    });
  } catch (error) {
    return next(error);
  }
}

// Add a manual expense
export async function addTripExpense(req, res, next) {
  try {
    const { id } = req.params;
    const { title, amount, category, date, notes = '' } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID.',
      });
    }

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      title.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a title between 1 and 100 characters.',
      });
    }

    if (
      typeof amount === 'string' && amount.trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid expense amount.',
      });
    }

    const parsedAmount = Number(amount);

    if (
      amount === null ||
      amount === undefined ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 0.01 ||
      parsedAmount > 100000000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid expense amount.',
      });
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid expense category.',
      });
    }

    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid date in YYYY-MM-DD format.',
      });
    }

    const expenseDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(expenseDate.getTime()) ||
      expenseDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid calendar date.',
      });
    }

    if (
      typeof notes !== 'string' ||
      notes.length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: 'Notes must not exceed 300 characters.',
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    trip.expenses.push({
      title: title.trim(),
      amount: parsedAmount,
      category,
      date: expenseDate,
      notes: notes.trim(),
    });

    await trip.save();

    const expense = trip.expenses[trip.expenses.length - 1];
    const totalActualExpenses = trip.expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    return res.status(201).json({
      success: true,
      message: 'Expense added successfully.',
      expense,
      totalActualExpenses,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: 'Expense validation failed.',
        errors: Object.values(error.errors).map(
          (item) => item.message
        ),
      });
    }

    return next(error);
  }
}

// Delete a manual expense
export async function deleteTripExpense(req, res, next) {
  try {
    const { id, expenseId } = req.params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(expenseId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip or expense ID.',
      });
    }

    const trip = await Trip.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    const expense = trip.expenses.id(expenseId);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found.',
      });
    }

    expense.deleteOne();
    await trip.save();

    const totalActualExpenses = trip.expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully.',
      totalActualExpenses,
    });
  } catch (error) {
    return next(error);
  }
}
