import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, googleLogin } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function showToast(message, type = 'success') {
    window.dispatchEvent(
      new CustomEvent('wanderplan:toast', {
        detail: { message, type },
      }),
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading || googleLoading) return;

    if (form.password !== form.confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (form.password.length < 8) {
      showToast(
        'Password must contain at least 8 characters.',
        'error',
      );
      return;
    }

    if (form.name.trim().length < 2) {
      showToast('Please enter your full name.', 'error');
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      showToast(
        'Account created successfully! Welcome to WanderPlan AI.',
        'success',
      );

      navigate('/', { replace: true });
    } catch (err) {
      const validationErrors = err.response?.data?.errors;

      const message =
        validationErrors?.[0]?.message ||
        err.response?.data?.message ||
        'Signup failed. Please try again.';

      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(response) {
    if (loading || googleLoading) return;

    if (!response?.credential) {
      showToast('Google credential was not received.', 'error');
      return;
    }

    setGoogleLoading(true);

    try {
      await googleLogin(response.credential);

      showToast(
        'Google signup/login successful! Welcome to WanderPlan AI.',
        'success',
      );

      navigate('/', { replace: true });
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.message ||
          'Google signup failed. Please try again.',
        'error',
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          WanderPlan <span>AI</span>
        </Link>

        <h1>Create your account</h1>

        <p className="auth-subtitle">
          Your next adventure starts here.
        </p>

        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              showToast(
                'Google sign-in was unsuccessful. Please try again.',
                'error',
              );
            }}
            text="signup_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="320"
            logo_alignment="left"
          />
        </div>

        {googleLoading && (
          <p className="auth-subtitle" role="status">
            Creating your account with Google...
          </p>
        )}

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="signup-name">Full name</label>

          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
            minLength={2}
            maxLength={80}
            required
          />

          <label htmlFor="signup-email">Email address</label>

          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            maxLength={254}
            required
          />

          <label htmlFor="signup-password">Password</label>

          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            maxLength={128}
            required
          />

          <label htmlFor="signup-confirm-password">
            Confirm password
          </label>

          <input
            id="signup-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={handleChange}
            minLength={8}
            maxLength={128}
            required
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || googleLoading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login">Log in</Link>
        </p>

        <Link to="/" className="auth-back">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}
