import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search,
  PlusCircle,
  MessageSquare,
  LayoutDashboard,
  FolderKanban,
  Settings,
  Sun,
  Moon,
  Download,
  X,
  LogOut,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenExport,
}) => {
  const navigate = useNavigate();
  const { episodes, setCurrentEpisodeById } = useProject();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const { signOut } = useAuth();

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEpisodes = episodes.filter((ep) =>
    ep.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleAction = (action: () => void) => {
    action();
    onClose();
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Search className="w-4 h-4 opacity-50 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, navigation, or run actions..."
            className="w-full text-sm bg-transparent outline-none placeholder:text-neutral-400"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Close command palette"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-neutral-500/10 text-xs">
          {/* Quick Navigation & Actions */}
          <div className="pb-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50">
              Quick Actions
            </div>

            <button
              onClick={() =>
                handleAction(() => {
                  navigate('/new-repurpose');
                })
              }
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Repurpose</span>
              </div>
              <span className="text-[10px] opacity-40">Start project</span>
            </button>

            <button
              onClick={() =>
                handleAction(() => {
                  navigate('/chat');
                })
              }
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Assistant Chat</span>
              </div>
              <span className="text-[10px] opacity-40">With active context</span>
            </button>

            {onOpenExport && (
              <button
                onClick={() =>
                  handleAction(() => {
                    onOpenExport();
                  })
                }
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Content Assets</span>
                </div>
                <span className="text-[10px] opacity-40">Save files</span>
              </button>
            )}

            <button
              onClick={() =>
                handleAction(() => {
                  toggleTheme();
                  addToast(
                    'Theme Switched',
                    `Switched to ${theme === 'obsidian' ? 'Paper' : 'Obsidian'}`
                  );
                })
              }
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'obsidian' ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
                <span>
                  Switch to {theme === 'obsidian' ? 'Paper (Light)' : 'Obsidian (Dark)'}
                </span>
              </div>
              <span className="text-[10px] opacity-40">Appearance</span>
            </button>
          </div>

          {/* Navigation Pages */}
          <div className="py-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50">
              Navigate
            </div>
            <button
              onClick={() => handleAction(() => navigate('/dashboard'))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleAction(() => navigate('/projects'))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Projects & Workspace</span>
            </button>
            <button
              onClick={() => handleAction(() => navigate('/settings'))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings & Preferences</span>
            </button>
            <button
              onClick={() =>
                handleAction(() => {
                  signOut();
                  addToast('Signed out', 'Session closed successfully', 'info');
                  navigate('/signin', { replace: true });
                })
              }
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 text-left transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Account</span>
            </button>
          </div>

          {/* Project List */}
          {filteredEpisodes.length > 0 && (
            <div className="pt-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50">
                Episodes & Projects
              </div>
              {filteredEpisodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() =>
                    handleAction(() => {
                      setCurrentEpisodeById(ep.id);
                      navigate(`/workspace/${ep.id}`);
                    })
                  }
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-500/10 text-left transition-colors cursor-pointer"
                >
                  <span className="font-medium truncate pr-2">{ep.title}</span>
                  <span className="font-mono text-[10px] opacity-50 shrink-0">
                    {ep.duration}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
