import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  Wallet,
  CalendarDays,
  Users,
  Compass,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
  Mountain,
  Heart,
  Camera,
  Palmtree,
  RefreshCw,
} from 'lucide-react';

import api from '../services/api.js';
import './Discover.css';

const suggestions = [
  {
    icon: Mountain,
    title: 'Peaceful mountains',
    prompt:
      'Suggest peaceful mountain destinations in India with beautiful scenery and nature.',
  },
  {
    icon: Heart,
    title: 'Romantic getaway',
    prompt:
      'Suggest romantic destinations for a relaxing trip with beautiful views.',
  },
  {
    icon: Camera,
    title: 'Photography trip',
    prompt:
      'Suggest scenic destinations with amazing photography spots and natural beauty.',
  },
  {
    icon: Palmtree,
    title: 'Beach escape',
    prompt:
      'Suggest beautiful beach destinations for a relaxing vacation.',
  },
];

const initialForm = {
  prompt: '',
  budget: '15000',
  duration: '4',
  travellers: '2',
  interests: ['Nature'],
  travelStyle: 'balanced',
};

const interestOptions = [
  'Nature',
  'Mountains',
  'Beaches',
  'Adventure',
  'Culture',
  'Food',
  'Photography',
  'Relaxation',
  'History',
];

const styles = [
  { value: 'budget', label: 'Budget', description: 'Save more' },
  { value: 'balanced', label: 'Balanced', description: 'Best of both' },
  { value: 'comfort', label: 'Comfort', description: 'Extra comfort' },
];

function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function extractTripDetails(prompt) {
  const result = {};
  if (typeof prompt !== 'string' || !prompt.trim()) return result;

  const text = prompt.toLowerCase().replace(/,/g, '');
  const numberWords = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  // Budget: ₹20,000, Rs 20000, 20k, 20 thousand, 1 lakh.
  const budgetPatterns = [
    /(?:budget|spend|cost|limit|under|within|around|about|approximately)\s*(?:is|of|at|around|about|:)?\s*(?:₹|rs\.?\s*|inr\s*)?(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|lac|million)?\s*(?:rupees|rs\.?|inr)?/i,
    /(?:₹|rs\.?\s*|inr\s*)(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|lac|million)?/i,
    /\b(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|lac|million)\b/i,
    /\b(\d[\d]*)\s*rupees\b/i,
  ];

  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const amount = Number(match[1]);
    const unit = (match[2] || '').toLowerCase();
    const multiplier = ['k', 'thousand'].includes(unit) ? 1000
      : ['lakh', 'lakhs', 'lac', 'lacs'].includes(unit) ? 100000
      : unit === 'million' ? 1000000 : 1;
    const value = amount * multiplier;
    if (Number.isFinite(value) && value >= 1 && value <= 100000000) {
      result.budget = String(Math.round(value));
      break;
    }
  }

  // Duration: 3 days, 3-day trip, day is 3, 3 nights, long weekend.
  const durationPatterns = [
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*[- ]?\s*days?\b/i,
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*[- ]?\s*nights?\b/i,
    /\b(?:day|duration)\s*(?:is|of|:|=)\s*(\d{1,2})\b/i,
    /\b(?:for|lasting)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?\b/i,
  ];
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const raw = match[1].toLowerCase();
    const days = Number(raw) || numberWords[raw];
    if (Number.isInteger(days) && days >= 1 && days <= 30) {
      result.duration = String(days);
      break;
    }
  }
  if (!result.duration) {
    if (/\blong weekend\b/i.test(text)) result.duration = '3';
    else if (/\bweekend trip\b/i.test(text)) result.duration = '2';
  }

  // Traveller count: solo, alone, just me, 2 people, family of 4.
  if (/\b(solo|alone|single traveller|single traveler|travelling alone|traveling alone|just me|only me|by myself)\b/i.test(text)) {
    result.travellers = '1';
  } else {
    const travellerPatterns = [
      /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:people|persons|travellers|travelers|adults|members)\b/i,
      /\b(?:for|group of|family of)\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
    ];
    for (const pattern of travellerPatterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const raw = match[1].toLowerCase();
      const count = Number(raw) || numberWords[raw];
      if (Number.isInteger(count) && count >= 1 && count <= 50) {
        result.travellers = String(count);
        break;
      }
    }
  }

  // Common interests; only add categories that appear in the prompt.
  const interestRules = [
    ['Mountains', /\b(mountain|mountains|hill|hills|himalaya|himalayas)\b/i],
    ['Beaches', /\b(beach|beaches|sea|coast|coastal)\b/i],
    ['Adventure', /\b(adventure|trek|trekking|hiking|rafting|camping|paragliding)\b/i],
    ['Culture', /\b(culture|cultural|local traditions|festival|heritage)\b/i],
    ['Food', /\b(food|foodie|cuisine|street food|local dishes|restaurants|cafes)\b/i],
    ['Photography', /\b(photo|photography|photographer|picturesque|photo spots)\b/i],
    ['Relaxation', /\b(relax|relaxing|peaceful|peace|calm|slow travel|unwind)\b/i],
    ['History', /\b(history|historical|historic|forts|monuments|museums)\b/i],
    ['Nature', /\b(nature|natural beauty|scenery|scenic|forest|forests|waterfall|waterfalls|lake|lakes)\b/i],
  ];
  result.interests = interestRules
    .filter(([, pattern]) => pattern.test(text))
    .map(([interest]) => interest);

  if (/\b(cheap|cheapest|low[- ]cost|budget[- ]friendly|save money|backpack(er|ing)?)\b/i.test(text)) {
    result.travelStyle = 'budget';
  } else if (/\b(luxury|luxurious|premium|comfort|comfortable|resort|five[- ]star)\b/i.test(text)) {
    result.travelStyle = 'comfort';
  }

  return result;
}

