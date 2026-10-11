import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Check, Info, AlertCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              {isError && (
                <div className="w-4 h-4 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                  <AlertCircle className="w-3 h-3" />
                </div>
              )}
              {isWarning && (
                <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <AlertCircle className="w-3 h-3" />
                </div>
              )}
              {!isSuccess && !isError && !isWarning && (
                <div className="w-4 h-4 rounded-full bg-neutral-500/20 text-neutral-400 flex items-center justify-center">
                  <Info className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-semibold leading-tight">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
