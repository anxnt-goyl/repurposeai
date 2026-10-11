import React, { useState } from 'react';
import { Episode, ContentAsset, AssetStatus } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit3,
  Download,
  Check,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WorkspaceReviewProps {
  episode: Episode;
  onEditAsset: (asset: ContentAsset) => void;
  onUpdateStatus: (assetId: string, status: AssetStatus) => void;
  onOpenExport: () => void;
}

export const WorkspaceReview: React.FC<WorkspaceReviewProps> = ({
  episode,
  onEditAsset,
  onUpdateStatus,
  onOpenExport,
}) => {
  const { addToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'approved' | 'rejected'>('all');

  const assets = episode.assets || [];
  const totalAssets = assets.length;
  const approvedAssets = assets.filter((a) => a.status === 'approved');
  const needsReviewAssets = assets.filter((a) => a.status === 'needs_review' || a.status === 'draft');
  const rejectedAssets = assets.filter((a) => a.status === 'rejected');

  const reviewedCount = approvedAssets.length + rejectedAssets.length;
  const progressPercent = totalAssets > 0 ? Math.round((reviewedCount / totalAssets) * 100) : 0;

  const filteredAssets = assets.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'approved') return a.status === 'approved';
    if (filter === 'rejected') return a.status === 'rejected';
    if (filter === 'needs_review') return a.status === 'needs_review' || a.status === 'draft';
    return true;
  });

  const handleApproveAllPending = () => {
    needsReviewAssets.forEach((ast) => {
      onUpdateStatus(ast.id, 'approved');
    });
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
    addToast('All Pending Approved', `${needsReviewAssets.length} assets verified`, 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Review Progress Card */}
      <div
        className="p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-500 font-semibold">
              Editorial Quality Gate
            </span>
            <span className="text-neutral-400">·</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              AI creates. You decide.
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {reviewedCount} of {totalAssets} assets finalized ({progressPercent}%)
          </h2>

          {/* Progress bar */}
          <div className="w-full max-w-md h-2 rounded-full bg-neutral-500/10 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(approvedAssets.length / totalAssets) * 100}%` }}
              title={`${approvedAssets.length} approved`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${(needsReviewAssets.length / totalAssets) * 100}%` }}
              title={`${needsReviewAssets.length} pending review`}
            />
            <div
              className="bg-red-500 h-full transition-all duration-300"
              style={{ width: `${(rejectedAssets.length / totalAssets) * 100}%` }}
              title={`${rejectedAssets.length} rejected`}
            />
          </div>

          <div className="flex items-center gap-4 text-xs pt-1 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {approvedAssets.length} Approved
            </span>
            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {needsReviewAssets.length} Needs Review
            </span>
            <span className="flex items-center gap-1.5 text-red-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {rejectedAssets.length} Rejected
            </span>
          </div>
        </div>

        {/* Batch Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {needsReviewAssets.length > 0 && (
            <button
              onClick={handleApproveAllPending}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border hover:bg-neutral-500/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              Approve Remaining ({needsReviewAssets.length})
            </button>
          )}

          <button
            onClick={onOpenExport}
            className="px-4 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Approved ({approvedAssets.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
        {[
          { id: 'all', label: `All Assets (${totalAssets})` },
          { id: 'needs_review', label: `Needs Review (${needsReviewAssets.length})` },
          { id: 'approved', label: `Approved (${approvedAssets.length})` },
          { id: 'rejected', label: `Rejected (${rejectedAssets.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-neutral-500/10 font-semibold'
                : 'opacity-60 hover:opacity-100 hover:bg-neutral-500/5'
            }`}
            style={{
              color: filter === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Review Asset Cards */}
      <div className="space-y-3">
        {filteredAssets.map((asset) => {
          const isApproved = asset.status === 'approved';
          const isRejected = asset.status === 'rejected';
          const isPending = !isApproved && !isRejected;

          return (
            <div
              key={asset.id}
              className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="space-y-1 flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500">
                    {asset.platform}
                  </span>
                  <span className="text-xs font-semibold truncate">{asset.title}</span>
                </div>
                <p
                  className="text-xs line-clamp-2 leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {asset.content}
                </p>
                <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
                  <span>{asset.wordCount} words</span>
                  <span>·</span>
                  <span>{asset.lastEdited}</span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => onEditAsset(asset)}
                  className="px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-neutral-500/5 transition-colors cursor-pointer flex items-center gap-1.5"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <Edit3 className="w-3 h-3 opacity-60" />
                  <span>Inspect</span>
                </button>

                {isApproved ? (
                  <span className="text-xs font-medium text-emerald-500 px-2.5 py-1 rounded bg-emerald-500/10 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Approved</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      onUpdateStatus(asset.id, 'approved');
                      addToast('Approved', `"${asset.title}" approved`, 'success');
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Approve</span>
                  </button>
                )}

                {isRejected ? (
                  <span className="text-xs font-medium text-red-500 px-2.5 py-1 rounded bg-red-500/10 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    <span>Rejected</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      onUpdateStatus(asset.id, 'rejected');
                      addToast('Rejected', `"${asset.title}" rejected`, 'warning');
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Reject</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
