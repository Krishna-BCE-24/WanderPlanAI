import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send, CheckCircle2 } from 'lucide-react';
import api from '../services/api.js';
import './PasswordReset.css';

function showToast(message, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('wanderplan:toast', {
      detail: { message, type },
    })
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      setSubmitted(true);

      showToast(
        response.data?.message ||
          'If an account exists, reset instructions will be sent.',
        'success'
      );
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        'Unable to send the reset request. Please try again.';

      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <Link to="/login" className="password-back-link">
          <ArrowLeft size={17} />
          Back to login
        </Link>

        <Link to="/" className="wander-brand">
          WanderPlan <span>AI</span>
        </Link>

        <div className="password-reset-icon">
          {submitted ? (
            <CheckCircle2 size={30} />
          ) : (
            <Mail size={30} />
          )}
        </div>

        <div className="password-reset-heading">
          <span className="password-reset-eyebrow">
            ACCOUNT RECOVERY
          </span>

          <h1>
            {submitted
              ? 'Check your email'
              : 'Forgot password?'}
          </h1>

          <p>
            {submitted
              ? 'If an account exists for this email, password reset instructions will be sent. Check your inbox and spam folder.'
              : 'No worries! Enter your registered email address and we will send you a secure password reset link.'}
          </p>
        </div>

        {!submitted ? (
          <form
            className="password-reset-form"
            onSubmit={handleSubmit}
          >
            <label htmlFor="forgot-email">
              Email address
            </label>

            <input
              id="forgot-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              required
            />

            {error && (
              <p className="password-reset-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="password-reset-submit"
              disabled={loading}
            >
              {loading ? (
                'Sending reset link...'
              ) : (
                <>
                  <Send size={17} />
                  Send reset link
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="password-reset-success">
            <p>
              Email address: <strong>{email}</strong>
            </p>

            <button
              type="button"
              className="password-reset-submit"
              onClick={() => {
                setSubmitted(false);
                setError('');
              }}
            >
              Try another email
            </button>
          </div>
        )}

        <p className="password-reset-footer">
          Remember your password?{' '}
          <Link to="/login">Log in</Link>
        </p>

        <p className="password-reset-security">
          <span>🔒</span>
          Your account security matters to us.
        </p>
      </section>
    </main>
  );
}