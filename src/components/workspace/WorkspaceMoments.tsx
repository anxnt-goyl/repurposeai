import React, { useState } from 'react';
import { Episode, Moment, PlatformType } from '../../types';
import { Sparkles, ArrowRight, Filter, Flame, ExternalLink } from 'lucide-react';

interface WorkspaceMomentsProps {
  episode: Episode;
  onGenerateFromMoment: (moment: Moment, platform?: PlatformType) => void;
}

export const WorkspaceMoments: React.FC<WorkspaceMomentsProps> = ({
  episode,
  onGenerateFromMoment,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');

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

  const momentTypes = [
    'all',
    'Insight',
    'Hook',
    'Controversial',
    'Takeaway',
    'Quote',
    'Story',
  ];

  const moments = episode.moments || [];
  const filteredMoments = moments.filter(
    (m) => selectedType === 'all' || m.type.toLowerCase() === selectedType.toLowerCase()
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Extracted High-Value Moments ({moments.length})
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Ranked by editorial resonance, contrarian index, and platform versatility.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {momentTypes.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`text-[11px] px-2.5 py-1 rounded-md border capitalize whitespace-nowrap transition-colors cursor-pointer ${
                selectedType.toLowerCase() === t.toLowerCase()
                  ? 'border-neutral-900 dark:border-white font-medium bg-neutral-100 dark:bg-white/10'
                  : 'border-transparent hover:bg-neutral-500/10'
              }`}
              style={{
                color:
                  selectedType.toLowerCase() === t.toLowerCase()
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Moments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMoments.map((moment) => {
          return (
            <div
              key={moment.id}
              className="p-5 rounded-xl border flex flex-col justify-between transition-all hover:border-neutral-400 dark:hover:border-neutral-600 group"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="space-y-3">
                {/* Meta Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500">
                      #{moment.index < 10 ? `0${moment.index}` : moment.index}
                    </span>
                    {getYoutubeTimestampUrl(episode.sourceUrl, moment.timestamp) ? (
                      <a
                        href={getYoutubeTimestampUrl(episode.sourceUrl, moment.timestamp)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs hover:text-red-500 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        title={`Watch moment on YouTube at ${moment.timestamp} (opens in new tab)`}
                      >
                        <span>{moment.timestamp}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {moment.timestamp}
                      </span>
                    )}
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-neutral-500/20 capitalize" style={{ color: 'var(--text-secondary)' }}>
                      {moment.type}
                    </span>
                  </div>

                  {/* Impact Score */}
                  <div className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-500">
                    <Flame className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{moment.score}</span>
                  </div>
                </div>

                {/* Title & Quote */}
                <div>
                  <h3 className="text-sm font-semibold mb-1 group-hover:text-amber-500 transition-colors">
                    {moment.title}
                  </h3>
                  <blockquote
                    className="text-xs leading-relaxed italic border-l-2 pl-3 my-2"
                    style={{
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    "{moment.quote}"
                  </blockquote>
                </div>

                {/* Why it matters */}
                <div
                  className="p-2.5 rounded-lg text-[11px] leading-snug"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span className="font-semibold text-neutral-400 block mb-0.5">
                    Why it matters
                  </span>
                  {moment.whyItMatters}
                </div>
              </div>

              {/* Bottom Actions & Potential Platforms */}
              <div className="pt-4 mt-3 border-t flex flex-wrap items-center justify-between gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-neutral-400">Potential:</span>
                  <div className="flex items-center gap-1">
                    {moment.potentialPlatforms.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-500 font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onGenerateFromMoment(moment, moment.potentialPlatforms[0])}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  <span>Generate Content</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
