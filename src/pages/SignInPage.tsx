import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowRight, Sun, Moon, AlertCircle, KeyRound, X } from 'lucide-react';
import { AuthStatusModal } from '../components/common/AuthStatusModal';
import { apiClient } from '../services/apiClient';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Popup modal state for login failures
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
  });

  // Forgot password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Incorrect Email',
        message: 'Email address is required. Please enter your email address to sign in.',
      });
      addToast('Incorrect Email', 'Please enter your email address', 'error');
      return;
    }

    if (!password) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Incorrect Password',
        message: 'Password is required. Please enter your account password to sign in.',
      });
      addToast('Incorrect Password', 'Please enter your account password', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await signIn(trimmedEmail, password);
      // Mark login success for dashboard popup
      sessionStorage.setItem('repurpose_login_success', 'true');
      sessionStorage.setItem('repurpose_login_user', trimmedEmail);
      addToast('Login Successful', `Welcome back to RepurposeAI!`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      const code = err.code || '';

      const isEmailError =
        code === 'INCORRECT_EMAIL' ||
        code === 'MISSING_EMAIL' ||
        msg.includes('incorrect email') ||
        msg.includes('no account found') ||
        msg.includes('user not found') ||
        msg.includes('email not found');

      const isPasswordError =
        code === 'INCORRECT_PASSWORD' ||
        code === 'MISSING_PASSWORD' ||
        msg.includes('incorrect password') ||
        msg.includes('wrong password') ||
        msg.includes('invalid password');

      let errorTitle = 'Login Failed';
      let errorMsg = err.message || 'Authentication failed. Please verify your credentials.';

      if (isEmailError) {
        errorTitle = 'Incorrect Email';
        errorMsg =
          err.message ||
          'No account found with this email address. Please check your spelling or sign up.';
      } else if (isPasswordError) {
        errorTitle = 'Incorrect Password';
        errorMsg =
          err.message ||
          'The password you entered is incorrect. Please verify and try again.';
      } else if (msg.includes('invalid email or password') || msg.includes('invalid credentials')) {
        errorTitle = 'Incorrect Password or Email';
        errorMsg = 'Incorrect email or password. Please verify your credentials and try again.';
      }

      setModalState({
        isOpen: true,
        type: 'error',
        title: errorTitle,
        message: errorMsg,
      });

      addToast(errorTitle, errorMsg, 'error');

      // Persist failure indicator for dashboard
      sessionStorage.setItem('repurpose_login_failure_title', errorTitle);
      sessionStorage.setItem('repurpose_login_failure_msg', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetNewPassword) {
      addToast('Missing Fields', 'Please enter both your email and new password', 'warning');
      return;
    }

    try {
      setIsResetting(true);
      await apiClient.post('/api/auth/reset-password', {
        email: resetEmail.trim(),
        newPassword: resetNewPassword,
      });
      setForgotPasswordOpen(false);
      setEmail(resetEmail.trim());
      setPassword(resetNewPassword);
      addToast('Password Updated', 'Your password has been updated. Signing you in...', 'success');
      await signIn(resetEmail.trim(), resetNewPassword);
      sessionStorage.setItem('repurpose_login_success', 'true');
      navigate('/dashboard');
    } catch (err: any) {
      addToast('Reset Failed', err.message || 'Failed to update password', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOAuth = (provider: string) => {
    addToast(
      'OAuth Authentication',
      `${provider} SSO requires external OAuth credentials in production. Please sign in using your account email and password.`,
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
          className="p-6 sm:p-8 rounded-2xl border shadow-xl space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight">Sign in to your account</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Enter your credentials to access your content workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email.trim());
                    setForgotPasswordOpen(true);
                  }}
                  className="text-[11px] text-amber-500 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-amber-500"
              />
              <label htmlFor="remember" className="text-xs select-none" style={{ color: 'var(--text-secondary)' }}>
                Remember this session
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
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
            Don't have an account?{' '}
            <Link to="/signup" className="text-amber-500 font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center text-[11px] py-2" style={{ color: 'var(--text-tertiary)' }}>
        RepurposeAI · Editorial Grade Software
      </div>

      {/* Login Failure Popup Modal */}
      <AuthStatusModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        actionText="Try Again"
      />

      {/* Forgot / Reset Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Enter your account email and choose a new password to restore instant access.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="flex-1 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer hover:bg-neutral-500/5 transition-colors"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors cursor-pointer"
                >
                  {isResetting ? 'Updating...' : 'Update & Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
