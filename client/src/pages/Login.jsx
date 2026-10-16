import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
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

    setLoading(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });

      showToast('Login successful! Welcome back.', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          'Login failed. Please check your credentials and try again.',
        'error',
      );
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
        'Google login successful! Welcome to WanderPlan AI.',
        'success',
      );

      navigate('/', { replace: true });
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.message ||
          'Google login failed. Please try again.',
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

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Log in to continue planning your next adventure.
        </p>


        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              showToast('Google sign-in failed. Please try again.', 'error')
            }
            text="signin_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width={362}
            logo_alignment="left"
          />
        </div>
        {googleLoading && (
          <p className="auth-subtitle" role="status">
            Signing in with Google...
          </p>
        )}

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">
            Email address
          </label>

          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            maxLength={254}
            required
          />

          <label htmlFor="login-password">
            Password
          </label>

          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            maxLength={128}
            required
          />

          <div className="auth-forgot-row">
            <Link to="/forgot-password" className="auth-forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || googleLoading}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/signup">Sign up</Link>
        </p>

        <Link to="/" className="auth-back">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}
