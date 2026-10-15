import { GoogleGenAI } from '@google/genai';

/* =========================================
   CONFIGURATION
========================================= */

const MODEL = 'gemini-3.8-flash';

const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
];

const MAX_ATTEMPTS = 2;
const BASE_DELAY_MS = 1500;
const MAX_TRIP_DAYS = 21;

/* =========================================
   1. GEMINI CLIENT
========================================= */

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing in server/.env'
    );
  }

  return new GoogleGenAI({ apiKey });
}

/* =========================================
   2. UTILITY FUNCTIONS
========================================= */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.cause?.status,
    error?.code,
  ];

  for (const value of candidates) {
    const status = Number(value);

    if (
      Number.isInteger(status) &&
      status >= 400 &&
      status <= 599
    ) {
      return status;
    }
  }

  // Some Gemini SDK errors contain JSON in their message.
  const message = String(error?.message || '');

  const match = message.match(
    /["']?code["']?\s*:\s*(400|401|403|404|408|409|429|500|502|503|504)\b/
  );

  if (match) {
    return Number(match[1]);
  }

  const statusMatch = message.match(
    /\b(400|401|403|404|408|409|429|500|502|503|504)\b/
  );

  return statusMatch ? Number(statusMatch[1]) : 0;
}

function isRetryable(error) {
  const status = getStatus(error);
  const message = String(error?.message || '').toLowerCase();

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    message.includes('overloaded') ||
    message.includes('resource exhausted') ||
    message.includes('temporarily unavailable') ||
    message.includes('rate limit') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
}

function getErrorMessage(error) {
  const status = getStatus(error);

  if (status === 401 || status === 403) {
    return 'Gemini authentication failed. Check GEMINI_API_KEY and its permissions.';
  }

  if (status === 429) {
    return 'Gemini request limit reached. Please wait and try again.';
  }

  if (status === 503) {
    return 'Gemini is temporarily overloaded. Please try again shortly.';
  }

  if (status >= 500) {
    return 'Gemini is temporarily unavailable. Please try again shortly.';
  }

  if (status === 400) {
    return 'Gemini rejected the request. Check the model and itinerary inputs.';
  }

  if (status === 404) {
    return 'Gemini model or resource not found. Check model configuration and API access.';
  }

  return error?.message || 'Could not generate the itinerary with Gemini.';
}

/* =========================================
   3. GEMINI GENERATION WITH FALLBACK
========================================= */

async function generateWithRetry(ai, prompt) {
  const models = [MODEL, ...FALLBACK_MODELS];
  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        console.log(
          `Trying Gemini model: ${model} (attempt ${attempt}/${MAX_ATTEMPTS})`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        console.log(`Itinerary generated using model: ${model}`);

        return response;
      } catch (error) {
        lastError = error;

        const status = getStatus(error);

        console.error('Gemini request failed:', {
          model,
          attempt,
          status: status || 'unknown',
          message: error?.message,
        });

        // Authentication and permission errors won't be
        // solved by switching models.
        if (status === 401 || status === 403) {
          throw new Error(getErrorMessage(error));
        }

        // Don't retry permanent or non-retryable errors.
        if (!isRetryable(error) && status !== 404) {
          throw new Error(getErrorMessage(error));
        }

        // Retry this model once before switching.
        if (attempt < MAX_ATTEMPTS) {
          const delayMs =
            BASE_DELAY_MS * 2 ** (attempt - 1) +
            Math.floor(Math.random() * 500);

          console.warn(
            `${model} unavailable. Retrying in ${delayMs}ms...`
          );

          await sleep(delayMs);
        } else {
          console.warn(
            `${model} failed. Trying the next model if available.`
          );
        }
      }
    }
  }

  throw new Error(getErrorMessage(lastError));
}

/* =========================================
   4. DATE NORMALIZATION
========================================= */

