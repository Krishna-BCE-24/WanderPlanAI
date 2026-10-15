import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  PiggyBank,
  Utensils,
  Camera,
  MapPin,
  RefreshCw,
  Plane,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Users,
  Plus,
  Trash2,
  Receipt,
} from 'lucide-react';

import api from '../../services/api.js';
import './BudgetPlanner.css';

const CATEGORIES = [
  'Food',
  'Hotel',
  'Transport',
  'Activities',
  'Shopping',
  'Miscellaneous',
];

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const validCost = (value) => {
  const cost = Number(value);
  return Number.isFinite(cost) && cost >= 0 ? cost : 0;
};

function getItemCost(item) {
  if (!item || typeof item !== 'object') return 0;
  return validCost(item.estimatedCost);
}

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function BudgetPlanner() {
  const [trips, setTrips] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    date: getToday(),
    notes: '',
  });

  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState('');
  const [expenseMessage, setExpenseMessage] = useState('');
  const [expenseError, setExpenseError] = useState('');

  async function loadTrips() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/trips');
      const savedTrips = Array.isArray(response.data?.trips)
        ? response.data.trips
        : [];

      setTrips(savedTrips);

      setSelectedId((current) =>
        savedTrips.some((trip) => trip._id === current)
          ? current
          : savedTrips[0]?._id || ''
      );
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Your session has expired. Please log in again.'
          : err.response?.data?.message ||
              'Could not load your saved trips. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  const trip = trips.find((item) => item._id === selectedId);

  // Calculate AI estimates, actual expenses and category totals.
  const budgetData = useMemo(() => {
    if (!trip) return null;

    const budget = validCost(trip.budget);
    const estimated = Number(trip.estimatedCost);

    const hasEstimate =
      trip.estimatedCost !== null &&
      trip.estimatedCost !== undefined &&
      trip.estimatedCost !== '' &&
      Number.isFinite(estimated) &&
      estimated >= 0;

    const itinerary = Array.isArray(trip.itinerary)
      ? trip.itinerary
      : [];

    const expenses = Array.isArray(trip.expenses)
      ? trip.expenses
      : [];

    let meals = 0;
    let activities = 0;

    itinerary.forEach((day) => {
      if (!day || typeof day !== 'object') return;

      if (Array.isArray(day.meals)) {
        day.meals.forEach((meal) => {
          meals += getItemCost(meal);
        });
      }

      if (Array.isArray(day.activities)) {
        day.activities.forEach((activity) => {
          activities += getItemCost(activity);
        });
      }
    });

    const actualSpent = expenses.reduce(
      (sum, expense) => sum + validCost(expense.amount),
      0
    );

    const categoryTotals = CATEGORIES.reduce((result, category) => {
      result[category] = expenses
        .filter((expense) => expense.category === category)
        .reduce(
          (sum, expense) => sum + validCost(expense.amount),
          0
        );

      return result;
    }, {});

    const spentEstimate = hasEstimate ? estimated : null;

    return {
      budget,
      hasEstimate,
      estimated: spentEstimate,
      actualSpent,
      actualRemaining: budget - actualSpent,
      estimatedRemaining:
        spentEstimate === null ? null : budget - spentEstimate,
      progress:
        budget > 0 && spentEstimate !== null
          ? Math.min((spentEstimate / budget) * 100, 100)
          : 0,
      actualProgress:
        budget > 0
          ? Math.min((actualSpent / budget) * 100, 100)
          : 0,
      meals,
      activities,
      hasItinerary: itinerary.length > 0,
      expenses,
      categoryTotals,
      travellerCount:
        Number(trip.travellers?.adults || 0) +
        Number(trip.travellers?.children || 0),
    };
  }, [trip]);

  function handleExpenseChange(event) {
    const { name, value } = event.target;

    setExpenseForm((current) => ({
      ...current,
      [name]: value,
    }));

    setExpenseError('');
    setExpenseMessage('');
  }

  async function handleAddExpense(event) {
    event.preventDefault();

    if (!trip?._id) {
      setExpenseError('Please select a trip first.');
      return;
    }

    const title = expenseForm.title.trim();
    const amount = Number(expenseForm.amount);

    if (!title) {
      setExpenseError('Please enter an expense title.');
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount < 0.01 ||
      amount > 100000000
    ) {
      setExpenseError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!CATEGORIES.includes(expenseForm.category)) {
      setExpenseError('Please select a valid category.');
      return;
    }

    if (!expenseForm.date) {
      setExpenseError('Please select the expense date.');
      return;
    }

    setSavingExpense(true);
    setExpenseError('');
    setExpenseMessage('');

    try {
      const response = await api.post(`/trips/${trip._id}/expenses`, {
        title,
        amount,
        category: expenseForm.category,
        date: expenseForm.date,
        notes: expenseForm.notes.trim(),
      });

      const newExpense = response.data?.expense;

      if (!newExpense) {
        throw new Error('The server did not return the saved expense.');
      }

      setTrips((currentTrips) =>
        currentTrips.map((item) =>
          item._id === trip._id
            ? {
                ...item,
                expenses: [...(item.expenses || []), newExpense],
              }
            : item
        )
      );

      setExpenseForm({
        title: '',
        amount: '',
        category: 'Food',
        date: getToday(),
        notes: '',
      });

      setExpenseMessage('Expense added and saved successfully.');
    } catch (err) {
      setExpenseError(
        err.response?.data?.message ||
          err.message ||
          'Could not save the expense. Please try again.'
      );
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(expenseId) {
    if (!trip?._id || !expenseId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this expense?'
    );

    if (!confirmed) return;

    setDeletingExpenseId(expenseId);
    setExpenseError('');
    setExpenseMessage('');

    try {
      await api.delete(
        `/trips/${trip._id}/expenses/${expenseId}`
      );

      setTrips((currentTrips) =>
        currentTrips.map((item) =>
          item._id === trip._id
            ? {
                ...item,
                expenses: (item.expenses || []).filter(
                  (expense) => expense._id !== expenseId
                ),
              }
            : item
        )
      );

      setExpenseMessage('Expense deleted successfully.');
    } catch (err) {
      setExpenseError(
        err.response?.data?.message ||
          'Could not delete the expense. Please try again.'
      );
    } finally {
      setDeletingExpenseId('');
    }
  }

  return (
    <main className="budget-page">
      <div className="budget-container">
        <div className="budget-brand">
          WanderPlan <span>AI</span>
        </div>

        <header className="budget-header">
          <div>
            <span className="budget-eyebrow">
              SMART TRAVEL PLANNING
            </span>
            <h1>Your travel budget.</h1>
            <p>
              Understand your planned costs and track what you actually
              spend on your adventure.
            </p>
          </div>

          <Link to="/my-trips" className="budget-back-link">
            <ArrowLeft size={17} /> My Trips
          </Link>
        </header>

        {loading && (
          <div className="budget-loading">
            Loading your saved trips...
          </div>
        )}

        {!loading && error && (
          <div className="budget-error" role="alert">
            <AlertCircle size={20} />
            <p>{error}</p>

            {error.includes('session has expired') ? (
              <Link to="/login" className="budget-primary-link">
                Log in again
              </Link>
            ) : (
              <button
                type="button"
                className="budget-primary-link"
                onClick={loadTrips}
              >
                <RefreshCw size={16} /> Try again
              </button>
            )}
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <section className="budget-card budget-empty">
            <Wallet size={36} color="#3988FF" />
            <h3>No saved trips yet</h3>
            <p>
              Create a trip first. Your trip budget and AI estimate
              will appear here when available.
            </p>
            <Link to="/trip-planner" className="budget-primary-link">
              Plan a trip
            </Link>
          </section>
        )}

        {!loading && !error && trips.length > 0 && (
          <>
            <section className="budget-trip-selector">
              <div className="budget-card">
                <label
                  className="budget-card-label"
                  htmlFor="budget-trip-select"
                >
                  SELECT A SAVED TRIP
                </label>

                <select
                  id="budget-trip-select"
                  className="budget-select"
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setExpenseError('');
                    setExpenseMessage('');
                  }}
                >
                  {trips.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.title ||
                        `${item.origin || ''} → ${
                          item.destination || 'Trip'
                        }`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="budget-card">
                <span className="budget-card-label">
                  YOUR DESTINATION
                </span>

                <div className="budget-expense-info">
                  <span className="budget-expense-icon">
                    <MapPin size={21} />
                  </span>
                  <div>
                    <strong className="budget-expense-name">
                      {trip?.destination || 'Destination not set'}
                    </strong>
                    <span className="budget-expense-description">
                      {trip?.origin || 'Starting location not set'} →{' '}
                      {trip?.destination || 'Destination'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {trip && budgetData && (
              <>
                <section className="budget-stats">
                  <article className="budget-card budget-stat">
                    <span className="budget-stat-title">
                      <Wallet size={16} /> Total trip budget
                    </span>
                    <strong className="budget-stat-value">
                      {money(budgetData.budget)}
                    </strong>
                    <span className="budget-stat-note">
                      Your saved budget for this trip
                    </span>
                  </article>

                  <article className="budget-card budget-stat orange">
                    <span className="budget-stat-title">
                      <TrendingUp size={16} /> AI estimated total
                    </span>
                    <strong className="budget-stat-value">
                      {budgetData.hasEstimate
                        ? money(budgetData.estimated)
                        : 'Not available'}
                    </strong>
                    <span className="budget-stat-note">
                      {budgetData.hasEstimate
                        ? 'Estimated cost from your itinerary'
                        : 'Generate an AI itinerary to get an estimate'}
                    </span>
                  </article>

                  <article className="budget-card budget-stat">
                    <span className="budget-stat-title">
                      <Receipt size={16} /> Actual spending
                    </span>
                    <strong className="budget-stat-value">
                      {money(budgetData.actualSpent)}
                    </strong>
                    <span className="budget-stat-note">
                      Total of your manually recorded expenses
                    </span>
                  </article>

                  <article
                    className={`budget-card budget-stat ${
                      budgetData.actualRemaining < 0
                        ? 'orange'
                        : 'green'
                    }`}
                  >
                    <span className="budget-stat-title">
                      <PiggyBank size={16} /> Actual budget remaining
                    </span>
                    <strong className="budget-stat-value">
                      {money(budgetData.actualRemaining)}
                    </strong>
                    <span className="budget-stat-note">
                      {budgetData.actualRemaining < 0
                        ? 'Your actual spending exceeds the budget'
                        : 'Budget left after recorded expenses'}
                    </span>
                  </article>
                </section>

                <section className="budget-card budget-progress-card">
                  <div className="budget-progress-heading">
                    <h2>Actual spending overview</h2>
                    <span>
                      {Math.round(budgetData.actualProgress)}% of budget
                    </span>
                  </div>

                  <div className="budget-progress-track">
                    <div
                      className={`budget-progress-fill ${
                        budgetData.actualRemaining < 0
                          ? 'over-budget'
                          : ''
                      }`}
                      style={{
                        width: `${budgetData.actualProgress}%`,
                      }}
                    />
                  </div>

                  <div
                    className={`budget-status ${
                      budgetData.actualRemaining < 0
                        ? 'danger'
                        : budgetData.actualProgress >= 80
                          ? 'warning'
                          : ''
                    }`}
                  >
                    {budgetData.actualRemaining < 0 ? (
                      <AlertCircle size={17} />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}

                    {budgetData.actualRemaining < 0
                      ? `Over budget by ${money(
                          Math.abs(budgetData.actualRemaining)
                        )}`
                      : budgetData.actualProgress >= 80
                        ? 'You are using most of your budget.'
                        : 'Your recorded expenses are within budget.'}
                  </div>
                </section>

                {/* Manual expense form */}
                <section className="budget-card" style={{ marginBottom: 24 }}>
                  <div className="budget-section-heading">
                    <div>
                      <h2>Add an expense</h2>
                      <p>
                        Record money you actually spend. Expenses are saved
                        to your selected trip.
                      </p>
                    </div>
                  </div>

                  {expenseError && (
                    <div className="budget-error" role="alert">
                      <AlertCircle size={18} />
                      <p>{expenseError}</p>
                    </div>
                  )}

                  {expenseMessage && (
                    <div
                      className="budget-status"
                      role="status"
                      style={{ marginBottom: 16 }}
                    >
                      <CheckCircle2 size={17} />
                      {expenseMessage}
                    </div>
                  )}

                  <form onSubmit={handleAddExpense}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(190px, 1fr))',
                        gap: 16,
                      }}
                    >
                      <div>
                        <label
                          className="budget-card-label"
                          htmlFor="expense-title"
                        >
                          EXPENSE TITLE
                        </label>
                        <input
                          id="expense-title"
                          name="title"
                          type="text"
                          value={expenseForm.title}
                          onChange={handleExpenseChange}
                          placeholder="e.g. Dinner at restaurant"
                          maxLength={100}
                          required
                          disabled={savingExpense}
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label
                          className="budget-card-label"
                          htmlFor="expense-amount"
                        >
                          AMOUNT (INR)
                        </label>
                        <input
                          id="expense-amount"
                          name="amount"
                          type="number"
                          value={expenseForm.amount}
                          onChange={handleExpenseChange}
                          placeholder="e.g. 500"
                          min="0.01"
                          max="100000000"
                          step="0.01"
                          required
                          disabled={savingExpense}
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label
                          className="budget-card-label"
                          htmlFor="expense-category"
                        >
                          CATEGORY
                        </label>
                        <select
                          id="expense-category"
                          name="category"
                          value={expenseForm.category}
                          onChange={handleExpenseChange}
                          disabled={savingExpense}
                          style={inputStyle}
                        >
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          className="budget-card-label"
                          htmlFor="expense-date"
                        >
                          DATE
                        </label>
                        <input
                          id="expense-date"
                          name="date"
                          type="date"
                          value={expenseForm.date}
                          onChange={handleExpenseChange}
                          required
                          disabled={savingExpense}
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label
                          className="budget-card-label"
                          htmlFor="expense-notes"
                        >
                          NOTES (OPTIONAL)
                        </label>
                        <textarea
                          id="expense-notes"
                          name="notes"
                          value={expenseForm.notes}
                          onChange={handleExpenseChange}
                          placeholder="Add details about this expense..."
                          maxLength={300}
                          rows={2}
                          disabled={savingExpense}
                          style={{
                            ...inputStyle,
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="budget-primary-link"
                      disabled={savingExpense}
                      style={{
                        marginTop: 18,
                        border: 'none',
                        cursor: savingExpense ? 'wait' : 'pointer',
                        opacity: savingExpense ? 0.7 : 1,
                      }}
                    >
                      {savingExpense ? (
                        <RefreshCw size={16} />
                      ) : (
                        <Plus size={17} />
                      )}
                      {savingExpense ? 'Saving expense...' : 'Add expense'}
                    </button>
                  </form>
                </section>

                {/* Actual expense list */}
                <section className="budget-expense-grid">
                  <div className="budget-card">
                    <div className="budget-section-heading">
                      <div>
                        <h2>Your recorded expenses</h2>
                        <p>
                          {budgetData.expenses.length} expense
                          {budgetData.expenses.length === 1 ? '' : 's'} saved
                          for this trip.
                        </p>
                      </div>
                    </div>

                    {budgetData.expenses.length === 0 ? (
                      <div className="budget-empty">
                        <Receipt size={30} color="#3988FF" />
                        <h3>No expenses recorded yet</h3>
                        <p>
                          Add your first expense above. Your actual spending
                          will appear here.
                        </p>
                      </div>
                    ) : (
                      <>
                        {budgetData.expenses
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime()
                          )
                          .map((expense) => (
                            <div
                              className="budget-expense-item"
                              key={expense._id}
                              style={{ gap: 12 }}
                            >
                              <div className="budget-expense-info">
                                <span className="budget-expense-icon">
                                  <Receipt size={19} />
                                </span>

                                <div style={{ minWidth: 0 }}>
                                  <strong className="budget-expense-name">
                                    {expense.title}
                                  </strong>
                                  <span className="budget-expense-description">
                                    {expense.category} ·{' '}
                                    {expense.date
                                      ? new Date(
                                          expense.date
                                        ).toLocaleDateString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                          timeZone: 'UTC',
                                        })
                                      : 'Date not set'}
                                  </span>

                                  {expense.notes && (
                                    <span className="budget-expense-description">
                                      {expense.notes}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  flexShrink: 0,
                                }}
                              >
                                <strong className="budget-expense-value">
                                  {money(expense.amount)}
                                </strong>

                                <button
                                  type="button"
                                  title="Delete expense"
                                  aria-label={`Delete ${expense.title}`}
                                  disabled={
                                    deletingExpenseId === expense._id
                                  }
                                  onClick={() =>
                                    handleDeleteExpense(expense._id)
                                  }
                                  style={deleteButtonStyle}
                                >
                                  {deletingExpenseId === expense._id ? (
                                    <RefreshCw size={16} />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                      </>
                    )}
                  </div>

                  {/* Category breakdown */}
                  <div className="budget-card">
                    <div className="budget-section-heading">
                      <div>
                        <h2>Category breakdown</h2>
                        <p>Actual spending by category.</p>
                      </div>
                    </div>

                    {CATEGORIES.map((category) => {
                      const amount =
                        budgetData.categoryTotals[category];

                      const percentage =
                        budgetData.actualSpent > 0
                          ? (amount / budgetData.actualSpent) * 100
                          : 0;

                      return (
                        <div
                          key={category}
                          style={{ marginBottom: 20 }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 12,
                              marginBottom: 8,
                            }}
                          >
                            <span className="budget-expense-name">
                              {category}
                            </span>
                            <strong className="budget-expense-value">
                              {money(amount)}
                            </strong>
                          </div>

                          <div className="budget-progress-track">
                            <div
                              className="budget-progress-fill"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <p className="budget-footer-note">
                      Only manually recorded expenses are included in these
                      totals. AI itinerary estimates are shown separately
                      to avoid double-counting.
                    </p>
                  </div>
                </section>

                {/* AI itinerary breakdown */}
                <section className="budget-card" style={{ marginTop: 24 }}>
                  <div className="budget-section-heading">
                    <div>
                      <h2>AI itinerary breakdown</h2>
                      <p>
                        Planned meal and activity costs from your itinerary.
                      </p>
                    </div>
                  </div>

                  {!budgetData.hasItinerary ? (
                    <div className="budget-empty">
                      <Camera size={30} color="#3988FF" />
                      <h3>No itinerary yet</h3>
                      <p>
                        Generate an AI itinerary to see meal and activity
                        estimates.
                      </p>
                      <Link
                        to={`/trips/${trip._id}`}
                        className="budget-primary-link"
                      >
                        View trip
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="budget-expense-item">
                        <div className="budget-expense-info">
                          <span className="budget-expense-icon orange">
                            <Utensils size={20} />
                          </span>
                          <div>
                            <strong className="budget-expense-name">
                              Meals
                            </strong>
                            <span className="budget-expense-description">
                              Sum of meal costs listed per day
                            </span>
                          </div>
                        </div>
                        <strong className="budget-expense-value">
                          {money(budgetData.meals)}
                        </strong>
                      </div>

                      <div className="budget-expense-item">
                        <div className="budget-expense-info">
                          <span className="budget-expense-icon">
                            <Camera size={20} />
                          </span>
                          <div>
                            <strong className="budget-expense-name">
                              Activities
                            </strong>
                            <span className="budget-expense-description">
                              Sum of activity costs listed per day
                            </span>
                          </div>
                        </div>
                        <strong className="budget-expense-value">
                          {money(budgetData.activities)}
                        </strong>
                      </div>
                    </>
                  )}
                </section>

                {/* Trip details */}
                <section className="budget-card" style={{ marginTop: 24 }}>
                  <div className="budget-section-heading">
                    <div>
                      <h2>Trip details</h2>
                      <p>Your saved travel information.</p>
                    </div>
                  </div>

                  <div className="budget-expense-item">
                    <div className="budget-expense-info">
                      <span className="budget-expense-icon">
                        <CalendarDays size={20} />
                      </span>
                      <div>
                        <strong className="budget-expense-name">
                          Travel dates
                        </strong>
                        <span className="budget-expense-description">
                          {trip.startDate
                            ? new Date(trip.startDate).toLocaleDateString(
                                'en-IN'
                              )
                            : 'Not set'}
                          {' – '}
                          {trip.endDate
                            ? new Date(trip.endDate).toLocaleDateString(
                                'en-IN'
                              )
                            : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="budget-expense-item">
                    <div className="budget-expense-info">
                      <span className="budget-expense-icon orange">
                        <Users size={20} />
                      </span>
                      <div>
                        <strong className="budget-expense-name">
                          Travellers
                        </strong>
                        <span className="budget-expense-description">
                          {budgetData.travellerCount} total travellers
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="budget-expense-item">
                    <div className="budget-expense-info">
                      <span className="budget-expense-icon">
                        <Plane size={20} />
                      </span>
                      <div>
                        <strong className="budget-expense-name">
                          Transport
                        </strong>
                        <span className="budget-expense-description">
                          {trip.transport || 'Flexible'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="budget-expense-item">
                    <div className="budget-expense-info">
                      <span className="budget-expense-icon orange">
                        <Wallet size={20} />
                      </span>
                      <div>
                        <strong className="budget-expense-name">
                          Travel style
                        </strong>
                        <span className="budget-expense-description">
                          {trip.travelStyle || 'Balanced'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 22 }}>
                    <Link
                      to={`/trips/${trip._id}`}
                      className="budget-primary-link"
                    >
                      Open itinerary
                    </Link>
                  </div>
                </section>

                <p className="budget-footer-note">
                  AI estimates are planning aids, not confirmed booking
                  prices. Actual expenses reflect the entries you record.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  marginTop: 8,
  border: '1px solid #d9e2ec',
  borderRadius: 10,
  background: '#fff',
  color: '#102a43',
  font: 'inherit',
  minHeight: 44,
};

const deleteButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: '1px solid #f3c7c7',
  borderRadius: 9,
  background: '#fff5f5',
  color: '#c53030',
  cursor: 'pointer',
  flexShrink: 0,
};

export default BudgetPlanner;
