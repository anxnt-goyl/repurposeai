import React, { useState, useEffect } from 'react';
import { Episode, ContentAsset, AssetStatus } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useProject } from '../../contexts/ProjectContext';
import {
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
  X,
  RotateCw,
  Sparkles,
  Zap,
  AlignLeft,
  Clock,
  FileText,
  Sliders,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExportModal } from '../common/ExportModal';

interface WorkspaceEditorProps {
  asset: ContentAsset;
  episode: Episode;
  onBack: () => void;
  onSaveContent: (newContent: string) => void;
  onUpdateStatus: (status: AssetStatus) => void;
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  asset,
  episode,
  onBack,
  onSaveContent,
  onUpdateStatus,
}) => {
  const { addToast } = useToast();
  const { regenerateAsset } = useProject();

  const [text, setText] = useState(asset.content);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [lastSaved, setLastSaved] = useState('Saved just now');
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    setText(asset.content);
  }, [asset.id, asset.content]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setLastSaved('Saving...');
    onSaveContent(val);
    setTimeout(() => {
      setLastSaved('Saved just now');
    }, 400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    addToast('Copied to Clipboard', `Ready to post on ${asset.platform}`, 'info');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApprove = () => {
    onUpdateStatus('approved');
    addToast('Asset Approved', `"${asset.title}" is ready for export`, 'success');
    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
  };

  const handleRegenerateTone = async (toneModifier: 'standard' | 'concise' | 'punchy') => {
    setIsRegenerating(true);
    addToast('Regenerating Draft', `Adapting with ${toneModifier} tone...`, 'info');
    try {
      await regenerateAsset(asset.id, toneModifier);
      addToast('Draft Updated', 'Fresh variation ready for inspection', 'success');
    } catch (err: any) {
      addToast('Regeneration notice', err?.message || 'Unable to regenerate draft', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(words / 180));
  const isApproved = asset.status === 'approved';
  const isRejected = asset.status === 'rejected';

  // Find linked moment if available
  const linkedMoment = asset.momentId
    ? episode.moments.find((m) => m.id === asset.momentId)
    : episode.moments[0];

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border hover:bg-neutral-500/10 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
            title="Back to all assets"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500">
                {asset.platform}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {lastSaved}
              </span>
            </div>
            <h2 className="text-base font-semibold leading-tight mt-0.5 truncate max-w-[240px] sm:max-w-md">{asset.title}</h2>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 hover:bg-neutral-500/5 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
            title="Export project assets"
          >
            <Download className="w-3.5 h-3.5 opacity-70 shrink-0" />
            <span className="hidden sm:inline">Export Assets</span>
            <span className="sm:hidden">Export</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 hover:bg-neutral-500/5 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-70" />
            )}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          {!isRejected ? (
            <button
              type="button"
              onClick={() => onUpdateStatus('rejected')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 border border-transparent transition-colors cursor-pointer"
            >
              Reject
            </button>
          ) : (
            <span className="text-xs text-red-500 font-medium px-2 py-1 bg-red-500/10 rounded">
              Rejected
            </span>
          )}

          <button
            type="button"
            onClick={handleApprove}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isApproved
                ? 'bg-emerald-600 text-white'
                : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: isApproved ? '#059669' : 'var(--accent-primary)',
              color: isApproved ? '#ffffff' : 'var(--accent-contrast)',
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isApproved ? 'Approved' : 'Approve Draft'}</span>
          </button>
        </div>
      </div>

      {/* Split Layout: Left Source Context + Right Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Source Context Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className="p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Source Audio Context</span>
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500">
                {asset.sourceContext?.timestamp || linkedMoment?.timestamp || '02:41'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-400 block mb-1">
                Original Verbatim Statement
              </span>
              <blockquote
                className="text-xs leading-relaxed italic border-l-2 pl-3 py-1"
                style={{
                  borderColor: 'var(--accent-highlight)',
                  color: 'var(--text-primary)',
                }}
              >
                "{asset.sourceContext?.quote || linkedMoment?.quote}"
              </blockquote>
            </div>

            {/* AI Context Intelligence Box */}
            <div
              className="p-3.5 rounded-lg space-y-2 text-xs border"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Detected Moment:</span>
                <span className="font-medium capitalize text-amber-500">
                  {asset.sourceContext?.momentType || linkedMoment?.type || 'Insight'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Target Tone:</span>
                <span className="font-medium">
                  {asset.sourceContext?.tone || 'Thought-leadership & Analytical'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Target Audience:</span>
                <span className="font-medium">
                  {asset.sourceContext?.audience || 'Creators, Founders, Operators'}
                </span>
              </div>
            </div>

            {/* Why it matters note */}
            {linkedMoment && (
              <div className="pt-2 text-xs border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[11px] text-neutral-400 block mb-0.5 font-medium">
                  Strategic Editorial Value
                </span>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {linkedMoment.whyItMatters}
                </p>
              </div>
            )}
          </div>

          {/* Quick Tone Transformation Actions (Section 88 WOW Moment) */}
          <div
            className="p-4 rounded-xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">
                Adapt Draft Tone
              </span>
              {isRegenerating && (
                <span className="text-[11px] font-mono text-amber-500 animate-pulse">
                  Regenerating...
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={isRegenerating}
                onClick={() => handleRegenerateTone('standard')}
                className="py-1.5 px-2 rounded-lg border text-[11px] font-medium text-center hover:bg-neutral-500/10 transition-colors cursor-pointer disabled:opacity-50"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Standard
              </button>
              <button
                disabled={isRegenerating}
                onClick={() => handleRegenerateTone('concise')}
                className="py-1.5 px-2 rounded-lg border text-[11px] font-medium text-center hover:bg-neutral-500/10 transition-colors cursor-pointer disabled:opacity-50"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Make Concise
              </button>
              <button
                disabled={isRegenerating}
                onClick={() => handleRegenerateTone('punchy')}
                className="py-1.5 px-2 rounded-lg border text-[11px] font-medium text-center hover:bg-neutral-500/10 transition-colors cursor-pointer disabled:opacity-50"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Make Punchy
              </button>
            </div>
          </div>
        </div>

        {/* Right: Editable Workspace (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div
            className="flex-1 rounded-xl border flex flex-col overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Editor Toolbar */}
            <div
              className="px-4 py-2.5 border-b flex items-center justify-between text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-subtle)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                  Platform Draft Editor
                </span>
                <span className="text-neutral-400">·</span>
                <span className="capitalize text-neutral-400 font-mono text-[11px]">
                  {asset.platform} native format
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] opacity-70">
                <span>{words} words</span>
                <span>·</span>
                <span>{readingTime}m read</span>
              </div>
            </div>

            {/* Editable Text Area */}
            <textarea
              value={text}
              onChange={handleTextChange}
              rows={16}
              className="w-full flex-1 p-5 text-sm leading-relaxed bg-transparent outline-none resize-none font-sans"
              placeholder="Start drafting or editing your platform content..."
              style={{ color: 'var(--text-primary)' }}
            />

            {/* Bottom Metadata Bar */}
            <div
              className="px-4 py-2 border-t flex items-center justify-between text-[11px]"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-tertiary)',
              }}
            >
              <span>Live autosaved to project session</span>
              <span>Human-in-the-Loop: Reviewer final gate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal inside project editor */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
