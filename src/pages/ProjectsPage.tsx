import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import {
  FolderKanban,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Video,
  Mic,
  Youtube,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { ExportModal } from '../components/common/ExportModal';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { episodes, currentEpisode, setCurrentEpisodeById, deleteEpisode } = useProject();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'youtube'>('all');
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const filtered = episodes.filter((ep) => {
    const matchesSearch =
      ep.title.toLowerCase().includes(search.toLowerCase()) ||
      ep.summary.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || ep.sourceType === filterType;
    return matchesSearch && matchesType;
  });

  const handleSelectEpisode = (id: string) => {
    setCurrentEpisodeById(id);
    navigate(`/workspace/${id}`);
  };

  const handleExportEpisode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCurrentEpisodeById(id);
    setExportModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b min-w-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Projects Repository</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            All processed conversations, transcripts, and platform-adapted asset collections.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap sm:flex-nowrap">
          {episodes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (currentEpisode) {
                  setExportModalOpen(true);
                } else if (episodes[0]) {
                  setCurrentEpisodeById(episodes[0].id);
                  setExportModalOpen(true);
                }
              }}
              className="px-3 sm:px-3.5 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 hover:bg-neutral-500/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Export project assets"
            >
              <Download className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span className="hidden sm:inline">Export Assets</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}

          <button
            onClick={() => navigate('/new-repurpose')}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-90 shrink-0"
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

      {/* Search & Filter bar */}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by episode title, guest or topic..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-transparent outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'video', 'audio', 'youtube'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-[11px] px-2.5 py-1 rounded-md border capitalize transition-colors cursor-pointer ${
                filterType === t
                  ? 'border-neutral-900 dark:border-white font-medium bg-neutral-100 dark:bg-white/10'
                  : 'border-transparent hover:bg-neutral-500/10'
              }`}
              style={{
                color:
                  filterType === t
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div
        className="rounded-xl border divide-y overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <p>No projects found matching your query.</p>
            <button
              onClick={() => navigate('/new-repurpose')}
              className="text-amber-500 hover:underline font-medium"
            >
              Start your first repurpose →
            </button>
          </div>
        ) : (
          filtered.map((ep) => {
            return (
              <div
                key={ep.id}
                onClick={() => handleSelectEpisode(ep.id)}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-neutral-500/5 transition-colors cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-neutral-500/10 text-neutral-500">
                      {ep.sourceType === 'video' && <Video className="w-3.5 h-3.5" />}
                      {ep.sourceType === 'audio' && <Mic className="w-3.5 h-3.5" />}
                      {ep.sourceType === 'youtube' && <Youtube className="w-3.5 h-3.5" />}
                    </span>
                    <h3 className="text-sm font-semibold group-hover:text-amber-500 transition-colors">
                      {ep.title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-400">
                      {ep.status}
                    </span>
                  </div>

                  <p
                    className="text-xs line-clamp-1 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {ep.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono opacity-70">
                    <span>{ep.duration}</span>
                    <span>·</span>
                    <span>{ep.dateProcessed}</span>
                    <span>·</span>
                    <span>{ep.assets.length} assets</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-500/10">
                  {ep.sourceType === 'youtube' && ep.sourceUrl && (
                    <a
                      href={
                        ep.sourceUrl.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i)?.[1]
                          ? `https://www.youtube.com/watch?v=${ep.sourceUrl.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i)![1]}`
                          : ep.sourceUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1]
                          ? `https://www.youtube.com/watch?v=${ep.sourceUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)![1]}`
                          : ep.sourceUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 hover:bg-neutral-500/10 transition-colors text-red-500 cursor-pointer"
                      style={{ borderColor: 'var(--border-subtle)' }}
                      title="Open Original Video on YouTube in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Watch ↗</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEpisode(ep.id);
                      addToast('Project Removed', `"${ep.title}" deleted from repository`, 'info');
                    }}
                    className="p-1.5 rounded-lg border hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleExportEpisode(e, ep.id)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 hover:bg-neutral-500/10 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    title="Export assets for this project"
                  >
                    <Download className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span>Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectEpisode(ep.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 hover:bg-neutral-500/5 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Export Modal for Selected Project */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
};
