import { useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  LockKeyhole,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api.js';
import './PasswordReset.css';

function showToast(message, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('wanderplan:toast', {
      detail: { message, type },
    })
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!token) {
      setError(
        'Reset token is missing. Please request a new reset link.'
      );
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError(
        'Password must contain between 8 and 128 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Both passwords must match.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password,
      });

      showToast(
        response.data?.message ||
          'Password reset successfully. Please log in.',
        'success'
      );

      navigate('/login', { replace: true });
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        'Unable to reset the password. Your link may have expired. Request a new one.';

      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <Link
          to="/forgot-password"
          className="password-back-link"
        >
          <ArrowLeft size={17} />
          Request a new link
        </Link>

        <Link to="/" className="wander-brand">
          WanderPlan <span>AI</span>
        </Link>

        <div className="password-reset-icon">
          <LockKeyhole size={30} />
        </div>

        <div className="password-reset-heading">
          <span className="password-reset-eyebrow">
            ACCOUNT SECURITY
          </span>

          <h1>Create a new password</h1>

          <p>
            Choose a strong password to secure your WanderPlan AI
            account.
          </p>
        </div>

        <form
          className="password-reset-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="new-password">
            New password
          </label>

          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Enter at least 8 characters"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
            required
          />

          <label htmlFor="confirm-password">
            Confirm new password
          </label>

          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Enter your password again"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError('');
            }}
            required
          />

          <label className="password-show-toggle">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) =>
                setShowPassword(event.target.checked)
              }
            />
            Show passwords
          </label>

          <p className="password-reset-hint">
            Use at least 8 characters. Avoid reusing an old password.
          </p>

          {error && (
            <p className="password-reset-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="password-reset-submit"
            disabled={loading || !token}
          >
            {loading ? (
              'Updating password...'
            ) : (
              <>
                <CheckCircle2 size={17} />
                Reset password
              </>
            )}
          </button>
        </form>

        {!token && (
          <p className="password-reset-error" role="alert">
            This link is missing its reset token. Please request
            a new password reset email.
          </p>
        )}

        <p className="password-reset-footer">
          Remember your password?{' '}
          <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