export default function Discover() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const updated = { ...current, [name]: value };

      if (name === 'prompt') {
        const extracted = extractTripDetails(value);
        if (extracted.budget !== undefined) updated.budget = extracted.budget;
        if (extracted.duration !== undefined) updated.duration = extracted.duration;
        if (extracted.travellers !== undefined) updated.travellers = extracted.travellers;
        if (extracted.travelStyle !== undefined) updated.travelStyle = extracted.travelStyle;
        if (extracted.interests?.length) {
          updated.interests = [...new Set([
            ...current.interests.filter((item) => !extracted.interests.includes(item)),
            ...extracted.interests,
          ])];
        }
      }

      return updated;
    });

    setError('');
  }

  function toggleInterest(interest) {
    setForm((current) => {
      const selected = current.interests.includes(interest);

      return {
        ...current,
        interests: selected
          ? current.interests.filter((item) => item !== interest)
          : [...current.interests, interest],
      };
    });

    setError('');
  }

  function useSuggestion(prompt) {
    const extracted = extractTripDetails(prompt);
    setForm((current) => ({
      ...current,
      prompt,
      ...extracted,
      interests: extracted.interests?.length
        ? [...new Set([...current.interests, ...extracted.interests])]
        : current.interests,
    }));

    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setRecommendations([]);
    setHasSearched(false);

    const prompt = form.prompt.trim();
    const extracted = extractTripDetails(prompt);
    const budget = Number(extracted.budget ?? form.budget);
    const duration = Number(extracted.duration ?? form.duration);
    const travellers = Number(extracted.travellers ?? form.travellers);
    const interests = [...new Set([
      ...(Array.isArray(form.interests) ? form.interests : []),
      ...(extracted.interests || []),
    ])];
    const travelStyle = extracted.travelStyle ?? form.travelStyle;

    if (!prompt) {
      setError('Describe the kind of trip you want.');
      return;
    }

    if (prompt.length > 1000) {
      setError('Your description must be 1000 characters or fewer.');
      return;
    }

    if (!Number.isFinite(budget) || budget < 0) {
      setError('Enter a valid non-negative budget.');
      return;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 30) {
      setError('Trip duration must be between 1 and 30 days.');
      return;
    }

    if (
      !Number.isInteger(travellers) ||
      travellers < 1 ||
      travellers > 50
    ) {
      setError('Travellers must be between 1 and 50.');
      return;
    }

    setForm((current) => ({
      ...current,
      budget: String(budget),
      duration: String(duration),
      travellers: String(travellers),
      interests,
      travelStyle,
    }));

    setLoading(true);

    try {
      const response = await api.post('/discover/recommendations', {
        prompt,
        budget,
        duration,
        travellers,
        interests,
        travelStyle,
      });

      const results = response.data?.data?.recommendations;

      if (!Array.isArray(results) || results.length === 0) {
        throw new Error(
          'No destinations were returned. Please try another description.'
        );
      }

      setRecommendations(results);
      setHasSearched(true);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 401) {
        setError('Please log in again to discover destinations.');
      } else if (status === 429) {
        setError('Too many requests. Please wait and try again.');
      } else if (status === 400 && message) {
        setError(message);
      } else if (status === 502) {
        setError(
          'The AI service is temporarily unavailable. Please try again shortly.'
        );
      } else if (!err.response) {
        setError(
          'Could not connect to the server. Check that your backend is running.'
        );
      } else {
        setError(
          message || 'Something went wrong. Please try again.'
        );
      }

      console.error('Destination discovery failed:', err);
    } finally {
      setLoading(false);
    }
  }

  function selectDestination(destination) {
    navigate('/trip-planner', {
      state: {
        destination: destination.name,
        discovery: {
          prompt: form.prompt,
          budget: form.budget,
          duration: form.duration,
          travellers: form.travellers,
          interests: form.interests,
          travelStyle: form.travelStyle,
        },
      },
    });
  }

  function resetSearch() {
    setForm(initialForm);
    setRecommendations([]);
    setError('');
    setHasSearched(false);
  }

  return (
    <main className="discover-page">
      <header className="discover-nav">
        <Link to="/" className="discover-brand">
          WanderPlan <span>AI</span>
        </Link>

        <nav className="discover-nav-links">
          <Link to="/explore">Explore</Link>
          <Link to="/trip-planner">Trip Planner</Link>
          <Link to="/my-trips">My Trips</Link>
        </nav>
      </header>

      <section className="discover-hero">
        <div className="discover-hero-content">
          <Link to="/" className="discover-back-link">
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <span className="discover-eyebrow">
            <Sparkles size={15} />
            YOUR PERSONAL TRAVEL DISCOVERY
          </span>

          <h1>
            Tell us your mood.
            <br />
            <span>We’ll find your place.</span>
          </h1>

          <p>
            Describe your dream getaway in your own words.
            Get destination ideas tailored to your interests,
            budget and travel style.
          </p>
        </div>
      </section>

      <section className="discover-main">
        <form className="discover-form" onSubmit={handleSubmit}>
          <div className="discover-form-heading">
            <div>
              <span className="discover-step-label">YOUR NEXT ADVENTURE</span>
              <h2>What are you in the mood for?</h2>
              <p>
                Tell us what you want to experience. We’ll take it from there.
              </p>
            </div>

            <div className="discover-heading-icon">
              <Compass size={28} />
            </div>
          </div>

          <label className="discover-label" htmlFor="discover-prompt">
            Describe your ideal trip
          </label>

          <textarea
            id="discover-prompt"
            name="prompt"
            className="discover-prompt-input"
            value={form.prompt}
            onChange={updateField}
            placeholder="For example: I want a peaceful mountain getaway for 4 days, with scenic views, photography spots and a budget of ₹12,000..."
            maxLength={1000}
            rows={5}
            disabled={loading}
            required
          />

          <div className="discover-character-count">
            <span>Be as specific as you like</span>
            <span>{form.prompt.length}/1000</span>
          </div>

          <div className="discover-suggestions-heading">
            <span>Need inspiration?</span>
            <span>Try an idea</span>
          </div>

          <div className="discover-suggestions">
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon;

              return (
                <button
                  key={suggestion.title}
                  type="button"
                  className="discover-suggestion"
                  onClick={() => useSuggestion(suggestion.prompt)}
                  disabled={loading}
                >
                  <Icon size={19} />
                  <span>{suggestion.title}</span>
                  <ArrowRight size={15} />
                </button>
              );
            })}
          </div>

          <div className="discover-form-divider" />

          <div className="discover-fields-heading">
            <h3>Personalize your recommendations</h3>
            <p>These details help us find a better match.</p>
          </div>

          <div className="discover-input-grid">
            <div className="discover-field">
              <label htmlFor="discover-budget">
                <Wallet size={17} />
                Total budget (₹)
              </label>

              <input
                id="discover-budget"
                name="budget"
                type="number"
                min="0"
                max="100000000"
                step="500"
                value={form.budget}
                onChange={updateField}
                disabled={loading}
                required
              />
              <small>For your entire group</small>
            </div>

            <div className="discover-field">
              <label htmlFor="discover-duration">
                <CalendarDays size={17} />
                Duration
              </label>

              <select
                id="discover-duration"
                name="duration"
                value={form.duration}
                onChange={updateField}
                disabled={loading}
              >
                {Array.from({ length: 30 }, (_, index) => index + 1).map(
                  (days) => (
                    <option key={days} value={days}>
                      {days} {days === 1 ? 'day' : 'days'}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="discover-field">
              <label htmlFor="discover-travellers">
                <Users size={17} />
                Travellers
              </label>

              <input
                id="discover-travellers"
                name="travellers"
                type="number"
                min="1"
                max="50"
                value={form.travellers}
                onChange={updateField}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="discover-interest-section">
            <label className="discover-label">What do you enjoy?</label>

            <div className="discover-interest-list">
              {interestOptions.map((interest) => {
                const selected = form.interests.includes(interest);

                return (
                  <button
                    type="button"
                    key={interest}
                    className={`discover-interest ${
                      selected ? 'is-selected' : ''
                    }`}
                    onClick={() => toggleInterest(interest)}
                    disabled={loading}
                    aria-pressed={selected}
                  >
                    {selected && <span aria-hidden="true">✓</span>}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="discover-style-section">
            <label className="discover-label">Your travel style</label>

            <div className="discover-style-options">
              {styles.map((style) => (
                <button
                  type="button"
                  key={style.value}
                  className={`discover-style-option ${
                    form.travelStyle === style.value ? 'is-selected' : ''
                  }`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      travelStyle: style.value,
                    }))
                  }
                  disabled={loading}
                  aria-pressed={form.travelStyle === style.value}
                >
                  <span>{style.label}</span>
                  <small>{style.description}</small>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="discover-error" role="alert">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="discover-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="discover-spinner" size={20} />
                Finding your destinations...
              </>
            ) : (
              <>
                <Sparkles size={19} />
                Discover destinations
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="discover-form-note">
            Destination and budget estimates are AI-generated suggestions,
            not live prices or confirmed bookings.
          </p>
        </form>

        {loading && (
          <section className="discover-loading" aria-live="polite">
            <div className="discover-loading-icon">
              <Sparkles size={28} />
            </div>
            <h2>Finding your kind of place...</h2>
            <p>
              Matching your preferences with destinations and travel
              experiences.
            </p>
          </section>
        )}

        {!loading && hasSearched && recommendations.length > 0 && (
          <section className="discover-results" aria-live="polite">
            <div className="discover-results-heading">
              <div>
                <span className="discover-step-label">
                  YOUR PERSONALIZED SHORTLIST
                </span>
                <h2>Places you might love</h2>
                <p>
                  Compare these suggestions and choose where you want to go.
                </p>
              </div>

              <button
                type="button"
                className="discover-reset-button"
                onClick={resetSearch}
              >
                <RefreshCw size={16} />
                Start again
              </button>
            </div>

            <div className="discover-results-grid">
              {recommendations.map((destination, index) => (
                <article
                  className="discover-destination-card"
                  key={`${destination.name}-${index}`}
                >
                  <div className="discover-card-top">
                    <div className="discover-card-number">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <span className="discover-card-duration">
                      <CalendarDays size={14} />
                      {destination.durationDays}{' '}
                      {destination.durationDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <div className="discover-card-location">
                    <MapPin size={15} />
                    {[destination.region, destination.country]
                      .filter(Boolean)
                      .join(', ')}
                  </div>

                  <h3>{destination.name}</h3>

                  {destination.tagline && (
                    <p className="discover-card-tagline">
                      {destination.tagline}
                    </p>
                  )}

                  {destination.reason && (
                    <p className="discover-card-reason">
                      {destination.reason}
                    </p>
                  )}

                  {destination.highlights?.length > 0 && (
                    <div className="discover-card-highlights">
                      <span>Highlights</span>
                      <ul>
                        {destination.highlights.slice(0, 4).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="discover-card-info">
                    <div>
                      <span>Estimated group budget</span>
                      <strong>
                        {formatINR(destination.estimatedBudget)}
                      </strong>
                    </div>

                    {destination.bestTimeToVisit && (
                      <div>
                        <span>Best time to visit</span>
                        <strong>{destination.bestTimeToVisit}</strong>
                      </div>
                    )}
                  </div>

                  {destination.budgetNote && (
                    <p className="discover-budget-note">
                      {destination.budgetNote}
                    </p>
                  )}

                  <button
                    type="button"
                    className="discover-select-button"
                    onClick={() => selectDestination(destination)}
                  >
                    Plan this trip
                    <ArrowRight size={17} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      <footer className="discover-footer">
        <Link to="/" className="discover-brand">
          WanderPlan <span>AI</span>
        </Link>
        <p>Thoughtful plans. Unforgettable journeys.</p>
      </footer>
    </main>
  );
}