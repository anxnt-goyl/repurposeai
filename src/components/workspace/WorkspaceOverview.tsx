import React from 'react';
import { Episode } from '../../types';
import {
  Sparkles,
  Clock,
  Mic,
  Tag,
  CheckCircle2,
  FileText,
  ListTree,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface WorkspaceOverviewProps {
  episode: Episode;
  onNavigateTab: (tab: 'transcript' | 'moments' | 'content' | 'review') => void;
}

export const WorkspaceOverview: React.FC<WorkspaceOverviewProps> = ({
  episode,
  onNavigateTab,
}) => {
  const assets = episode.assets || [];
  const keyTakeaways = episode.keyTakeaways || [];
  const chapters = episode.chapters || [];
  const mainTopics = episode.mainTopics || [];
  const approvedCount = assets.filter((a) => a.status === 'approved').length;

  const linkedInCount = assets.filter((a) => a.platform === 'linkedin').length;

  function getYoutubeTimestampUrl(sourceUrl: string | undefined, timestamp: string): string | null {
    if (!sourceUrl || !sourceUrl.includes('youtube')) return null;
    const parts = timestamp.split(':').map((p) => parseInt(p, 10));
    let sec = 0;
    if (parts.length === 2) sec = (parts[0] || 0) * 60 + (parts[1] || 0);
    else if (parts.length === 3) sec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    const videoId =
      sourceUrl.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i)?.[1] ||
      sourceUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
    if (!videoId) return null;
    return `https://www.youtube.com/watch?v=${videoId}&t=${sec}s`;
  }
  const xCount = assets.filter((a) => a.platform === 'x').length;
  const instagramCount = assets.filter((a) => a.platform === 'instagram').length;
  const longFormCount = assets.filter((a) => ['blog', 'newsletter', 'show_notes'].includes(a.platform)).length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Highlights Banner */}
      <div
        className="p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-500 font-semibold">
              Analysis Complete
            </span>
            <span className="text-neutral-400">·</span>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {episode.duration} runtime
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">{episode.title}</h2>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {episode.summary}
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-500/10">
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Review Progress
            </p>
            <p className="text-lg font-bold font-mono">
              {approvedCount} / {assets.length}{' '}
              <span className="text-xs font-normal opacity-70">approved</span>
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('review')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all hover:bg-neutral-500/5 cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <span>Review Assets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid: Context & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Key Takeaways & Chapters */}
        <div className="md:col-span-2 space-y-6">
          {/* Key Takeaways */}
          <div
            className="p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Executive Takeaways</span>
              </h3>
              <span className="text-[11px] font-mono text-neutral-400">
                {keyTakeaways.length} points
              </span>
            </div>

            <div className="space-y-3">
              {keyTakeaways.map((takeaway, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                  <span className="w-5 h-5 rounded-md bg-neutral-500/10 text-neutral-500 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    0{idx + 1}
                  </span>
                  <p style={{ color: 'var(--text-primary)' }}>{takeaway}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chapters & Timeline */}
          <div
            className="p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-amber-500" />
                <span>Episode Chapters</span>
              </h3>
              <button
                onClick={() => onNavigateTab('transcript')}
                className="text-xs hover:underline cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                View full transcript →
              </button>
            </div>

            <div className="space-y-2.5">
              {chapters.map((chap, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 p-2.5 rounded-lg hover:bg-neutral-500/5 transition-colors border border-transparent hover:border-neutral-500/10"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">{chap.title}</p>
                    <p
                      className="text-[11px] leading-snug"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {chap.description}
                    </p>
                  </div>
                  {getYoutubeTimestampUrl(episode.sourceUrl, chap.timestamp) ? (
                    <a
                      href={getYoutubeTimestampUrl(episode.sourceUrl, chap.timestamp)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                      title={`Watch chapter on YouTube at ${chap.timestamp} (opens in new tab)`}
                    >
                      <span>{chap.timestamp}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500 shrink-0">
                      {chap.timestamp}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Metadata, Speakers, Topics */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div
            className="p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Episode Attributes
            </h3>

            <div className="space-y-3 text-xs divide-y divide-neutral-500/10">
              <div className="pt-2 first:pt-0">
                <span className="block text-[11px] text-neutral-400 mb-1">
                  Speakers
                </span>
                <div className="space-y-1">
                  {(episode.speakers || ['Host']).map((spk, i) => (
                    <div key={i} className="flex items-center gap-2 font-medium">
                      <Mic className="w-3.5 h-3.5 opacity-60" />
                      <span>{spk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="block text-[11px] text-neutral-400 mb-1">
                  Tone & Cadence
                </span>
                <p className="font-medium">{episode.tone || 'Conversational, analytical'}</p>
              </div>

              <div className="pt-2">
                <span className="block text-[11px] text-neutral-400 mb-1.5">
                  Extracted Topics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {mainTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md border font-medium"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="block text-[11px] text-neutral-400 mb-1.5">
                  Source
                </span>
                {episode.sourceType === 'youtube' && episode.sourceUrl ? (
                  <a
                    href={
                      episode.sourceUrl.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i)?.[1]
                        ? `https://www.youtube.com/watch?v=${episode.sourceUrl.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i)![1]}`
                        : episode.sourceUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1]
                        ? `https://www.youtube.com/watch?v=${episode.sourceUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)![1]}`
                        : episode.sourceUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Watch Original Video ↗</span>
                  </a>
                ) : episode.sourceFilename ? (
                  <p className="font-mono text-xs truncate" title={episode.sourceFilename}>
                    {episode.sourceFilename}
                  </p>
                ) : (
                  <p className="text-xs font-medium capitalize">{episode.sourceType} Ingest</p>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">File / Stream Size</span>
                <span className="font-mono">{episode.fileSize || 'Standard'}</span>
              </div>
            </div>
          </div>

          {/* Quick Repurposing Breakdown */}
          <div
            className="p-5 rounded-xl border space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Generated Assets Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-neutral-500/5">
                <span className="text-[10px] text-neutral-400 block">LinkedIn</span>
                <span className="font-mono font-semibold text-sm">{linkedInCount} posts</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-500/5">
                <span className="text-[10px] text-neutral-400 block">X (Twitter)</span>
                <span className="font-mono font-semibold text-sm">{xCount} threads</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-500/5">
                <span className="text-[10px] text-neutral-400 block">Instagram</span>
                <span className="font-mono font-semibold text-sm">{instagramCount} captions</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-500/5">
                <span className="text-[10px] text-neutral-400 block">Blog & Email</span>
                <span className="font-mono font-semibold text-sm">{longFormCount} long-form</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('content')}
              className="w-full mt-2 py-2 text-xs font-medium rounded-lg border text-center hover:bg-neutral-500/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              Browse all {assets.length} assets →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
