import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { episodeService } from '../services/episodeService';
import {
  ContentAsset,
  Moment,
  PlatformType,
  AssetStatus,
} from '../types';
import {
  WorkspaceOverview,
} from '../components/workspace/WorkspaceOverview';
import {
  WorkspaceTranscript,
} from '../components/workspace/WorkspaceTranscript';
import {
  WorkspaceMoments,
} from '../components/workspace/WorkspaceMoments';
import {
  WorkspaceContent,
} from '../components/workspace/WorkspaceContent';
import {
  WorkspaceEditor,
} from '../components/workspace/WorkspaceEditor';
import {
  WorkspaceReview,
} from '../components/workspace/WorkspaceReview';
import { ExportModal } from '../components/common/ExportModal';
import {
  Download,
  Share2,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Sparkles,
  Plus,
  FolderKanban,
  ExternalLink,
  Edit2,
  Check,
  X,
  FileText,
} from 'lucide-react';

type WorkspaceTab = 'overview' | 'transcript' | 'moments' | 'content' | 'review';

export const WorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { episodes, currentEpisode, setCurrentEpisodeById, updateAssetStatus, updateAssetContent, regenerateAsset } = useProject();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [editingAsset, setEditingAsset] = useState<ContentAsset | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Extract canonical YouTube URL
  const canonicalYouTubeUrl = React.useMemo(() => {
    const url = currentEpisode?.sourceUrl;
    if (!url) return null;
    const m1 = url.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);
    if (m1) return `https://www.youtube.com/watch?v=${m1[1]}`;
    const m2 = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (m2) return `https://www.youtube.com/watch?v=${m2[1]}`;
    if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return `https://www.youtube.com/watch?v=${url.trim()}`;
    return null;
  }, [currentEpisode?.sourceUrl]);

  React.useEffect(() => {
    if (currentEpisode) {
      setTitleInput(currentEpisode.title);
    }
  }, [currentEpisode?.id, currentEpisode?.title]);

  const handleSaveTitle = async () => {
    if (!currentEpisode || !titleInput.trim() || titleInput.trim() === currentEpisode.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const updated = await episodeService.updateEpisodeTitle(currentEpisode.id, titleInput.trim());
      currentEpisode.title = updated.title;
      setIsEditingTitle(false);
      addToast('Project Renamed', `Updated title to "${updated.title}"`, 'success');
    } catch (err: any) {
      addToast('Rename Failed', err.message || 'Could not update title', 'error');
    }
  };

  // Sync route param with active episode if needed
  React.useEffect(() => {
    if (id && currentEpisode?.id !== id) {
      const match = episodes.find((e) => e.id === id);
      if (match) {
        setCurrentEpisodeById(id);
      }
    }
  }, [id, currentEpisode?.id, episodes, setCurrentEpisodeById]);

  // Handle edge case: No active episode in workspace
  if (!currentEpisode) {
    return (
      <div
        className="p-8 sm:p-12 rounded-2xl border text-center space-y-4 max-w-lg mx-auto my-12"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500">
          <FolderKanban className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">No project selected</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Please select an existing project from your repository or ingest a new recording.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 rounded-lg text-xs font-medium border hover:bg-neutral-500/5 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            Browse Projects
          </button>
          <button
            onClick={() => navigate('/new-repurpose')}
            className="px-4 py-2 rounded-lg text-xs font-semibold shadow-xs hover:opacity-90 cursor-pointer flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Repurpose</span>
          </button>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: WorkspaceTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'moments', label: 'Moments', count: currentEpisode.moments?.length || 0 },
    { id: 'content', label: 'Content', count: currentEpisode.assets?.length || 0 },
    {
      id: 'review',
      label: 'Review',
      count: currentEpisode.assets?.filter((a) => a.status === 'approved').length || 0,
    },
  ];

  const handleGenerateFromMoment = (moment: Moment, platform: PlatformType = 'linkedin') => {
    let target = currentEpisode.assets?.find(
      (a) => a.momentId === moment.id && a.platform === platform
    );
    if (!target) {
      target = currentEpisode.assets?.find((a) => a.platform === platform) || currentEpisode.assets?.[0];
    }
    if (target) {
      setEditingAsset(target);
      addToast(
        'Editor Initialized',
        `Inspecting ${platform.toUpperCase()} draft for moment ${moment.timestamp}`,
        'info'
      );
    }
  };

  const handleSelectMomentFromTranscript = (momentId: string) => {
    const moment = currentEpisode.moments?.find((m) => m.id === momentId);
    if (moment) {
      handleGenerateFromMoment(moment);
    } else {
      setActiveTab('moments');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl pb-16 min-w-0">
      {/* Workspace Header */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="space-y-1.5 min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/projects')}
              className="text-xs flex items-center gap-1 hover:underline cursor-pointer shrink-0"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Projects</span>
            </button>
            <span className="text-neutral-400">/</span>
            <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
              {currentEpisode.status}
            </span>
          </div>

          {isEditingTitle ? (
            <div className="flex items-center gap-2 pt-1 max-w-xl">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="px-2.5 py-1 text-sm sm:text-base font-bold rounded-lg border outline-none w-full"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--accent-primary)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 cursor-pointer shrink-0"
                title="Save title"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="p-1.5 rounded-lg bg-neutral-500/20 text-neutral-400 hover:bg-neutral-500/30 cursor-pointer shrink-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {currentEpisode.title}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setTitleInput(currentEpisode.title);
                  setIsEditingTitle(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 transition-opacity cursor-pointer shrink-0"
                title="Rename project"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div
            className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>{currentEpisode.duration}</span>
            <span>·</span>
            <span className="capitalize">{currentEpisode.sourceType} source</span>
            <span>·</span>
            <span>{currentEpisode.dateProcessed}</span>
            {currentEpisode.sourceFilename && (
              <>
                <span>·</span>
                <span className="truncate max-w-[200px]" title={currentEpisode.sourceFilename}>
                  {currentEpisode.sourceFilename}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          {canonicalYouTubeUrl && (
            <a
              href={canonicalYouTubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all hover:bg-neutral-500/10 cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Open Original Video on YouTube (opens in new tab)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="hidden sm:inline">Watch Original Video ↗</span>
              <span className="sm:hidden">Watch ↗</span>
            </a>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Final Assets</span>
            <span className="sm:hidden">Export Assets</span>
          </button>
        </div>
      </div>

      {/* Workspace Sub-Navigation with Horizontal Touch Scroll */}
      {!editingAsset && (
        <div
          className="flex items-center gap-1 border-b overflow-x-auto pb-0.5 scrollbar-none"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs px-3.5 sm:px-4 py-2.5 font-medium flex items-center gap-2 transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-neutral-900 dark:border-white font-semibold'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:bg-neutral-500/5'
                }`}
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-500/10">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      {editingAsset ? (
        <WorkspaceEditor
          asset={editingAsset}
          episode={currentEpisode}
          onBack={() => setEditingAsset(null)}
          onSaveContent={(newContent) => {
            updateAssetContent(editingAsset.id, newContent);
            setEditingAsset((prev) => (prev ? { ...prev, content: newContent } : null));
          }}
          onUpdateStatus={(newStatus) => {
            updateAssetStatus(editingAsset.id, newStatus);
            setEditingAsset((prev) => (prev ? { ...prev, status: newStatus } : null));
          }}
        />
      ) : (
        <div className="min-w-0">
          {activeTab === 'overview' && (
            <WorkspaceOverview
              episode={currentEpisode}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'transcript' && (
            <WorkspaceTranscript
              episode={currentEpisode}
              onSelectMoment={handleSelectMomentFromTranscript}
            />
          )}

          {activeTab === 'moments' && (
            <WorkspaceMoments
              episode={currentEpisode}
              onGenerateFromMoment={handleGenerateFromMoment}
            />
          )}

          {activeTab === 'content' && (
            <WorkspaceContent
              episode={currentEpisode}
              onEditAsset={(asset) => setEditingAsset(asset)}
              onUpdateStatus={updateAssetStatus}
              onRegenerate={(assetId) => {
                regenerateAsset(assetId);
                addToast('Regenerating Draft', 'Adapting variant with fresh phrasing...', 'info');
              }}
            />
          )}

          {activeTab === 'review' && (
            <WorkspaceReview
              episode={currentEpisode}
              onEditAsset={(asset) => setEditingAsset(asset)}
              onUpdateStatus={updateAssetStatus}
              onOpenExport={() => setIsExportModalOpen(true)}
            />
          )}
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
