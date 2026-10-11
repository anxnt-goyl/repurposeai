import React, { useState } from 'react';
import { Episode, ContentAsset, PlatformType, AssetStatus } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useProject } from '../../contexts/ProjectContext';
import {
  Edit3,
  Copy,
  Check,
  X,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Plus,
  Trash2,
} from 'lucide-react';

interface WorkspaceContentProps {
  episode: Episode;
  onEditAsset: (asset: ContentAsset) => void;
  onUpdateStatus: (assetId: string, status: AssetStatus) => void;
  onRegenerate: (assetId: string) => void;
}

export const WorkspaceContent: React.FC<WorkspaceContentProps> = ({
  episode,
  onEditAsset,
  onUpdateStatus,
  onRegenerate,
}) => {
  const { addToast } = useToast();
  const { addAsset, deleteAsset } = useProject();
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [newAssetPlatform, setNewAssetPlatform] = useState<PlatformType>('linkedin');
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetContent, setNewAssetContent] = useState('');

  const platforms: Array<{ id: string; label: string; count?: number }> = [
    { id: 'all', label: 'All Assets', count: episode.assets.length },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      count: episode.assets.filter((a) => a.platform === 'linkedin').length,
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      count: episode.assets.filter((a) => a.platform === 'x').length,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      count: episode.assets.filter((a) => a.platform === 'instagram').length,
    },
    {
      id: 'blog',
      label: 'Blog Article',
      count: episode.assets.filter((a) => a.platform === 'blog').length,
    },
    {
      id: 'newsletter',
      label: 'Newsletter',
      count: episode.assets.filter((a) => a.platform === 'newsletter').length,
    },
    {
      id: 'show_notes',
      label: 'Show Notes',
      count: episode.assets.filter((a) => a.platform === 'show_notes').length,
    },
  ];

  const filteredAssets = episode.assets.filter(
    (a) => activePlatform === 'all' || a.platform === activePlatform
  );

  const handleCopy = (asset: ContentAsset) => {
    navigator.clipboard.writeText(asset.content);
    setCopiedId(asset.id);
    addToast('Copied to clipboard', `Draft for ${asset.title} copied`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetTitle.trim() || !newAssetContent.trim()) {
      addToast('Fields Required', 'Please enter a title and content for the asset', 'warning');
      return;
    }

    const words = newAssetContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(words / 180));

    const created: ContentAsset = {
      id: `ast-${episode.id}-custom-${Date.now()}`,
      episodeId: episode.id,
      platform: newAssetPlatform,
      title: newAssetTitle.trim(),
      content: newAssetContent.trim(),
      status: 'draft',
      lastEdited: 'Just now',
      wordCount: words,
      readingTimeMinutes: readingTime,
    };

    addAsset(created);
    addToast('Asset Created', `"${created.title}" added to ${created.platform}`, 'success');
    setNewAssetTitle('');
    setNewAssetContent('');
    setIsCreatingAsset(false);
  };

  return (
    <div className="space-y-5 max-w-5xl min-w-0">
      {/* Platform Navigation and Quick Add */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-1 min-w-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0 min-w-0">
          {platforms.map((p) => {
            const isActive = activePlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePlatform(p.id)}
                className={`text-xs px-3 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px shrink-0 ${
                  isActive
                    ? 'border-neutral-900 dark:border-white font-semibold'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:bg-neutral-500/5'
                }`}
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <span>{p.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-500/10">
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingAsset((prev) => !prev)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:opacity-90 self-start sm:self-center shrink-0"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-contrast)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Asset</span>
        </button>
      </div>

      {/* Inline Create Asset Modal / Form */}
      {isCreatingAsset && (
        <form
          onSubmit={handleCreateAsset}
          className="p-5 rounded-xl border space-y-4 shadow-sm animate-in fade-in duration-150"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              Create Custom Platform Asset
            </h3>
            <button
              type="button"
              onClick={() => setIsCreatingAsset(false)}
              className="p-1 rounded hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Target Platform
              </label>
              <select
                value={newAssetPlatform}
                onChange={(e) => setNewAssetPlatform(e.target.value as PlatformType)}
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="linkedin">LinkedIn Post</option>
                <option value="x">X (Twitter) Thread</option>
                <option value="instagram">Instagram Caption</option>
                <option value="blog">Blog Article</option>
                <option value="newsletter">Newsletter Section</option>
                <option value="show_notes">Show Notes Section</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Asset Title / Headline
              </label>
              <input
                type="text"
                value={newAssetTitle}
                onChange={(e) => setNewAssetTitle(e.target.value)}
                placeholder="e.g. 3 Counter-Intuitive Rules for Scaling"
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Draft Content Body
            </label>
            <textarea
              rows={4}
              value={newAssetContent}
              onChange={(e) => setNewAssetContent(e.target.value)}
              placeholder="Write or paste your adapted text for this platform..."
              className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingAsset(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-neutral-500/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              Save New Asset
            </button>
          </div>
        </form>
      )}

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div
          className="p-8 sm:p-12 rounded-xl border text-center space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">No assets found for {activePlatform}</h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              You can create a custom draft tailored specifically for this platform.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activePlatform !== 'all') {
                setNewAssetPlatform(activePlatform as PlatformType);
              }
              setIsCreatingAsset(true);
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Draft Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => {
            const isApproved = asset.status === 'approved';
            const isRejected = asset.status === 'rejected';

            return (
              <div
                key={asset.id}
                className="p-5 rounded-xl border flex flex-col justify-between transition-all hover:border-neutral-400 group min-w-0"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="space-y-3 min-w-0">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500 truncate shrink-0">
                      {asset.platform}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isApproved && (
                        <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-medium text-red-500 flex items-center gap-1 font-mono">
                          <AlertCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {!isApproved && !isRejected && (
                        <span className="text-[10px] font-mono text-amber-500 capitalize">
                          {asset.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold tracking-tight truncate leading-snug">
                    {asset.title}
                  </h3>

                  <p
                    className="text-xs line-clamp-3 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {asset.content}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400 pt-1">
                    <span>{asset.wordCount} words</span>
                    <span>·</span>
                    <span>{asset.readingTimeMinutes}m read</span>
                    {asset.sourceContext && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500 font-sans truncate">
                          src: {asset.sourceContext.timestamp}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div
                  className="pt-4 mt-3 border-t flex items-center justify-between gap-2 min-w-0"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(asset)}
                      className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedId === asset.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRegenerate(asset.id)}
                      className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Regenerate draft variation"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Status buttons */}
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateStatus(asset.id, 'approved');
                          addToast('Asset Approved', `"${asset.title}" marked as approved`, 'success');
                        }}
                        className="px-2 py-1 rounded text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateStatus(asset.id, 'rejected');
                          addToast('Asset Rejected', `"${asset.title}" marked as rejected`, 'warning');
                        }}
                        className="px-2 py-1 rounded text-[11px] font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        deleteAsset(asset.id);
                        addToast('Asset Removed', `"${asset.title}" deleted from project`, 'info');
                      }}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditAsset(asset)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all hover:bg-neutral-500/5 cursor-pointer shrink-0"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5 opacity-70" />
                    <span>Open Editor</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