function normalizeTripDate(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required.`);
  }

  // Handle JavaScript Date objects from Mongoose.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${fieldName} is not a valid date.`);
    }

    return value.toISOString().slice(0, 10);
  }

  // Handle MongoDB Extended JSON date objects.
  if (typeof value === 'object') {
    if (value.$date) {
      return normalizeTripDate(value.$date, fieldName);
    }

    throw new Error(`${fieldName} has an unsupported date format.`);
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} has an unsupported date format.`);
  }

  const trimmed = value.trim();

  // Accept YYYY-MM-DD or an ISO datetime beginning with that date.
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/
  );

  if (!match) {
    throw new Error(
      `${fieldName} must be YYYY-MM-DD or an ISO date string.`
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  // Reject impossible calendar dates.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} is not a valid calendar date.`);
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getTripDates(startDateValue, endDateValue) {
  const startString = normalizeTripDate(
    startDateValue,
    'Start date'
  );

  const endString = normalizeTripDate(
    endDateValue,
    'End date'
  );

  const start = Date.parse(
    `${startString}T00:00:00.000Z`
  );

  const end = Date.parse(
    `${endString}T00:00:00.000Z`
  );

  if (end < start) {
    throw new Error(
      'Trip end date cannot be before the start date.'
    );
  }

  const dayCount =
    Math.round((end - start) / 86400000) + 1;

  if (dayCount < 1 || dayCount > MAX_TRIP_DAYS) {
    throw new Error(
      `Trip duration must be between 1 and ${MAX_TRIP_DAYS} days.`
    );
  }

  return {
    startString,
    endString,
    dayCount,
  };
}

/* =========================================
   5. BUILD ITINERARY PROMPT
========================================= */

function buildItineraryPrompt(trip, dates) {
  const {
    startString,
    endString,
    dayCount,
  } = dates;

  const origin =
    trip.origin ||
    trip.startLocation ||
    '';

  const destination =
    trip.destination ||
    trip.destinationName ||
    '';

  if (!destination) {
    throw new Error(
      'A destination is required to generate an itinerary.'
    );
  }

  const travellers = Number(
    trip.travellers ?? trip.travelers ?? 1
  );

  const budget = Number(trip.budget ?? 0);

  const interests = Array.isArray(trip.interests)
    ? trip.interests.join(', ')
    : String(
        trip.interests || 'General sightseeing'
      );

  const travelStyle =
    trip.travelStyle ||
    trip.style ||
    'balanced';

  const transport =
    trip.transport ||
    trip.transportMode ||
    'public transport';

  return `
You are WanderPlan AI, a practical and budget-conscious travel assistant.

Generate a personalized itinerary from the following details.

TRIP DETAILS
- Starting location: ${origin || 'Not specified'}
- Destination: ${destination}
- Start date: ${startString}
- End date: ${endString}
- Number of days: ${dayCount}
- Number of travellers: ${
    Number.isFinite(travellers) && travellers > 0
      ? travellers
      : 1
  }
- Total trip budget in INR: ${
    Number.isFinite(budget) && budget >= 0
      ? budget
      : 0
  }
- Travel style: ${travelStyle}
- Preferred transport: ${transport}
- Interests: ${interests}

REQUIREMENTS
1. Return exactly ${dayCount} itinerary days.
2. Include every date from ${startString} to ${endString}.
3. Keep activities geographically practical and realistic.
4. Include timings, locations, durations, descriptions and estimated costs.
5. Include breakfast, lunch and dinner suggestions.
6. Consider the travellers, interests, travel style, transport and budget.
7. All costs must be numeric INR estimates for the entire group.
8. Consider transport, accommodation, meals and activities in the total cost.
9. Explain if the budget is insufficient.
10. Do not claim live prices, bookings or availability.
11. Do not invent exact live opening hours or traffic conditions.
12. Account for travel time on arrival and departure days.
13. Include realistic breaks and avoid overloading the schedule.
14. Return valid JSON only. Do not use Markdown or code fences.
15. Use 0 for a cost that cannot reasonably be estimated.

RETURN JSON IN THIS STRUCTURE:

{
  "summary": "Short overview of the trip",
  "estimatedCost": 15000,
  "budgetNotes": "Explain budget feasibility",
  "days": [
    {
      "dayNumber": 1,
      "date": "${startString}",
      "title": "Day title",
      "location": "Main area for the day",
      "activities": [
        {
          "time": "09:00 AM",
          "name": "Activity name",
          "description": "What the traveller can do",
          "location": "Place or area",
          "estimatedCost": 500,
          "duration": "2 hours"
        }
      ],
      "meals": {
        "breakfast": {
          "suggestion": "Breakfast suggestion",
          "estimatedCost": 200
        },
        "lunch": {
          "suggestion": "Lunch suggestion",
          "estimatedCost": 300
        },
        "dinner": {
          "suggestion": "Dinner suggestion",
          "estimatedCost": 350
        }
      },
      "estimatedDailyCost": 2500,
      "travelNotes": "Practical transport and timing advice"
    }
  ]
}

JSON RULES
- The days array must contain exactly ${dayCount} objects.
- Dates must be chronological and use YYYY-MM-DD format.
- dayNumber must start at 1 and increase sequentially.
- Every day must have an activities array and a meals object.
- Every activity must have all six fields shown above.
- Each meal must have a suggestion and numeric estimatedCost.
- estimatedCost and estimatedDailyCost must be numeric INR estimates.
- Keep the JSON syntactically valid.
`;
}

