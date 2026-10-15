import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import './PasswordReset.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState(
    'Please wait while we verify your email.',
  );

  useEffect(() => {
    let cancelled = false;

    async function verifyEmail() {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage(
          'Verification token is missing. Please request a new verification email.',
        );
        return;
      }

      try {
        const response = await api.post('/auth/verify-email', {
          token,
        });

        if (cancelled) return;

        setStatus('success');
        setMessage(
          response.data?.message ||
            'Your email has been verified successfully!',
        );
      } catch (error) {
        if (cancelled) return;

        setStatus('error');
        setMessage(
          error.response?.data?.message ||
            'Verification failed. Your link may have expired.',
        );
      }
    }

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <div className="password-reset-icon">
          {status === 'loading'
            ? '⏳'
            : status === 'success'
              ? '✓'
              : '!'}
        </div>

        <h1>
          {status === 'loading'
            ? 'Verifying Your Email'
            : status === 'success'
              ? 'Email Verified!'
              : 'Verification Failed'}
        </h1>

        <p role="status" aria-live="polite">{message}</p>

        {status === 'loading' && (
          <p>Please wait a moment...</p>
        )}

        {status === 'success' && (
          <Link
            className="password-reset-button"
            to="/login"
          >
            Continue to Login
          </Link>
        )}

        {status === 'error' && (
          <Link
            className="password-reset-button"
            to="/resend-verification"
          >
            Request New Verification Link
          </Link>
        )}

        <p className="password-reset-footer">
          <Link to="/">Back to Home</Link>
        </p>
      </section>
    </main>
  );
}
