import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './PasswordReset.css';

export default function ResendVerification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await api.post(
        '/auth/resend-verification',
        { email: email.trim() },
      );

      setMessage(
        response.data?.message ||
          'If your account needs verification, an email will be sent.',
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not request a verification email. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <div className="password-reset-icon">✉</div>

        <h1>Verify Your Email</h1>

        <p>
          Enter the email address you used to register.
          We will send a new verification link if your account
          needs verification.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="verification-email">Email Address</label>

          <input
            id="verification-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          {message && (
            <p className="password-reset-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="password-reset-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="password-reset-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Verification Email'}
          </button>
        </form>

        <p className="password-reset-footer">
          Already verified? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}