/* =========================================
   6. PARSE GEMINI JSON
========================================= */

function parseGeminiJSON(response) {
  const responseText = response?.text;

  if (
    !responseText ||
    !String(responseText).trim()
  ) {
    throw new Error(
      'Gemini returned an empty itinerary. Please try again.'
    );
  }

  const cleanedText = String(responseText)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(cleanedText);
  } catch {
    console.error(
      'Gemini returned invalid JSON. Response length:',
      cleanedText.length
    );

    throw new Error(
      'Gemini returned invalid itinerary data. Please try again.'
    );
  }
}

/* =========================================
   7. VALIDATE ITINERARY
========================================= */

function validateItinerary(result, dayCount, dates) {
  if (
    !result ||
    typeof result !== 'object' ||
    Array.isArray(result)
  ) {
    throw new Error(
      'Gemini returned an invalid itinerary. Please try again.'
    );
  }

  if (
    !Array.isArray(result.days) ||
    result.days.length !== dayCount
  ) {
    throw new Error(
      'Gemini returned an incomplete itinerary. Please try again.'
    );
  }

  const startTimestamp = Date.parse(
    `${dates.startString}T00:00:00.000Z`
  );

  const normalizedDays = result.days.map((day, index) => {
    const expectedDate = new Date(
      startTimestamp + index * 86400000
    )
      .toISOString()
      .slice(0, 10);

    if (
      !day ||
      typeof day !== 'object' ||
      Array.isArray(day)
    ) {
      throw new Error(
        `Invalid itinerary data for day ${index + 1}.`
      );
    }

    if (
      day.date &&
      String(day.date).slice(0, 10) !== expectedDate
    ) {
      throw new Error(
        `Gemini returned an incorrect date for day ${index + 1}.`
      );
    }

    if (!Array.isArray(day.activities)) {
      throw new Error(
        `Gemini returned invalid activities for day ${index + 1}.`
      );
    }

    const meals =
      day.meals && typeof day.meals === 'object'
        ? day.meals
        : {};

    function normalizeMeal(meal) {
      return {
        suggestion: String(
          meal?.suggestion || 'Meal of your choice'
        ),
        estimatedCost: Math.max(
          0,
          Number(meal?.estimatedCost) || 0
        ),
      };
    }

    const activities = day.activities.map((activity) => ({
      time: String(activity?.time || ''),
      name: String(activity?.name || 'Activity'),
      description: String(activity?.description || ''),
      location: String(activity?.location || ''),
      estimatedCost: Math.max(
        0,
        Number(activity?.estimatedCost) || 0
      ),
      duration: String(activity?.duration || ''),
    }));

    return {
      dayNumber: index + 1,
      date: expectedDate,
      title: String(
        day.title || `Day ${index + 1}`
      ),
      location: String(day.location || ''),
      activities,
      meals: {
        breakfast: normalizeMeal(meals.breakfast),
        lunch: normalizeMeal(meals.lunch),
        dinner: normalizeMeal(meals.dinner),
      },
      estimatedDailyCost: Math.max(
        0,
        Number(day.estimatedDailyCost) || 0
      ),
      travelNotes: String(day.travelNotes || ''),
    };
  });

  return {
    summary: String(result.summary || ''),
    estimatedCost: Math.max(
      0,
      Number(result.estimatedCost) || 0
    ),
    budgetNotes: String(result.budgetNotes || ''),
    days: normalizedDays,
  };
}

/* =========================================
   8. MAIN EXPORTED FUNCTION
========================================= */

export async function generateItineraryWithGemini(trip) {
  if (
    !trip ||
    typeof trip !== 'object' ||
    Array.isArray(trip)
  ) {
    throw new Error(
      'Trip details are required to generate an itinerary.'
    );
  }

  console.info('Generating itinerary for dates:', {
    startDate: trip.startDate,
    endDate: trip.endDate,
  });

  const dates = getTripDates(
    trip.startDate,
    trip.endDate
  );

  const prompt = buildItineraryPrompt(trip, dates);
  const ai = getAIClient();

  const response = await generateWithRetry(
    ai,
    prompt
  );

  const result = parseGeminiJSON(response);

  return validateItinerary(
    result,
    dates.dayCount,
    dates
  );
}