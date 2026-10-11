import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { useSidebar } from '../contexts/SidebarContext';
import {
  User,
  Moon,
  Sun,
  Sliders,
  Bell,
  Shield,
  Layers,
  Check,
  Save,
  LogOut,
  ExternalLink,
  PanelLeft,
  RotateCcw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreferences } = useProject();
  const { addToast } = useToast();
  const {
    sidebarWidth,
    setSidebarWidth,
    isCollapsed,
    toggleCollapse,
    resetSidebarWidth,
  } = useSidebar();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Synchronize form values whenever authenticated user profile updates or hydrates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);
  const [tone, setTone] = useState(preferences.tone);
  const [length, setLength] = useState(preferences.contentLength);
  const [creativity, setCreativity] = useState(preferences.creativity);

  const [notifProcessing, setNotifProcessing] = useState(
    preferences.notifications.processingComplete
  );
  const [notifGeneration, setNotifGeneration] = useState(
    preferences.notifications.contentGenerationComplete
  );
  const [notifExport, setNotifExport] = useState(
    preferences.notifications.exportComplete
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email });
    addToast('Profile Updated', 'Changes saved successfully', 'success');
  };

  const handleSaveAIPreferences = () => {
    updatePreferences({
      tone,
      contentLength: length,
      creativity,
      notifications: {
        processingComplete: notifProcessing,
        contentGenerationComplete: notifGeneration,
        exportComplete: notifExport,
      },
    });
    addToast('Preferences Saved', 'AI agent directives updated', 'success');
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <div className="pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h1 className="text-xl font-bold tracking-tight">Settings & Preferences</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Manage your account profile, workspace theme, and agent behavior directives.
        </p>
      </div>

      {/* 1. Profile Settings (Section 56) */}
      <div
        className="p-6 rounded-2xl border space-y-5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <User className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Creator Profile</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Profile</span>
          </button>
        </form>
      </div>

      {/* 2. Appearance & Dual Themes (Section 57) */}
      <div
        className="p-6 rounded-2xl border space-y-5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Sun className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Appearance & Workspace Theme</h2>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Select between our two intentionally designed themes. Your preference is persisted automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Obsidian Theme Card */}
          <div
            onClick={() => {
              setTheme('obsidian');
              addToast('Theme Switched', 'Obsidian dark workspace active', 'info');
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
              theme === 'obsidian'
                ? 'border-amber-500 shadow-md'
                : 'border-transparent bg-neutral-900 hover:border-neutral-700'
            }`}
            style={{ backgroundColor: '#121418', color: '#f2f3f5' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Obsidian</span>
              </span>
              {theme === 'obsidian' && (
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Dark premium workspace. Near-black background, charcoal surfaces, off-white text, and restrained amber accents.
            </p>
          </div>

          {/* Paper Theme Card */}
          <div
            onClick={() => {
              setTheme('paper');
              addToast('Theme Switched', 'Paper light editorial workspace active', 'info');
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
              theme === 'paper'
                ? 'border-amber-500 shadow-md'
                : 'border-transparent bg-[#f4f4f0] hover:border-neutral-300'
            }`}
            style={{ backgroundColor: '#ffffff', color: '#191a1d' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-600" />
                <span>Paper</span>
              </span>
              {theme === 'paper' && (
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              Light premium workspace. Warm off-white background, soft surfaces, high-contrast typography, and editorial sophistication.
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar Adjustability & Layout Settings */}
      <div
        className="p-6 rounded-2xl border space-y-5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <PanelLeft className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Sidebar Geometry & Adjustability</h2>
          </div>
          <button
            type="button"
            onClick={resetSidebarWidth}
            className="text-xs text-neutral-400 hover:text-amber-500 flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset to default 260px"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Width</span>
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Adjust the width of your navigation drawer. You can also drag the edge handle in the workspace directly or toggle collapsed mode.
        </p>

        <div className="space-y-4 max-w-md">
          {/* Preset buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Width Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Compact', detail: '220px', width: 220 },
                { label: 'Standard', detail: '260px', width: 260 },
                { label: 'Roomy', detail: '320px', width: 320 },
              ].map((preset) => (
                <button
                  key={preset.width}
                  type="button"
                  onClick={() => {
                    setSidebarWidth(preset.width);
                    addToast('Sidebar Adjusted', `Width set to ${preset.width}px`, 'info');
                  }}
                  className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    sidebarWidth === preset.width && !isCollapsed
                      ? 'border-neutral-900 dark:border-white font-semibold bg-neutral-500/10'
                      : 'border-transparent hover:bg-neutral-500/5'
                  }`}
                >
                  <span className="block font-medium">{preset.label}</span>
                  <span className="text-[10px] opacity-60 font-mono">({preset.detail})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                Fine-tune Width (Drag or Slider)
              </span>
              <span className="font-mono text-amber-500 font-semibold">{sidebarWidth}px</span>
            </div>
            <input
              type="range"
              min="200"
              max="380"
              value={sidebarWidth}
              onChange={(e) => setSidebarWidth(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
              <span>Min: 200px</span>
              <span>Max: 380px</span>
            </div>
          </div>

          {/* Collapse toggle */}
          <div className="pt-1 flex items-center justify-between text-xs">
            <div>
              <p className="font-medium">Collapsed Icon Bar Mode</p>
              <p className="text-[11px] text-neutral-400">
                Minimizes navigation to a 68px icon rail for maximum content canvas.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleCollapse}
              className={`px-3 py-1.5 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                isCollapsed
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-semibold'
                  : 'hover:bg-neutral-500/5'
              }`}
              style={{ borderColor: isCollapsed ? '#f59e0b' : 'var(--border-subtle)' }}
            >
              {isCollapsed ? 'Collapsed (68px)' : 'Expanded'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. AI Preferences (Section 58) */}
      <div
        className="p-6 rounded-2xl border space-y-5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Sliders className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">AI Adaptation Preferences</h2>
        </div>

        <div className="space-y-4 max-w-lg">
          {/* Tone selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Default Brand Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['professional', 'conversational', 'educational', 'storytelling'] as const).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`text-xs py-2 px-3 rounded-lg border capitalize transition-all cursor-pointer text-center ${
                      tone === t
                        ? 'border-neutral-900 dark:border-white font-semibold bg-neutral-500/10'
                        : 'border-transparent hover:bg-neutral-500/5'
                    }`}
                  >
                    {t}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Content Length */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Content Target Length
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['short', 'medium', 'long'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={`text-xs py-2 px-3 rounded-lg border capitalize transition-all cursor-pointer text-center ${
                    length === l
                      ? 'border-neutral-900 dark:border-white font-semibold bg-neutral-500/10'
                      : 'border-transparent hover:bg-neutral-500/5'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Creativity Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                Creativity & Variance Index
              </span>
              <span className="font-mono text-amber-500 font-semibold">{creativity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="95"
              value={creativity}
              onChange={(e) => setCreativity(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
              <span>Strict Verbatim (20%)</span>
              <span>Expansive Synthesis (95%)</span>
            </div>
          </div>

          <button
            onClick={handleSaveAIPreferences}
            className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Update Directives</span>
          </button>
        </div>
      </div>

      {/* 4. Notifications (Section 59) */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Bell className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>

        <div className="space-y-3 max-w-md text-xs">
          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-500/5 cursor-pointer">
            <span>Notify when audio processing is complete</span>
            <input
              type="checkbox"
              checked={notifProcessing}
              onChange={(e) => setNotifProcessing(e.target.checked)}
              className="rounded accent-amber-500"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-500/5 cursor-pointer">
            <span>Notify when platform drafts are synthesized</span>
            <input
              type="checkbox"
              checked={notifGeneration}
              onChange={(e) => setNotifGeneration(e.target.checked)}
              className="rounded accent-amber-500"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-500/5 cursor-pointer">
            <span>Notify when asset batch export finishes</span>
            <input
              type="checkbox"
              checked={notifExport}
              onChange={(e) => setNotifExport(e.target.checked)}
              className="rounded accent-amber-500"
            />
          </label>
        </div>
      </div>

      {/* 5. Integrations (Section 60 - Coming Soon) */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Layers className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Distribution Integrations</h2>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Direct channel connectors for automated delivery after review approval.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { name: 'YouTube', desc: 'Direct caption and chapter sync' },
            { name: 'LinkedIn', desc: 'Post thought leadership articles' },
            { name: 'X (Twitter)', desc: 'Publish approved threads' },
            { name: 'Substack', desc: 'Push newsletter drafts to editor' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border flex items-center justify-between bg-neutral-500/5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-[11px] text-neutral-400">{item.desc}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-400 uppercase font-semibold">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Security (Section 61) */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Shield className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Security & Session</h2>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-medium">Active Session</p>
            <p className="text-[11px] text-neutral-400">
              Authenticated as {user?.email || 'Authenticated User'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              signOut();
              addToast('Signed out', 'Session closed successfully', 'info');
              navigate('/signin', { replace: true });
            }}
            className="px-3.5 py-1.5 rounded-lg border text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-xs font-medium flex items-center gap-1.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
