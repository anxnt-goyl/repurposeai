import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface AuthStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  actionText?: string;
  autoCloseDuration?: number; // In milliseconds, optional
}

export const AuthStatusModal: React.FC<AuthStatusModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  actionText = 'Dismiss',
  autoCloseDuration,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let timer: NodeJS.Timeout;
    if (autoCloseDuration && autoCloseDuration > 0) {
      timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, onClose, autoCloseDuration]);

  if (!isOpen) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: isSuccess ? 'rgba(16, 185, 129, 0.4)' : isError ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-neutral-500/10 transition-colors cursor-pointer"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          {/* Icon Badge */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
              isSuccess
                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                : isError
                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
            }`}
          >
            {isSuccess ? (
              <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
            ) : isError ? (
              <ShieldAlert className="w-7 h-7 stroke-[2.2]" />
            ) : (
              <AlertCircle className="w-7 h-7 stroke-[2.2]" />
            )}
          </div>

          <div className="space-y-1">
            <span
              className={`text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                isSuccess
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : isError
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {isSuccess ? 'Authentication Success' : isError ? 'Authentication Failed' : 'Security Alert'}
            </span>
            <h3 className="text-lg font-bold tracking-tight pt-1">{title}</h3>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>

          <div className="w-full pt-3">
            <button
              onClick={onClose}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm hover:opacity-95 ${
                isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : isError
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {actionText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
