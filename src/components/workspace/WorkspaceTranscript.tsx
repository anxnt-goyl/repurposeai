import React, { useState, useEffect } from 'react';
import { Episode, TranscriptSegment } from '../../types';
import { episodeService } from '../../services/episodeService';
import { Search, Sparkles, ArrowUpRight, Copy, Check, Loader2, AlertCircle, RefreshCw, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface WorkspaceTranscriptProps {
  episode: Episode;
  onSelectMoment: (momentId: string) => void;
}

export const WorkspaceTranscript: React.FC<WorkspaceTranscriptProps> = ({
  episode,
  onSelectMoment,
}) => {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const [segments, setSegments] = useState<TranscriptSegment[]>(episode.transcript || []);
  const [isLoading, setIsLoading] = useState<boolean>(!episode.transcript || episode.transcript.length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscript = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await episodeService.getTranscript(episode.id);
      const list = Array.isArray(fetched) ? fetched : [];
      setSegments(list);
      episode.transcript = list;
    } catch (err: any) {
      console.error('[TRANSCRIPT] Failed to load transcript:', err);
      setError(err.message || 'Failed to retrieve transcript segments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (Array.isArray(episode.transcript) && episode.transcript.length > 0) {
      setSegments(episode.transcript);
      setIsLoading(false);
      setError(null);
      return;
    }

    fetchTranscript();
  }, [episode.id]);

  const filteredTranscript = segments.filter(
    (seg) =>
      seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.timestamp.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSpeakerLabel = (segment: TranscriptSegment) => {
    const raw = segment.speaker?.trim();
    if (raw && raw.toLowerCase() !== 'transcript') {
      return raw;
    }
    if (Array.isArray(episode.speakers) && episode.speakers.length === 1 && episode.speakers[0]) {
      return episode.speakers[0];
    }
    return 'Speaker 1';
  };

  const handleCopyText = (segment: TranscriptSegment) => {
    const speakerLabel = getSpeakerLabel(segment);
    navigator.clipboard.writeText(`[${segment.timestamp}] ${speakerLabel}: "${segment.text}"`);
    setCopiedId(segment.id);
    addToast('Timestamped quote copied', `Copied quote at ${segment.timestamp}`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Search & Stats Bar */}
      <div
        className="p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words, phrases, or speakers in transcript..."
            disabled={isLoading || segments.length === 0}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-transparent outline-none placeholder:text-neutral-400 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          <span>{filteredTranscript.length} of {segments.length} lines</span>
          <span>·</span>
          <span>{episode.duration} runtime</span>
        </div>
      </div>

      {/* Transcript Stream */}
      <div
        className="rounded-xl border divide-y overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Loading transcript segments...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-rose-500/10 text-rose-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-rose-500">Transcript Retrieval Failed</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
            <button
              onClick={fetchTranscript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-neutral-500/10 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : segments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-neutral-500/10 text-neutral-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                No transcript available
              </p>
              <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                This recording does not have any saved transcript segments. You can paste a transcript or re-ingest the recording.
              </p>
            </div>
          </div>
        ) : filteredTranscript.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              No transcript segments match "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-amber-500 hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          filteredTranscript.map((segment) => {
            const hasMoment = !!segment.momentId;

            return (
              <div
                key={segment.id}
                className={`p-4 transition-colors group ${
                  hasMoment
                    ? 'bg-amber-500/5 dark:bg-amber-500/10'
                    : 'hover:bg-neutral-500/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {getYoutubeTimestampUrl(episode.sourceUrl, segment.timestamp) ? (
                      <a
                        href={getYoutubeTimestampUrl(episode.sourceUrl, segment.timestamp)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs px-2 py-0.5 rounded border hover:border-red-500 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1"
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                        title={`Watch on YouTube at ${segment.timestamp} (opens in new tab)`}
                      >
                        <span>{segment.timestamp}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {segment.timestamp}
                      </span>
                    )}

                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {getSpeakerLabel(segment)}
                    </span>

                    {/* High-Value Moment Marker */}
                    {hasMoment && (
                      <button
                        onClick={() => segment.momentId && onSelectMoment(segment.momentId)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
                        title="Click to inspect extracted moment"
                      >
                        <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>High Value · {segment.momentType || 'Moment'}</span>
                        <ArrowUpRight className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopyText(segment)}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer shrink-0"
                    title="Copy quote with timestamp"
                  >
                    {copiedId === segment.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p
                  className="text-xs leading-relaxed pl-1"
                  style={{
                    color: hasMoment ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: hasMoment ? 500 : 400,
                  }}
                >
                  "{segment.text}"
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
