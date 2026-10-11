import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useProject } from '../contexts/ProjectContext';
import { AuthStatusModal } from '../components/common/AuthStatusModal';
import {
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  FolderKanban,
  MessageSquare,
  ChevronRight,
  Layers,
  Radio,
  Video,
  Mic,
  Youtube,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { episodes, currentEpisode, setCurrentEpisodeById, isLoadingEpisodes } = useProject();

  const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
  const [loginFailureModal, setLoginFailureModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    // Check if user just successfully logged in
    const isLoginSuccess = sessionStorage.getItem('repurpose_login_success');
    if (isLoginSuccess === 'true') {
      sessionStorage.removeItem('repurpose_login_success');
      setShowLoginSuccessModal(true);
      addToast(
        'Login Successful',
        `Welcome to your RepurposeAI Dashboard, ${user?.name || 'Creator'}!`,
        'success'
      );
    }

    // Check if there was any login failure indicator
    const failureTitle = sessionStorage.getItem('repurpose_login_failure_title');
    const failureMsg = sessionStorage.getItem('repurpose_login_failure_msg');
    if (failureTitle && failureMsg) {
      sessionStorage.removeItem('repurpose_login_failure_title');
      sessionStorage.removeItem('repurpose_login_failure_msg');
      setLoginFailureModal({
        isOpen: true,
        title: failureTitle,
        message: failureMsg,
      });
      addToast(failureTitle, failureMsg, 'error');
    }
  }, [user, addToast]);

  const handleOpenEpisode = (epId: string) => {
    setCurrentEpisodeById(epId);
    navigate(`/workspace/${epId}`);
  };

  // Real dynamic metrics calculated from actual project state
  const totalEpisodes = episodes.length;
  const totalAssets = episodes.reduce(
    (acc, ep) => acc + (ep.assets?.length || 0),
    0
  );
  const totalApproved = episodes.reduce(
    (acc, ep) =>
      acc + (ep.assets?.filter((a) => a.status === 'approved').length || 0),
    0
  );
  const hoursSaved = Math.max(0, Math.round(totalAssets * 0.35));
  const approvalRate =
    totalAssets > 0 ? Math.round((totalApproved / totalAssets) * 100) : 0;

  const currentMomentsCount = currentEpisode?.moments?.length || 0;
  const currentAssetsCount = currentEpisode?.assets?.length || 0;
  const currentApprovedCount =
    currentEpisode?.assets?.filter((a) => a.status === 'approved').length || 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl pb-12 min-w-0">
      {/* Top Greeting & Action Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b min-w-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            Good afternoon, {user?.name?.split(' ')[0] || 'Creator'}.
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Your content workspace is ready.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {currentEpisode && (
            <button
              onClick={() => handleOpenEpisode(currentEpisode.id)}
              className="px-3 sm:px-3.5 py-2 rounded-lg text-xs font-medium border hover:bg-neutral-500/5 transition-colors cursor-pointer truncate"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="hidden sm:inline">Open active project</span>
              <span className="sm:hidden">Active Project</span>
            </button>
          )}

          <button
            onClick={() => navigate('/new-repurpose')}
            className="px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-90 shrink-0"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Repurpose</span>
          </button>
        </div>
      </div>

      {/* 4 Dynamic Metrics Calculated Live */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Episodes Ingested',
            value: totalEpisodes.toString(),
            sub: `${totalEpisodes} processed recordings`,
          },
          {
            label: 'Content Assets',
            value: totalAssets.toString(),
            sub: 'Adapted across 5 channels',
          },
          {
            label: 'Time Saved',
            value: `${hoursSaved} hrs`,
            sub: 'Calculated production leverage',
          },
          {
            label: 'Approval Rate',
            value: `${approvalRate}%`,
            sub: `${totalApproved} verified drafts`,
          },
        ].map((metric, idx) => (
          <div
            key={idx}
            className="p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between min-w-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <span
              className="text-[11px] sm:text-xs font-medium block truncate"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {metric.label}
            </span>
            <div className="my-1.5 sm:my-2">
              <span className="text-xl sm:text-2xl font-mono font-bold tracking-tight block truncate">
                {metric.value}
              </span>
            </div>
            <span
              className="text-[10px] sm:text-[11px] truncate block"
              style={{ color: 'var(--text-secondary)' }}
            >
              {metric.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Prominent Active Project or Empty State */}
      {currentEpisode ? (
        <div
          className="p-4 sm:p-6 rounded-xl border space-y-4 sm:space-y-5 min-w-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="space-y-1 min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold truncate">
                  Active Project
                </span>
                <span className="text-neutral-400">·</span>
                <span className="text-xs font-mono text-emerald-500 font-medium shrink-0">
                  {currentEpisode.status}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {currentEpisode.title}
              </h2>
              <div
                className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{currentEpisode.duration}</span>
                <span>·</span>
                <span className="capitalize">{currentEpisode.sourceType}</span>
                <span>·</span>
                <span>{currentEpisode.dateProcessed}</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenEpisode(currentEpisode.id)}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-90 shrink-0 self-start sm:self-center"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>Continue Editing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compact Pipeline Visual */}
          <div
            className="p-3 sm:p-3.5 rounded-lg border grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 text-xs"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0 truncate">
                <span className="block font-medium truncate">Transcript</span>
                <span className="text-[10px] text-neutral-400 block truncate">Indexed</span>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0 truncate">
                <span className="block font-medium truncate">Analysis</span>
                <span className="text-[10px] text-neutral-400 block truncate">Parsed</span>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-amber-500 font-bold font-mono">
                {currentMomentsCount}
              </span>
              <div className="min-w-0 truncate">
                <span className="block font-medium truncate">Moments</span>
                <span className="text-[10px] text-neutral-400 block truncate">Scored</span>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-neutral-500 font-bold font-mono">
                {currentAssetsCount}
              </span>
              <div className="min-w-0 truncate">
                <span className="block font-medium truncate">Assets</span>
                <span className="text-[10px] text-neutral-400 block truncate">Adapted</span>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-emerald-500 font-bold font-mono">
                {currentApprovedCount}/{currentAssetsCount}
              </span>
              <div className="min-w-0 truncate">
                <span className="block font-medium truncate">Review</span>
                <span className="text-[10px] text-emerald-500 font-medium block truncate">
                  Approved
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          className="p-8 sm:p-12 rounded-xl border text-center space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500">
            <Plus className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">No episodes processed yet</h3>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Your first audio or video recording is ready to be transformed into an entire content system.
            </p>
          </div>
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => navigate('/new-repurpose')}
              className="px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs hover:opacity-90 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>Create your first repurpose</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {episodes.length > 0 && (
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Recent Projects</h3>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs hover:underline cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              View all ({episodes.length}) →
            </button>
          </div>

          <div
            className="rounded-xl border divide-y overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {episodes.map((ep) => {
              const isCurrent = currentEpisode?.id === ep.id;
              return (
                <div
                  key={ep.id}
                  onClick={() => handleOpenEpisode(ep.id)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-neutral-500/5 transition-colors cursor-pointer group min-w-0"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold group-hover:text-amber-500 transition-colors truncate">
                        {ep.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-2 text-[11px] font-mono"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="capitalize">{ep.sourceType}</span>
                      <span>·</span>
                      <span>{ep.duration}</span>
                      <span>·</span>
                      <span>{ep.dateProcessed}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs shrink-0 self-end sm:self-center font-mono">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {ep.assets.length} assets
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-500/10 text-neutral-400">
                      {ep.status}
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3 min-w-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/new-repurpose')}
            className="p-4 rounded-xl border text-left hover:border-neutral-400 transition-all cursor-pointer space-y-1 min-w-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Plus className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono text-neutral-400">Action 1</span>
            </div>
            <p className="text-xs font-semibold truncate">New Repurpose</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              Ingest video, audio, or YouTube link
            </p>
          </button>

          <button
            onClick={() => navigate('/chat')}
            className="p-4 rounded-xl border text-left hover:border-neutral-400 transition-all cursor-pointer space-y-1 min-w-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono text-neutral-400">Action 2</span>
            </div>
            <p className="text-xs font-semibold truncate">Open Assistant</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              Query with active episode context
            </p>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="p-4 rounded-xl border text-left hover:border-neutral-400 transition-all cursor-pointer space-y-1 min-w-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <FolderKanban className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono text-neutral-400">Action 3</span>
            </div>
            <p className="text-xs font-semibold truncate">Browse Projects</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              Access transcripts and saved drafts
            </p>
          </button>
        </div>
      </div>

      {/* Login Successful Popup Modal */}
      <AuthStatusModal
        isOpen={showLoginSuccessModal}
        onClose={() => setShowLoginSuccessModal(false)}
        type="success"
        title="Login Successful"
        message={`Welcome to RepurposeAI, ${user?.name || 'Creator'}! You are now securely authenticated. Your content command center and projects are loaded.`}
        actionText="Continue to Dashboard"
        autoCloseDuration={4500}
      />

      {/* Login Failure Popup Modal (if error present) */}
      {loginFailureModal && (
        <AuthStatusModal
          isOpen={loginFailureModal.isOpen}
          onClose={() => setLoginFailureModal(null)}
          type="error"
          title={loginFailureModal.title}
          message={loginFailureModal.message}
          actionText="Dismiss"
        />
      )}
    </div>
  );
};
