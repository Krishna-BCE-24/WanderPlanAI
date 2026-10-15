import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  AuthProvider,
  useAuth,
} from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Discover from './pages/Discover.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import api from './services/api.js';
import MapView from './components/maps/MapView.jsx';
import DestinationGlobe from './components/globe/DestinationGlobe.jsx';
import BudgetPlanner from './components/budget/BudgetPlanner.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ResendVerification from './pages/ResendVerification.jsx';
import {
  Compass,
  MapPin,
  CalendarDays,
  Users,
  Wallet,
  Sparkles,
  ArrowLeft,
  Clock,
  Mountain,
  Heart,
  Globe,
  Plane,
  TrainFront,
  Bus,
  CarFront,
  Route as RouteIcon,
  CheckCircle2,
  Pencil,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import './App.css';
import './index.css';
import './Mapbox_Styles.css';

/* -------------------- TRANSPORT ICON -------------------- */
function TransportIcon({ transport, size = 22 }) {
  const type = String(transport || 'flexible').toLowerCase().trim();
  const props = { size, 'aria-hidden': true };

  switch (type) {
    case 'flight':
    case 'plane':
    case 'air':
      return <Plane {...props} />;
    case 'train':
      return <TrainFront {...props} />;
    case 'bus':
      return <Bus {...props} />;
    case 'car':
    case 'road trip':
    case 'road-trip':
      return <CarFront {...props} />;
    case 'flexible':
    default:
      return <RouteIcon {...props} />;
  }
}

/* -------------------- GLOBAL TOAST NOTIFICATIONS -------------------- */
function showToast(message, type = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('wanderplan:toast', {
      detail: { message, type },
    }),
  );
}

