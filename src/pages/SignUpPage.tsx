import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowRight, Sun, Moon } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name required', 'Please enter your full name', 'warning');
      return;
    }
    if (!email.trim()) {
      addToast('Email required', 'Please enter your email address', 'warning');
      return;
    }
    if (!password || password.length < 6) {
      addToast('Password required', 'Password must be at least 6 characters', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Password mismatch', 'Please verify that both passwords match', 'warning');
      return;
    }
    if (!agreed) {
      addToast('Agreement required', 'Please accept the Terms to continue', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      await signUp(name, email, password);
      sessionStorage.setItem('repurpose_login_success', 'true');
      sessionStorage.setItem('repurpose_login_user', email);
      addToast('Account created', `Welcome to RepurposeAI, ${name}!`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      addToast('Registration failed', err.message || 'Failed to create account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    addToast(
      'OAuth Authentication',
      `${provider} SSO requires external OAuth credentials in production. Please create your account with your name, email, and password.`,
      'info'
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-6 selection:bg-amber-500/20"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex items-center justify-between max-w-sm w-full mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            R
          </div>
          <span className="font-semibold text-sm tracking-tight">RepurposeAI</span>
        </Link>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border hover:bg-neutral-500/10 transition-colors cursor-pointer"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {theme === 'obsidian' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-neutral-700" />
          )}
        </button>
      </div>

      <div className="max-w-sm w-full mx-auto my-auto py-8">
        <div
          className="p-6 sm:p-8 rounded-2xl border shadow-xl space-y-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Create your account</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Start turning long-form episodes into platform-wide systems.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder="you@domain.com"
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded text-amber-500"
              />
              <label htmlFor="agree" className="text-xs select-none" style={{ color: 'var(--text-secondary)' }}>
                I agree to the Terms and Privacy Policy.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-90 mt-2"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>{isLoading ? 'Creating...' : 'Create account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="relative text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--border-subtle)' }} />
            </div>
            <span
              className="relative px-2 text-[10px] uppercase font-mono tracking-wider"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-tertiary)',
              }}
            >
              or continue with
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleOAuth('Google')}
              className="py-2 px-3 rounded-lg border text-xs font-medium hover:bg-neutral-500/5 transition-colors cursor-pointer text-center"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('GitHub')}
              className="py-2 px-3 rounded-lg border text-xs font-medium hover:bg-neutral-500/5 transition-colors cursor-pointer text-center"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              GitHub
            </button>
          </div>

          <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/signin" className="text-amber-500 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center text-[11px] py-2" style={{ color: 'var(--text-tertiary)' }}>
        RepurposeAI · Editorial Grade Software
      </div>
    </div>
  );
};