function ToastViewport() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const detail = event.detail || {};
      if (!detail.message) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast = {
        id,
        message: String(detail.message),
        type: ['success', 'error', 'info'].includes(detail.type)
          ? detail.type
          : 'success',
      };

      setToasts((current) => [...current, toast].slice(-4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 4200);
    };

    window.addEventListener('wanderplan:toast', handleToast);
    return () => window.removeEventListener('wanderplan:toast', handleToast);
  }, []);

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <div className="wp-toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <section
          key={toast.id}
          className={`wp-toast wp-toast-${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span className="wp-toast-icon" aria-hidden="true">
            {toast.type === 'success' ? (
              <CheckCircle2 size={22} />
            ) : toast.type === 'error' ? (
              <X size={22} />
            ) : (
              <Sparkles size={22} />
            )}
          </span>
          <p>{toast.message}</p>
          <button
            type="button"
            className="wp-toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
          <span className="wp-toast-progress" />
        </section>
      ))}
    </div>
  );
}

/* -------------------- HOME PAGE -------------------- */
function HomePage() {
  const { user, logout } = useAuth();
  async function handleLogout() {
    try {
      await logout();
      showToast('You have been logged out successfully.', 'success');
    } catch (error) {
      showToast('Logout failed. Please try again.', 'error');
      console.error('Logout failed:', error);
    }
  }
  return (
    <main className="wander-home">
      <header className="wander-navbar">
        <Link to="/" className="wander-brand">
          WanderPlan <span>AI</span>
        </Link>
        <nav className="wander-nav-links">
          <Link to="/explore">Explore</Link>
          <Link to="/trip-planner">Trip Planner</Link>
          <Link to="/discover">AI Trip Discovery</Link>
          <a href="/#destinations">Destinations</a>
        </nav>
        <div className="wander-auth-links">
          {user ? (
            <>
              <span className="wander-user">
                Hi, {user.name.split(' ')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="wander-button"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="wander-login">
                Log in
              </Link>
              <Link to="/signup" className="wander-button">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>
      <section className="wander-hero" id="explore">
        <div className="wander-hero-content">
          <span className="wander-eyebrow">
            YOUR NEXT ADVENTURE STARTS HERE
          </span>
          <h1>
            Explore more.
            <br />
            <span>Plan smarter.</span>
          </h1>
          <p>
            Discover destinations, create personalized itineraries
            and plan your next journey with WanderPlan AI.
          </p>
          <div className="wander-hero-actions">
            <Link to="/trip-planner" className="wander-button">
              Plan my trip →
            </Link>
            <Link to="/discover" className="wander-secondary-button">
              <Sparkles size={17} /> Discover with AI
            </Link>
            <Link
              to="/explore"
              className="wander-secondary-button"
            >
              Explore destinations
            </Link>
          </div>
          <div className="wander-highlights">
            <div>
              <strong>AI-powered</strong>
              <span>Personalized plans</span>
            </div>
            <div>
              <strong>Day by day</strong>
              <span>Organized itineraries</span>
            </div>
            <div>
              <strong>Budget aware</strong>
              <span>Plan with confidence</span>
            </div>
          </div>
        </div>
        <div className="wander-hero-visual" aria-label="Travel planning">
          <div className="wander-visual-card wander-card-top">
            <span>✦ Smart planning</span>
            <strong>Your journey, your way</strong>
          </div>
          <div className="wander-globe">
            <div className="wander-globe-inner">🌍</div>
            <span className="wander-orbit wander-orbit-one" />
            <span className="wander-orbit wander-orbit-two" />
          </div>
          <div className="wander-visual-card wander-card-bottom">
            <span>✈️</span>
            <div>
              <strong>Adventure awaits</strong>
              <small>Make every journey count</small>
            </div>
          </div>
        </div>
      </section>
      <section className="wander-features" id="planner">
        <div className="wander-section-heading">
          <span className="wander-eyebrow">TRAVEL, REIMAGINED</span>
          <h2>Your journey, simplified.</h2>
          <p>
            Everything you need to turn travel ideas into a real plan.
          </p>
        </div>
        <div className="wander-feature-grid">
          <article className="wander-feature-card">
            <span className="wander-feature-icon">✦</span>
            <h3>AI Trip Discovery</h3>
            <p>Describe your ideal getaway in your own words and get destination ideas tailored to you.</p>
            <Link to="/discover">Find my destination →</Link>
          </article>
          <article className="wander-feature-card" id="destinations">
            <span className="wander-feature-icon">◎</span>
            <h3>Discover places</h3>
            <p>Find destinations that match your travel style.</p>
            <Link to="/explore">Explore places →</Link>
          </article>
          <article className="wander-feature-card">
            <span className="wander-feature-icon">↗</span>
            <h3>Smart budget</h3>
            <p>Organize expected travel costs before you leave.</p>
            <Link to="/budget-planner">Plan your budget →</Link>
          </article>
        </div>
      </section>
      <footer className="wander-footer">
        <Link to="/" className="wander-brand">
          WanderPlan <span>AI</span>
        </Link>
        <p>Thoughtful plans. Unforgettable journeys.</p>
      </footer>
    </main>
  );
}
/* -------------------- TRIP PLANNER -------------------- */
const initialTrip = {
  destination: '',
  origin: '',
  startDate: '',
  endDate: '',
  adults: '2',
  children: '0',
  budget: '20000',
  travelStyle: 'balanced',
  transport: 'flight',
  interests: ['Nature'],
};
const interestOptions = [
  'Nature',
  'Adventure',
  'Mountains',
  'Beaches',
  'Culture',
  'Food',
  'History',
  'Shopping',
];
function TripPlannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [trip, setTrip] = useState(() => ({
    ...initialTrip,
    destination: location.state?.destination || '',
  }));
const [error, setError] = useState('');
const [success, setSuccess] = useState(false);
const [generatedTrip, setGeneratedTrip] = useState(null);
const [saving, setSaving] = useState(false);
  function updateField(event) {
    const { name, value } = event.target;
    setTrip((current) => ({ ...current, [name]: value }));
    setError('');
  }
  function toggleInterest(interest) {
    setTrip((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setGeneratedTrip(null);
    if (!trip.destination.trim()) {
      setError('Please enter your destination.');
      return;
    }
    if (!trip.origin.trim()) {
      setError('Please enter your starting location.');
      return;
    }
    if (!trip.startDate || !trip.endDate) {
      setError('Please select your travel dates.');
      return;
    }
    if (trip.endDate < trip.startDate) {
      setError('Return date cannot be before departure date.');
      return;
    }
    if (!Number.isInteger(Number(trip.adults)) ||
        Number(trip.adults) < 1 ||
        Number(trip.adults) > 10) {
      setError('Please select between 1 and 10 adults.');
      return;
    }
    if (!Number.isInteger(Number(trip.children)) ||
        Number(trip.children) < 0 ||
        Number(trip.children) > 6) {
      setError('Please select between 0 and 6 children.');
      return;
    }
    if (!Number.isFinite(Number(trip.budget)) ||
        Number(trip.budget) < 1 ||
        Number(trip.budget) > 100000000) {
      setError('Please enter a valid total trip budget.');
      return;
    }
    if (trip.interests.length === 0) {
      setError('Please select at least one interest.');
      return;
    }
    const result = {
      ...trip,
      origin: trip.origin.trim(),
      destination: trip.destination.trim(),
      adults: Number(trip.adults),
      children: Number(trip.children),
      budget: Number(trip.budget),
      totalTravellers: Number(trip.adults) + Number(trip.children),
    };
    setSaving(true);
    try {
      const response = await api.post('/trips', {
        origin: result.origin,
        destination: result.destination,
        startDate: result.startDate,
        endDate: result.endDate,
        adults: result.adults,
        children: result.children,
        budget: result.budget,
        travelStyle: result.travelStyle,
        transport: result.transport,
        interests: result.interests,
      });
      if (!response.data?.success || !response.data?.trip) {
        throw new Error('The server did not confirm that the trip was saved.');
      }
      setGeneratedTrip({
        ...result,
        id: response.data.trip._id,
        status: response.data.trip.status,
        createdAt: response.data.trip.createdAt,
      });
      setSuccess(true);
      showToast('Trip saved successfully!', 'success');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        const message = requestError.response?.data?.message ||
          requestError.message ||
          'Unable to save your trip. Please try again.';
        setError(message);
        showToast(message, 'error');
      }
    } finally {
      setSaving(false);
    }
  }
  function resetForm() {
    setTrip(initialTrip);
    setError('');
    setSuccess(false);
    setSaving(false);
    setGeneratedTrip(null);
  }
  return (
    <main className="trip-page">
      <header className="trip-navbar">
        <Link to="/" className="wander-brand">
          WanderPlan <span>AI</span>
        </Link>
        <nav className="trip-nav-links">
          <Link to="/explore">Explore</Link>
          <Link to="/my-trips">My Trips</Link>
          <Link to="/budget-planner">Budget Planner</Link>
        </nav>
        <div className="trip-nav-user">
          <span>Hi, {user?.name?.split(' ')[0] || 'Traveller'}</span>
          <button
            className="trip-back-button"
            onClick={() => navigate('/')}
            type="button"
          >
            Home
          </button>
        </div>
      </header>
      <section className="trip-intro">
        <span className="trip-eyebrow">
          <Sparkles size={15} /> YOUR NEXT ADVENTURE STARTS HERE
        </span>
        <h1>
          Let's plan your <span>next journey.</span>
        </h1>
        <p>
          Tell us what your ideal trip looks like. We'll use your
          preferences to prepare the next step of your travel plan.
        </p>
      </section>
      <div className="trip-layout">
        <form className="trip-form" onSubmit={handleSubmit}>
          <div className="trip-form-heading">
            <div>
              <span className="trip-step-label">TRIP DETAILS</span>
              <h2>Build your trip</h2>
            </div>
            <Compass size={30} />
          </div>
          <div className="trip-field-grid">
            <label className="trip-field">
              <span><MapPin size={16} /> Starting location</span>
              <input
                name="origin"
                value={trip.origin}
                onChange={updateField}
                placeholder="e.g. Bhopal, India"
                autoComplete="off"
                required
              />
            </label>
            <label className="trip-field">
              <span><Globe size={16} /> Destination</span>
              <input
                name="destination"
                value={trip.destination}
                onChange={updateField}
                placeholder="e.g. Manali, India"
                autoComplete="off"
                required
              />
            </label>
          </div>
          <div className="trip-field-grid">
            <label className="trip-field">
              <span><CalendarDays size={16} /> Departure date</span>
              <input
                type="date"
                name="startDate"
                value={trip.startDate}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={updateField}
                required
              />
            </label>
            <label className="trip-field">
              <span><CalendarDays size={16} /> Return date</span>
              <input
                type="date"
                name="endDate"
                value={trip.endDate}
                min={trip.startDate || new Date().toLocaleDateString('en-CA')}
                onChange={updateField}
                required
              />
            </label>
          </div>
          <div className="trip-section-divider" />
          <div className="trip-field-grid">
            <label className="trip-field">
              <span><Users size={16} /> Adults</span>
              <select name="adults" value={trip.adults} onChange={updateField}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map(
                  (count) => (
                    <option key={count} value={String(count)}>
                      {count} {count === 1 ? 'adult' : 'adults'}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="trip-field">
              <span><Users size={16} /> Children</span>
              <select
                name="children"
                value={trip.children}
                onChange={updateField}
              >
                {Array.from({ length: 7 }, (_, index) => index).map(
                  (count) => (
                    <option key={count} value={String(count)}>
                      {count} {count === 1 ? 'child' : 'children'}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label className="trip-field">
            <span><Wallet size={16} /> Total trip budget (INR)</span>
            <input
              type="number"
              name="budget"
              min="1"
              max="100000000"
              value={trip.budget}
              onChange={updateField}
              placeholder="e.g. 20000"
              required
            />
            <small>Enter the total budget for all travellers.</small>
          </label>
          <div className="trip-field">
            <span className="trip-label-title">
              <Heart size={16} /> What do you enjoy?
            </span>
            <div className="trip-interest-grid">
              {interestOptions.map((interest) => {
                const selected = trip.interests.includes(interest);
                return (
                  <button
                    type="button"
                    key={interest}
                    className={`trip-interest ${selected ? 'selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleInterest(interest)}
                  >
                    {selected && <CheckCircle2 size={15} />}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="trip-section-divider" />
          <div className="trip-field">
            <span className="trip-label-title">
              <Sparkles size={16} /> Choose your travel style
            </span>
            <div className="trip-style-grid">
              {[
                {
                  id: 'budget',
                  title: 'Budget',
                  description: 'Keep costs low',
                },
                {
                  id: 'balanced',
                  title: 'Balanced',
                  description: 'Comfort and value',
                },
                {
                  id: 'comfort',
                  title: 'Comfort',
                  description: 'Prioritize comfort',
                },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`trip-style-card ${
                    trip.travelStyle === style.id ? 'selected' : ''
                  }`}
                  aria-pressed={trip.travelStyle === style.id}
                  onClick={() =>
                    setTrip((current) => ({
                      ...current,
                      travelStyle: style.id,
                    }))
                  }
                >
                  <strong>{style.title}</strong>
                  <small>{style.description}</small>
                </button>
              ))}
            </div>
          </div>
          <label className="trip-field">
            <span><Plane size={16} /> Preferred transport</span>
            <select
              name="transport"
              value={trip.transport}
              onChange={updateField}
            >
              <option value="flight">Flight</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="car">Car / Road trip</option>
              <option value="flexible">Flexible — suggest options</option>
            </select>
          </label>
          {error && (
            <p className="trip-error" role="alert">{error}</p>
          )}
          <button
              type="submit"
              className="trip-submit-button"
              disabled={saving}
            >
              <Sparkles size={18} />
              {saving ? 'Saving your trip...' : 'Save and review trip'}
            </button>
          <p className="trip-form-note">
            Your trip details will be saved to your account. AI itinerary generation will be added next.
          </p>
        </form>
        <aside className="trip-sidebar">
          <div className="trip-sidebar-visual">
            <div className="trip-sidebar-icon"><Mountain size={30} /></div>
            <span>TRAVEL YOUR WAY</span>
            <h2>Every great trip starts with an idea.</h2>
            <p>
              Choose your destination, set your budget and make room
              for unforgettable experiences.
            </p>
          </div>
          <div className="trip-sidebar-card">
            <h3><Clock size={18} /> Your trip checklist</h3>
            <ul>
              <li><CheckCircle2 size={17} /> Choose your destination</li>
              <li><CheckCircle2 size={17} /> Set your travel dates</li>
              <li><CheckCircle2 size={17} /> Decide your budget</li>
              <li><CheckCircle2 size={17} /> Pick your interests</li>
            </ul>
          </div>
          <div className="trip-sidebar-tip">
            <Sparkles size={18} />
            <p>
              <strong>Travel tip</strong>
              <br />
              Keep some budget aside for local transport and unexpected
              expenses.
            </p>
          </div>
        </aside>
      </div>
      {success && generatedTrip && (
        <div
          className="trip-modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSuccess(false);
            }
          }}
        >
          <section
            className="trip-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-review-title"
          >
            <button
              className="trip-modal-close"
              type="button"
              onClick={() => setSuccess(false)}
              aria-label="Close review"
            >
              ×
            </button>
            <div className="trip-review-icon"><CheckCircle2 size={30} /></div>
            <span className="trip-eyebrow">TRIP SAVED SUCCESSFULLY</span>
              <h2 id="trip-review-title">Your trip is saved!</h2>
              <p className="trip-review-description">
                Your trip details have been saved to your WanderPlan AI account.
              </p>
            <div className="trip-review-details">
              <div><span>From</span><strong>{generatedTrip.origin}</strong></div>
              <div><span>Destination</span><strong>{generatedTrip.destination}</strong></div>
              <div>
                <span>Dates</span>
                <strong>{generatedTrip.startDate} → {generatedTrip.endDate}</strong>
              </div>
              <div>
                <span>Travellers</span>
                <strong>{generatedTrip.totalTravellers}</strong>
              </div>
              <div>
                <span>Total budget</span>
                <strong>₹{generatedTrip.budget.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span>Travel style</span>
                <strong>
                  {generatedTrip.travelStyle.charAt(0).toUpperCase() +
                    generatedTrip.travelStyle.slice(1)}
                </strong>
              </div>
              <div>
                <span>Transport</span>
                <strong>{generatedTrip.transport}</strong>
              </div>
              <div>
                <span>Interests</span>
                <strong>{generatedTrip.interests.join(', ')}</strong>
              </div>
              {generatedTrip.id && (
                <div>
                  <span>Trip status</span>
                  <strong>{generatedTrip.status || 'draft'}</strong>
                </div>
              )}
            </div>
            <p className="trip-review-note">
              Your trip is saved in your account. The AI-generated day-wise itinerary will be added in the next step.
            </p>
            <div className="trip-review-actions">
              <button
                type="button"
                className="trip-secondary-action"
                onClick={() => setSuccess(false)}
              >
                Edit details
              </button>
              <button
                type="button"
                className="trip-submit-button"
                onClick={resetForm}
              >
                Plan another trip
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
/* -------------------- MY TRIPS PAGE -------------------- */
function MyTripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTrip, setEditingTrip] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [deletingTripId, setDeletingTripId] = useState('');
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => {
    let active = true;
    async function fetchTrips() {
      try {
        const response = await api.get('/trips');
        if (active) {
          setTrips(Array.isArray(response.data?.trips) ? response.data.trips : []);
          setError('');
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.status === 401
              ? 'Your session has expired. Please log in again.'
              : requestError.response?.data?.message ||
                  'Could not load your trips. Please try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchTrips();
    return () => {
      active = false;
    };
  }, []);

  function openEditTrip(trip) {
    setEditingTrip({
      ...trip,
      adults: String(trip.travellers?.adults ?? 1),
      children: String(trip.travellers?.children ?? 0),
      startDate: trip.startDate ? String(trip.startDate).slice(0, 10) : '',
      endDate: trip.endDate ? String(trip.endDate).slice(0, 10) : '',
      budget: String(trip.budget ?? 0),
      interests: Array.isArray(trip.interests) ? [...trip.interests] : [],
    });
    setEditError('');
    setEditSuccess('');
  }

  function updateEditingTrip(field, value) {
    setEditingTrip((current) => current ? { ...current, [field]: value } : current);
    setEditError('');
  }

  function toggleEditingInterest(interest) {
    setEditingTrip((current) => {
      if (!current) return current;
      const interests = current.interests || [];
      return { ...current, interests: interests.includes(interest)
        ? interests.filter((item) => item !== interest) : [...interests, interest] };
    });
    setEditError('');
  }

  async function saveTripEdits(event) {
    event.preventDefault();
    if (!editingTrip) return;
    if (!editingTrip.origin?.trim() || !editingTrip.destination?.trim()) {
      setEditError('Starting location and destination are required.'); return;
    }
    if (!editingTrip.startDate || !editingTrip.endDate || editingTrip.endDate < editingTrip.startDate) {
      setEditError('Please select valid travel dates.'); return;
    }
    const budget = Number(editingTrip.budget);
    const adults = Number(editingTrip.adults);
    const children = Number(editingTrip.children);
    if (!Number.isFinite(budget) || budget < 1) { setEditError('Please enter a valid budget.'); return; }
    if (!Number.isInteger(adults) || adults < 1 || adults > 10 ||
        !Number.isInteger(children) || children < 0 || children > 6) {
      setEditError('Choose 1–10 adults and 0–6 children.'); return;
    }
    if (!editingTrip.interests?.length) { setEditError('Please select at least one interest.'); return; }
    setEditSaving(true); setEditError(''); setEditSuccess('');
    try {
      const response = await api.put(`/trips/${editingTrip._id}`, {
        origin: editingTrip.origin.trim(), destination: editingTrip.destination.trim(),
        startDate: editingTrip.startDate, endDate: editingTrip.endDate, budget, adults, children,
        travelStyle: editingTrip.travelStyle, transport: editingTrip.transport, interests: editingTrip.interests,
      });
      if (!response.data?.success || !response.data?.trip) throw new Error('The server did not confirm the trip update.');
      setTrips((current) => current.map((item) => item._id === editingTrip._id ? response.data.trip : item));
      setEditingTrip(null);
      setEditSuccess('Trip updated successfully.');
      showToast('Trip updated successfully.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Could not update this trip.';
      setEditError(message);
      showToast(message, 'error');
    } finally { setEditSaving(false); }
  }

  async function handleDeleteTrip(trip) {
    const label = trip.title || `${trip.destination || 'this'} Trip`;
    if (!window.confirm(`Delete "${label}" permanently? This will also remove its itinerary.`)) return;
    setDeletingTripId(trip._id); setDeleteError(''); setEditSuccess('');
    try {
      const response = await api.delete(`/trips/${trip._id}`);
      if (!response.data?.success) throw new Error('The server did not confirm the trip deletion.');
      setTrips((current) => current.filter((item) => item._id !== trip._id));
      showToast('Trip deleted successfully.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Could not delete this trip.';
      setDeleteError(message);
      showToast(message, 'error');
    } finally { setDeletingTripId(''); }
  }

  return (
    <main className="wander-placeholder my-trips-page">
      <header className="my-trips-header">
        <Link to="/" className="wander-brand">
          WanderPlan <span>AI</span>
        </Link>
        <nav className="my-trips-nav">
          <Link to="/trip-planner">Plan a trip</Link>
          <Link to="/budget-planner">Budget Planner</Link>
        </nav>
      </header>
      <section className="my-trips-intro">
        <span className="trip-eyebrow">
          <Compass size={15} /> YOUR TRAVEL COLLECTION
        </span>
        <h1>My <span>Trips</span></h1>
        <p>All your saved journeys in one place.</p>
      </section>
      {editSuccess && <p className="trip-success-message" role="status">{editSuccess}</p>}
      {deleteError && <p className="trip-error" role="alert">{deleteError}</p>}
      {loading && (
        <div className="my-trips-message" role="status">
          <div className="auth-spinner" />
          <p>Loading your trips...</p>
        </div>
      )}
      {!loading && error && (
        <section className="my-trips-message" role="alert">
          <h2>We couldn't load your trips</h2>
          <p>{error}</p>
          {error.includes('session has expired') ? (
            <Link to="/login" className="wander-button">Log in again</Link>
          ) : (
            <button
              type="button"
              className="wander-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          )}
        </section>
      )}
      {!loading && !error && trips.length === 0 && (
        <section className="my-trips-empty">
          <div className="my-trips-empty-icon"><Globe size={32} /></div>
          <h2>No trips saved yet</h2>
          <p>Your next adventure starts with a plan. Create your first trip to see it here.</p>
          <Link to="/trip-planner" className="wander-button">
            <Sparkles size={17} /> Plan my first trip
          </Link>
        </section>
      )}
      {!loading && !error && trips.length > 0 && (
        <>
          <div className="my-trips-summary">
            <strong>{trips.length}</strong>
            <span>{trips.length === 1 ? 'saved trip' : 'saved trips'}</span>
            <Link to="/trip-planner" className="wander-button">
              <Sparkles size={17} /> Plan another trip
            </Link>
          </div>
          <section className="my-trips-grid" aria-label="Saved trips">
            {trips.map((trip) => {
              const adults = Number(trip.travellers?.adults || 0);
              const children = Number(trip.travellers?.children || 0);
              const travellerCount = adults + children;
              const status = trip.status || 'draft';
              const formatDate = (date) => {
                if (!date) return 'Not set';
                const parsed = new Date(date);
                return Number.isNaN(parsed.getTime())
                  ? 'Not set'
                  : parsed.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
              };
              return (
                <article className="my-trip-card" key={trip._id}>
                  <div className="my-trip-card-top">
                    <span className={`my-trip-status status-${status}`}>
                      {status}
                    </span>
                    <span className="my-trip-transport">
                      <TransportIcon transport={trip.transport} size={15} /> {trip.transport || 'flexible'}
                    </span>
                  </div>
                  <h2>{trip.title || `${trip.destination || 'Trip'} Trip`}</h2>
                  <p className="my-trip-route">
                    <MapPin size={16} />
                    <span>{trip.origin || 'Starting point'}</span>
                    <span className="my-trip-route-arrow">→</span>
                    <span>{trip.destination || 'Destination'}</span>
                  </p>
                  <div className="my-trip-info">
                    <div>
                      <CalendarDays size={17} />
                      <span>
                        {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                      </span>
                    </div>
                    <div>
                      <Wallet size={17} />
                      <span>₹{Number(trip.budget || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <Users size={17} />
                      <span>
                        {travellerCount} {travellerCount === 1 ? 'traveller' : 'travellers'}
                      </span>
                    </div>
                  </div>
                  <div className="my-trip-card-bottom">
                    <span className="my-trip-style">
                      {trip.travelStyle || 'balanced'} travel
                    </span>
                    <span className="my-trip-interest">
                      {(trip.interests || []).slice(0, 2).join(' · ') || 'Explore'}
                    </span>
                  </div>
                  <Link
                    to={`/trips/${trip._id}`}
                    className="my-trip-details-link"
                    aria-label={`View details for ${trip.title || trip.destination || 'trip'}`}
                  >
                    View trip details <span aria-hidden="true">→</span>
                  </Link>
                  <div className="my-trip-management-actions">
                    <button type="button" className="my-trip-edit-button" onClick={() => openEditTrip(trip)}>
                      <Pencil size={15} /> Edit trip
                    </button>
                    <button type="button" className="my-trip-delete-button" onClick={() => handleDeleteTrip(trip)} disabled={deletingTripId === trip._id}>
                      <Trash2 size={15} /> {deletingTripId === trip._id ? 'Deleting…' : 'Delete trip'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
      {editingTrip && (
        <div className="trip-modal-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget && !editSaving) setEditingTrip(null);
        }}>
          <section className="trip-review-modal my-trip-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-trip-title">
            <button className="trip-modal-close" type="button" onClick={() => !editSaving && setEditingTrip(null)} aria-label="Close edit form"><X size={20} /></button>
            <span className="trip-eyebrow">UPDATE YOUR JOURNEY</span>
            <h2 id="edit-trip-title">Edit trip details</h2>
            <form className="my-trip-edit-form" onSubmit={saveTripEdits}>
              <label>Starting location<input value={editingTrip.origin || ''} onChange={(event) => updateEditingTrip('origin', event.target.value)} required /></label>
              <label>Destination<input value={editingTrip.destination || ''} onChange={(event) => updateEditingTrip('destination', event.target.value)} required /></label>
              <div className="my-trip-edit-two-column">
                <label>Departure date<input type="date" value={editingTrip.startDate} onChange={(event) => updateEditingTrip('startDate', event.target.value)} required /></label>
                <label>Return date<input type="date" min={editingTrip.startDate || undefined} value={editingTrip.endDate} onChange={(event) => updateEditingTrip('endDate', event.target.value)} required /></label>
              </div>
              <label>Total budget (₹)<input type="number" min="1" value={editingTrip.budget} onChange={(event) => updateEditingTrip('budget', event.target.value)} required /></label>
              <div className="my-trip-edit-two-column">
                <label>Adults<select value={editingTrip.adults} onChange={(event) => updateEditingTrip('adults', event.target.value)}>{Array.from({length:10},(_,i)=>i+1).map((n)=><option key={n} value={String(n)}>{n}</option>)}</select></label>
                <label>Children<select value={editingTrip.children} onChange={(event) => updateEditingTrip('children', event.target.value)}>{Array.from({length:7},(_,i)=>i).map((n)=><option key={n} value={String(n)}>{n}</option>)}</select></label>
              </div>
              <label>Travel style<select value={editingTrip.travelStyle || 'balanced'} onChange={(event) => updateEditingTrip('travelStyle', event.target.value)}><option value="budget">Budget</option><option value="balanced">Balanced</option><option value="comfort">Comfort</option></select></label>
              <label>Preferred transport<select value={editingTrip.transport || 'flexible'} onChange={(event) => updateEditingTrip('transport', event.target.value)}><option value="flight">Flight</option><option value="train">Train</option><option value="bus">Bus</option><option value="car">Car / Road trip</option><option value="flexible">Flexible</option></select></label>
              <div className="my-trip-edit-interests"><span>Interests</span><div className="trip-interest-grid">
                {['Nature','Adventure','Mountains','Beaches','Culture','Food','History','Shopping'].map((interest)=><button type="button" key={interest} className={`trip-interest ${(editingTrip.interests||[]).includes(interest)?'selected':''}`} aria-pressed={(editingTrip.interests||[]).includes(interest)} onClick={()=>toggleEditingInterest(interest)}>{(editingTrip.interests||[]).includes(interest)&&<CheckCircle2 size={15}/>} {interest}</button>)}
              </div></div>
              {editError && <p className="trip-error" role="alert">{editError}</p>}
              <div className="trip-review-actions">
                <button type="button" className="trip-secondary-action" onClick={()=>setEditingTrip(null)} disabled={editSaving}>Cancel</button>
                <button type="submit" className="trip-submit-button" disabled={editSaving}><Save size={17}/> {editSaving?'Saving…':'Save changes'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      <footer className="my-trips-footer">
        <Link to="/" className="wander-secondary-button">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </footer>
    </main>
  );
}
/* -------------------- TRIP DETAILS PAGE -------------------- */
function ActivityPhoto({ activity, destination }) {
  const [photo, setPhoto] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function loadPhoto() {
      const activityName = activity?.name || activity?.category || 'travel destination';
      const query = `${activityName} ${destination || ''}`.trim();
      setPhotoLoading(true);
      setPhoto(null);
      try {
        const response = await api.get('/photos/search', {
          params: { q: query },
        });
        const photos = response.data?.photos;
        if (active && Array.isArray(photos) && photos.length > 0) {
          setPhoto(photos[0]);
        }
      } catch (error) {
        console.error('Could not load activity photo:', error.message);
      } finally {
        if (active) setPhotoLoading(false);
      }
    }
    loadPhoto();
    return () => {
      active = false;
    };
  }, [activity?.name, activity?.category, destination]);
  if (photoLoading) {
    return (
      <div className="trip-day-photo-placeholder" aria-label="Loading activity photo">
        <span>Loading photo…</span>
      </div>
    );
  }
  if (!photo) {
    return (
      <div className="trip-day-photo-placeholder" aria-label="No activity photo available">
        <span>Photo unavailable</span>
      </div>
    );
  }
  return (
    <div className="trip-day-photo-wrap">
      <a
        className="trip-day-photo-link"
        href={photo.photoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View photo for ${activity?.name || 'activity'} on Unsplash`}
      >
        <img
          className="trip-day-photo"
          src={photo.imageUrl}
          alt={photo.description || activity?.name || 'Travel destination'}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <span className="trip-day-photo-caption">View photo on Unsplash</span>
      </a>
      <p className="trip-day-photo-credit">
        Photo by{' '}
        <a href={photo.photographerUrl} target="_blank" rel="noopener noreferrer">
          {photo.photographer}
        </a>{' '}
        on <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>
      </p>
    </div>
  );
}
function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [itinerarySummary, setItinerarySummary] = useState('');
  const [budgetNotes, setBudgetNotes] = useState('');
  const [editingActivity, setEditingActivity] = useState(null);
  const [itineraryDirty, setItineraryDirty] = useState(false);
  const [savingItinerary, setSavingItinerary] = useState(false);
  const [itinerarySaveMessage, setItinerarySaveMessage] = useState('');
  const [itinerarySaveError, setItinerarySaveError] = useState('');
  useEffect(() => {
    let active = true;
    async function fetchTrip() {
      try {
        const response = await api.get(`/trips/${id}`);
        if (active) {
          setTrip(response.data?.trip || null);
          setError('');
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.status === 401
              ? 'Your session has expired. Please log in again.'
              : requestError.response?.data?.message ||
                  'Could not load this trip. Please try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchTrip();
    return () => {
      active = false;
    };
  }, [id]);
  async function handleGenerateItinerary() {
    setGenerating(true);
    setGenerationError('');
    setItinerarySummary('');
    setBudgetNotes('');
    try {
      const response = await api.post(`/trips/${id}/generate-itinerary`);
      if (!response.data?.success || !response.data?.trip) {
        throw new Error('The server did not return a generated itinerary.');
      }
      setTrip(response.data.trip);
      setItinerarySummary(response.data.summary || '');
      setBudgetNotes(response.data.budgetNotes || '');
      showToast('AI itinerary generated successfully!', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.message ||
        requestError.message ||
        'Could not generate the itinerary. Please try again.';
      setGenerationError(message);
      showToast(message, 'error');
    } finally {
      setGenerating(false);
    }
  }
  function startEditingActivity(dayIndex, activityIndex, activity) {
    setEditingActivity({
      dayIndex,
      activityIndex,
      draft: {
        name: activity?.name || '',
        time: activity?.time || '',
        description: activity?.description || '',
        category: activity?.category || '',
        estimatedCost: activity?.estimatedCost ?? 0,
      },
    });
    setItinerarySaveMessage('');
    setItinerarySaveError('');
  }
  function updateActivityDraft(field, value) {
    setEditingActivity((current) =>
      current ? { ...current, draft: { ...current.draft, [field]: value } } : current
    );
  }
  function applyActivityEdit() {
    if (!editingActivity || !trip) return;
    const { dayIndex, activityIndex, draft } = editingActivity;
    if (!draft.name.trim()) {
      setItinerarySaveError('Activity name cannot be empty.');
      return;
    }
    const cost = Number(draft.estimatedCost);
    if (!Number.isFinite(cost) || cost < 0) {
      setItinerarySaveError('Activity cost must be zero or more.');
      return;
    }
    setTrip((current) => {
      const itinerary = [...(current.itinerary || [])];
      const day = { ...itinerary[dayIndex] };
      const activities = [...(day.activities || [])];
      activities[activityIndex] = {
        ...activities[activityIndex],
        name: draft.name.trim(),
        time: draft.time.trim(),
        description: draft.description.trim(),
        category: draft.category.trim(),
        estimatedCost: cost,
      };
      day.activities = activities;
      itinerary[dayIndex] = day;
      return { ...current, itinerary };
    });
    setEditingActivity(null);
    setItineraryDirty(true);
    setItinerarySaveMessage('');
    setItinerarySaveError('');
  }
  function deleteActivity(dayIndex, activityIndex) {
    const confirmed = window.confirm('Delete this activity from your itinerary?');
    if (!confirmed) return;
    setTrip((current) => {
      const itinerary = [...(current.itinerary || [])];
      const day = { ...itinerary[dayIndex] };
      day.activities = (day.activities || []).filter((_, index) => index !== activityIndex);
      itinerary[dayIndex] = day;
      return { ...current, itinerary };
    });
    setEditingActivity(null);
    setItineraryDirty(true);
    setItinerarySaveMessage('');
    setItinerarySaveError('');
  }
  async function saveItineraryChanges() {
    setSavingItinerary(true);
    setItinerarySaveError('');
    setItinerarySaveMessage('');
    try {
      const response = await api.put(`/trips/${id}/itinerary`, {
        itinerary: trip.itinerary || [],
        estimatedCost: trip.estimatedCost,
      });
      if (!response.data?.success || !response.data?.trip) {
        throw new Error('The server did not confirm the itinerary update.');
      }
      setTrip(response.data.trip);
      setItineraryDirty(false);
      setItinerarySaveMessage('Itinerary changes saved successfully.');
      showToast('Itinerary changes saved successfully.', 'success');
    } catch (requestError) {
      const message = requestError.response?.data?.message ||
        requestError.message ||
        'Could not save itinerary changes. Please try again.';
      setItinerarySaveError(message);
      showToast(message, 'error');
    } finally {
      setSavingItinerary(false);
    }
  }
  const formatDate = (value) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Not set'
      : date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
  };
  const titleCase = (value = '') =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not set';
  if (loading) {
    return (
      <main className="trip-details-page">
        <div className="my-trips-message" role="status">
          <div className="auth-spinner" />
          <p>Loading trip details...</p>
        </div>
      </main>
    );
  }
  if (error || !trip) {
    return (
      <main className="trip-details-page">
        <section className="my-trips-message" role="alert">
          <h2>We couldn't open this trip</h2>
          <p>{error || 'Trip not found.'}</p>
          {error.includes('session has expired') && (
            <Link to="/login" className="wander-button">Log in again</Link>
          )}
          <button
            type="button"
            className="wander-secondary-button"
            onClick={() => navigate('/my-trips')}
          >
            <ArrowLeft size={16} /> Back to My Trips
          </button>
        </section>
      </main>
    );
  }
  const travellerCount =
    Number(trip.travellers?.adults || 0) +
    Number(trip.travellers?.children || 0);
  return (
    <main className="trip-details-page">
      <header className="my-trips-header">
        <Link to="/" className="wander-brand">
          WanderPlan <span>AI</span>
        </Link>
        <nav className="my-trips-nav">
          <Link to="/my-trips">My Trips</Link>
          <Link to="/trip-planner">Plan another trip</Link>
        </nav>
      </header>
      <section className="trip-details-hero">
        <button
          type="button"
          className="wander-secondary-button"
          onClick={() => navigate('/my-trips')}
        >
          <ArrowLeft size={16} /> Back to My Trips
        </button>
        <div className="trip-details-eyebrow">
          <Compass size={16} /> YOUR JOURNEY
        </div>
        <span className={`my-trip-status status-${trip.status || 'draft'}`}>
          {trip.status || 'draft'}
        </span>
        <h1>{trip.title || `${trip.destination || 'Trip'} Trip`}</h1>
        <p className="trip-details-route">
          <MapPin size={20} />
          {trip.origin} <span>→</span> {trip.destination}
        </p>
      </section>
      <section className="trip-details-grid" aria-label="Trip details">
        <article className="trip-details-stat">
          <CalendarDays size={22} />
          <span>Travel dates</span>
          <strong>{formatDate(trip.startDate)}</strong>
          <small>to {formatDate(trip.endDate)}</small>
        </article>
        <article className="trip-details-stat">
          <Wallet size={22} />
          <span>Total budget</span>
          <strong>₹{Number(trip.budget || 0).toLocaleString('en-IN')}</strong>
          <small>{trip.currency || 'INR'}</small>
        </article>
        <article className="trip-details-stat">
          <Users size={22} />
          <span>Travellers</span>
          <strong>{travellerCount}</strong>
          <small>
            {Number(trip.travellers?.adults || 0)} adults · {Number(trip.travellers?.children || 0)} children
          </small>
        </article>
        <article className="trip-details-stat">
          <TransportIcon transport={trip.transport} size={22} />
          <span>Transport</span>
          <strong>{titleCase(trip.transport)}</strong>
          <small>{titleCase(trip.travelStyle)} travel</small>
        </article>
      </section>
      <section className="trip-details-map-section">
        <MapView
          origin={trip.origin}
          destination={trip.destination}
        />
      </section>
      <section className="trip-details-section">
        <div className="trip-details-section-heading">
          <div>
            <span className="trip-eyebrow">PERSONALIZED FOR YOU</span>
            <h2>Your interests</h2>
          </div>
          <Heart size={25} />
        </div>
        <div className="trip-details-interests">
          {(trip.interests || []).length ? (
            trip.interests.map((interest) => (
              <span key={interest}>{interest}</span>
            ))
          ) : (
            <p>No interests selected for this trip.</p>
          )}
        </div>
      </section>
      <section className="trip-details-itinerary">
        <div className="trip-details-section-heading">
          <div>
            <span className="trip-eyebrow">YOUR TRAVEL PLAN</span>
            <h2>Day-by-day itinerary</h2>
          </div>
          <Sparkles size={25} />
        </div>
        <div className="trip-itinerary-actions">
          <p>
            Generate a personalized plan based on your dates, interests, travel
            style and budget. Costs are estimates, not live quotes or bookings.
          </p>
          <button
            type="button"
            className="trip-submit-button"
            onClick={handleGenerateItinerary}
            disabled={generating}
          >
            <Sparkles size={17} />
            {generating
              ? 'Generating your itinerary...'
              : Array.isArray(trip.itinerary) && trip.itinerary.length > 0
                ? 'Regenerate AI itinerary'
                : 'Generate AI itinerary'}
          </button>
        </div>
        {Array.isArray(trip.itinerary) && trip.itinerary.length > 0 && (
          <div className="trip-itinerary-edit-toolbar">
            <p>{itineraryDirty ? 'You have unsaved itinerary changes.' : 'You can edit or remove activities below.'}</p>
            <button
              type="button"
              className="trip-submit-button trip-save-itinerary-button"
              onClick={saveItineraryChanges}
              disabled={!itineraryDirty || savingItinerary}
            >
              <Save size={17} />
              {savingItinerary ? 'Saving changes…' : 'Save itinerary changes'}
            </button>
          </div>
        )}
        {itinerarySaveMessage && <p className="trip-success-message" role="status">{itinerarySaveMessage}</p>}
        {itinerarySaveError && <p className="trip-error" role="alert">{itinerarySaveError}</p>}
        {generationError && (
          <p className="trip-error" role="alert">{generationError}</p>
        )}
        {itinerarySummary && (
          <div className="trip-itinerary-summary">
            <h3>AI trip summary</h3>
            <p>{itinerarySummary}</p>
          </div>
        )}
        {budgetNotes && (
          <div className="trip-itinerary-summary">
            <h3>Budget check</h3>
            <p>{budgetNotes}</p>
          </div>
        )}
        {Array.isArray(trip.itinerary) && trip.itinerary.length > 0 ? (
          <div className="trip-details-itinerary-list">
            {trip.itinerary.map((day, index) => (
              <article className="trip-details-day" key={day._id || `${day.date || 'day'}-${index}`}>
              <span className="trip-eyebrow">
  DAY {day.day || index + 1}
  {day.date ? ` · ${formatDate(day.date)}` : ''}
</span>
                <h3>{day.title || day.dayTitle || `Day ${day.day || index + 1}`}</h3>
                {day.description && <p>{day.description}</p>}
                {Array.isArray(day.activities) && day.activities.length > 0 && (
                  <div className="trip-day-activities">
                    {day.activities.map((activity, activityIndex) => (
                      <div className="trip-day-activity" key={`${activity.name || 'activity'}-${activityIndex}`}>
                          <ActivityPhoto activity={activity} destination={trip.destination} />
                          {editingActivity?.dayIndex === index && editingActivity?.activityIndex === activityIndex ? (
                            <div className="trip-activity-edit-form">
                              <label>Activity name
                                <input value={editingActivity.draft.name} onChange={(event) => updateActivityDraft('name', event.target.value)} />
                              </label>
                              <label>Time
                                <input value={editingActivity.draft.time} onChange={(event) => updateActivityDraft('time', event.target.value)} placeholder="e.g. 10:00 AM" />
                              </label>
                              <label>Description
                                <textarea value={editingActivity.draft.description} onChange={(event) => updateActivityDraft('description', event.target.value)} rows={3} />
                              </label>
                              <label>Category
                                <input value={editingActivity.draft.category} onChange={(event) => updateActivityDraft('category', event.target.value)} placeholder="e.g. Nature" />
                              </label>
                              <label>Estimated cost (₹)
                                <input type="number" min="0" value={editingActivity.draft.estimatedCost} onChange={(event) => updateActivityDraft('estimatedCost', event.target.value)} />
                              </label>
                              <div className="trip-activity-edit-actions">
                                <button type="button" className="trip-activity-action is-save" onClick={applyActivityEdit}><Save size={15} /> Apply</button>
                                <button type="button" className="trip-activity-action" onClick={() => setEditingActivity(null)}><X size={15} /> Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="trip-day-activity-time">
                                <Clock size={15} />
                                <span>{activity.time || 'Flexible time'}</span>
                              </div>
                              <h4>{activity.name || `Activity ${activityIndex + 1}`}</h4>
                              {activity.description && <p>{activity.description}</p>}
                              <a className="trip-day-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.name || ''} ${trip.destination || ''}`)}`} target="_blank" rel="noopener noreferrer">
                                <MapPin size={14} />
                                View on Google Maps
                              </a>
                              {activity.category && <span className="trip-day-category">{activity.category}</span>}
                              {Number.isFinite(Number(activity.estimatedCost)) && <strong>₹{Number(activity.estimatedCost).toLocaleString('en-IN')}</strong>}
                              <div className="trip-activity-card-actions">
                                <button type="button" className="trip-activity-action" onClick={() => startEditingActivity(index, activityIndex, activity)}><Pencil size={15} /> Edit</button>
                                <button type="button" className="trip-activity-action is-delete" onClick={() => deleteActivity(index, activityIndex)}><Trash2 size={15} /> Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                    ))}
                  </div>
                )}
                {day.meals && (
                  <div className="trip-day-meals">
                    <h4>Meal suggestions</h4>
                    {['breakfast', 'lunch', 'dinner'].map((mealType) => {
                      const meal = day.meals[mealType];
                      if (!meal) return null;

                      const suggestion =
                        typeof meal === 'string'
                          ? meal
                          : meal.suggestion || 'Meal of your choice';
                      const estimatedCost =
                        typeof meal === 'object'
                          ? Number(meal.estimatedCost) || 0
                          : 0;

                      return (
                        <p key={mealType}>
                          <strong>
                            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}:
                          </strong>{' '}
                          {suggestion} — ₹{estimatedCost.toLocaleString('en-IN')}
                        </p>
                      );
                    })}
                  </div>
                )}
                {Number.isFinite(Number(day.dailyEstimatedCost)) && (
                  <p className="trip-day-total">
                    Estimated day cost: ₹{Number(day.dailyEstimatedCost).toLocaleString('en-IN')}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="trip-itinerary-empty">
            <div className="my-trips-empty-icon"><Sparkles size={30} /></div>
            <h3>Your itinerary is waiting</h3>
            <p>
              Generate a day-by-day plan and it will be saved to this trip.
              You can return later to view the saved itinerary.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
/* -------------------- PLACEHOLDER PAGES -------------------- */
function ComingSoon({ title }) {
  return (
    <main className="wander-placeholder">
      <Link to="/" className="wander-brand">
        WanderPlan <span>AI</span>
      </Link>
      <h1>{title}</h1>
      <p>This section will be built in the next development steps.</p>
      <Link to="/" className="wander-button">
        <ArrowLeft size={16} /> Back to home
      </Link>
    </main>
  );
}
/* -------------------- ROUTES -------------------- */
function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="auth-loading" aria-live="polite">
        <div className="auth-spinner" />
        <p>Checking your session...</p>
      </main>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/discover" element={<Discover />} />
        <Route path="/trip-planner" element={<TripPlannerPage />} />
        <Route path="/my-trips" element={<MyTripsPage />} />
        <Route path="/trips/:id" element={<TripDetailsPage />} />
        <Route
          path="/budget-planner"
          element={<BudgetPlanner />}
        />
      </Route>
      <Route
        path="/explore"
        element={<DestinationGlobe />}
      />
      <Route path="*" element={<ComingSoon title="Page not found" />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
<Route
  path="/resend-verification"
  element={<ResendVerification />}
/>
    </Routes>
    
    
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastViewport />
      </AuthProvider>
    </BrowserRouter>
  );
}
