import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Upload,
  Brain,
  Layers,
  Share2,
  CheckCircle,
  Check,
  FileText,
  Clock,
  Flame,
  Shield,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { demoEpisode } from '../data/demoEpisodeData';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const { addToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    addToast('Signed out', 'Session closed successfully', 'info');
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="min-h-screen font-sans selection:bg-amber-500/20"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Bar Navigation */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-canvas)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand - Always shrink-0 and never wraps/collapses */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider shadow-2xs shrink-0"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              R
            </div>
            <span className="font-bold text-sm tracking-tight whitespace-nowrap">
              RepurposeAI
            </span>
          </div>

          {/* Desktop Nav links - Only visible on wide desktop >= 1024px to prevent any overlapping */}
          <nav
            className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-medium shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            <a href="#workflow" className="hover:text-amber-500 transition-colors whitespace-nowrap">
              How It Works
            </a>
            <a href="#one-to-many" className="hover:text-amber-500 transition-colors whitespace-nowrap">
              One-to-Many
            </a>
            <a href="#adaptation" className="hover:text-amber-500 transition-colors whitespace-nowrap">
              Platform Dialects
            </a>
            <a href="#human-control" className="hover:text-amber-500 transition-colors whitespace-nowrap">
              Editorial Control
            </a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border hover:bg-neutral-500/10 transition-colors cursor-pointer shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
              title="Toggle theme"
            >
              {theme === 'obsidian' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-neutral-700" />
              )}
            </button>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  <span className="hidden sm:inline">Go to Workspace</span>
                  <span className="sm:hidden">Workspace</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg border hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/signin')}
                  className="text-xs font-medium px-2.5 sm:px-3 py-1.5 hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Sign In
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-xs font-semibold px-3 sm:px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  <span className="hidden sm:inline">Start Repurposing</span>
                  <span className="sm:hidden">Start</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </>
            )}

            {/* Mobile / Tablet Menu Button (< lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-1.5 rounded-lg border hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Sheet */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden border-t px-4 py-4 space-y-3 shadow-lg animate-in fade-in duration-150"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <nav className="flex flex-col space-y-2 text-xs font-medium">
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-neutral-500/10 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#one-to-many"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-neutral-500/10 transition-colors"
              >
                One-to-Many Architecture
              </a>
              <a
                href="#adaptation"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-neutral-500/10 transition-colors"
              >
                Platform Dialects & Formats
              </a>
              <a
                href="#human-control"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-md hover:bg-neutral-500/10 transition-colors"
              >
                Editorial Control & Review
              </a>
            </nav>

            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between w-full">
                  <div className="text-xs">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs text-red-500 font-medium px-2.5 py-1 rounded-md border hover:bg-red-500/10 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/signin');
                    }}
                    className="flex-1 py-2 text-xs font-medium rounded-lg border text-center hover:bg-neutral-500/5 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/signup');
                    }}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg text-center cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-contrast)',
                    }}
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section (Sections 16 & 17) */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>AI-Powered Show-Notes & Multi-Platform Repurposing Agent</span>
          </div>

          <h1
            className="text-4xl sm:text-6xl font-serif tracking-tight leading-[1.1] max-w-3xl mx-auto"
            style={{ color: 'var(--text-primary)' }}
          >
            Create once.
            <br />
            Repurpose everywhere.
          </h1>

          <p
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal"
            style={{ color: 'var(--text-secondary)' }}
          >
            Turn one long-form conversation into show notes, social posts, articles, and newsletters — while keeping your voice and editorial control.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>Start Repurposing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <a
              href="#workflow"
              className="w-full sm:w-auto px-5 py-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 hover:bg-neutral-500/5 transition-colors"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Hero Visual: Real RepurposeAI Product Interface (Section 17) */}
        <div className="max-w-5xl mx-auto mt-16 rounded-2xl border shadow-2xl overflow-hidden transition-all" style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-surface)' }}>
          {/* Product Workspace Window Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              </div>
              <span className="text-[11px] font-mono text-neutral-400 ml-1 sm:ml-2 truncate">
                RepurposeAI Content Workspace
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono shrink-0" style={{ color: 'var(--text-secondary)' }}>
              <span className="hidden sm:inline">"The Future of AI Agents" ·</span>
              <span className="text-emerald-500 font-semibold">14 / 18 Approved</span>
            </div>
          </div>

          {/* Product Interface Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
            {/* Left: Source Episode + Transcript */}
            <div className="md:col-span-5 space-y-4">
              <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
                <span className="text-[10px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
                  Source Episode
                </span>
                <h4 className="text-sm font-semibold">"The Future of AI Agents"</h4>
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                  <span>48:32 runtime</span>
                  <span>·</span>
                  <span>142 MB</span>
                  <span>·</span>
                  <span>2 Speakers</span>
                </div>
              </div>

              {/* Moment Highlight */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-amber-500 uppercase">
                    Extracted Moment #01
                  </span>
                  <span className="font-mono text-xs text-amber-500 font-bold">
                    Score: 94
                  </span>
                </div>
                <p className="text-xs italic font-medium leading-relaxed">
                  "The biggest mistake creators make is producing more content instead of extracting more value from what they already have."
                </p>
                <div className="text-[10px] font-mono text-neutral-400 flex items-center justify-between pt-1">
                  <span>Timestamp: 02:41</span>
                  <span className="text-amber-500 font-sans">Adapted for 3 channels</span>
                </div>
              </div>
            </div>

            {/* Right: Platform Assets Showcase */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-semibold text-neutral-400 text-[11px] uppercase tracking-wider">
                  Platform-Adapted Generation
                </span>
                <span className="text-emerald-500 font-medium text-[11px]">
                  Drafts Ready for Review
                </span>
              </div>

              {/* LinkedIn Post Mini Card */}
              <div className="p-3.5 rounded-lg border text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-neutral-500">
                    LinkedIn · Thought Leadership
                  </span>
                  <span className="text-[10px] text-emerald-500 font-medium">Approved</span>
                </div>
                <p className="text-xs font-semibold">The Content Multiplication Fallacy</p>
                <p className="text-[11px] leading-relaxed line-clamp-2 opacity-75">
                  The biggest mistake creators make isn't publishing too rarely. It's producing more content instead of extracting more value from what they already have...
                </p>
              </div>

              {/* X Thread Mini Card */}
              <div className="p-3.5 rounded-lg border text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-neutral-500">
                    X (Twitter) · 5-Part Thread
                  </span>
                  <span className="text-[10px] text-emerald-500 font-medium">Approved</span>
                </div>
                <p className="text-xs font-semibold">1/ Most creators think they need more content...</p>
                <p className="text-[11px] leading-relaxed line-clamp-1 opacity-75">
                  They don't. They need to extract 5x more value from what they've already created. Here is the breakdown:
                </p>
              </div>

              {/* Newsletter Mini Card */}
              <div className="p-3.5 rounded-lg border text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-neutral-500">
                    Newsletter · Issue #42
                  </span>
                  <span className="text-[10px] text-amber-500 font-medium">Needs Review</span>
                </div>
                <p className="text-xs font-semibold">Subject: Why more content is the wrong goal</p>
                <p className="text-[11px] leading-relaxed line-clamp-1 opacity-75">
                  How Elena Vance and I turned a 48-minute conversation into 18 platform assets without burnout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Workflow (Section 19) */}
      <section id="workflow" className="py-20 px-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
              Autonomous Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif">
              From raw audio to distributed audience
            </h2>
            <p className="text-xs sm:text-sm max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              A deterministic 6-stage repurposing pipeline engineered for voice preservation and speed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-left">
            {[
              {
                step: '01',
                title: 'Upload',
                desc: 'Drop your video, audio file, or paste a YouTube link.',
              },
              {
                step: '02',
                title: 'Understand',
                desc: 'Diarization, entity extraction, and thematic structure.',
              },
              {
                step: '03',
                title: 'Find Moments',
                desc: 'Identify 12 high-conviction hooks, quotes, and controversies.',
              },
              {
                step: '04',
                title: 'Repurpose',
                desc: 'Generate platform-specific drafts tailored to channel habits.',
              },
              {
                step: '05',
                title: 'Review',
                desc: 'Refine, tweak tone, and approve or reject every asset.',
              },
              {
                step: '06',
                title: 'Export',
                desc: 'Instant Markdown, JSON, or plain text ready to publish.',
              },
            ].map((st) => (
              <div
                key={st.step}
                className="p-4 rounded-xl border flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="font-mono text-xs text-amber-500 font-semibold mb-2">
                  {st.step}
                </span>
                <div>
                  <h4 className="text-xs font-semibold mb-1">{st.title}</h4>
                  <p className="text-[11px] leading-relaxed opacity-70">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One-to-Many Section (Section 20) */}
      <section id="one-to-many" className="py-20 px-6 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-4 text-left">
            <span className="text-[11px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
              One-To-Many Multiplier
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif leading-tight">
              One 45-minute episode becomes 18 high-signal assets.
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Stop leaving 90% of your conversation in the audio file. RepurposeAI extracts every viable idea and packages it natively across all distribution surfaces.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-contrast)',
                }}
              >
                <span>Launch Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { count: '12', label: 'Curated Moments', sub: 'Scored by impact' },
              { count: '5', label: 'LinkedIn Posts', sub: 'Thought leadership' },
              { count: '3', label: 'X Threads', sub: 'Hook-first pacing' },
              { count: '3', label: 'Instagram Posts', sub: 'Carousel slides' },
              { count: '1', label: 'Deep Blog Post', sub: 'Long-form essay' },
              { count: '1', label: 'Newsletter Issue', sub: 'Subscriber letter' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border text-center space-y-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="text-2xl font-bold font-mono tracking-tight text-amber-500 block">
                  {stat.count}
                </span>
                <span className="text-xs font-semibold block">{stat.label}</span>
                <span className="text-[10px] text-neutral-400 block">{stat.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Adaptation (Section 21) */}
      <section id="adaptation" className="py-20 px-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto space-y-10 text-left">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
              Platform-Aware Adaptation
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif">
              Same core insight. Three distinct native dialects.
            </h2>
            <div className="p-3 rounded-lg border font-mono text-xs italic bg-neutral-500/5 max-w-2xl" style={{ borderColor: 'var(--border-subtle)' }}>
              Source: "Creators don't need more content. They need more value from the content they already create."
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* LinkedIn */}
            <div className="p-5 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-mono text-xs font-bold text-neutral-400 uppercase">
                  LinkedIn
                </span>
                <span className="text-[11px] text-neutral-400">Thought Leadership</span>
              </div>
              <p className="text-xs leading-relaxed opacity-85">
                The biggest mistake creators make isn't publishing too rarely.
                <br /><br />
                It's producing more content instead of extracting more value from what they already have.
                <br /><br />
                Linear hustle burns you out. Multiplicative systems compound your reach.
              </p>
            </div>

            {/* X Thread */}
            <div className="p-5 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-mono text-xs font-bold text-neutral-400 uppercase">
                  X (Twitter)
                </span>
                <span className="text-[11px] text-neutral-400">Punchy Thread</span>
              </div>
              <p className="text-xs leading-relaxed opacity-85">
                1/ Most creators think they need more content.
                <br /><br />
                They don't.
                <br /><br />
                2/ They need to extract 5x more value from what they've already created.
                <br /><br />
                Here is why the math of standard podcasting is broken:
              </p>
            </div>

            {/* Instagram */}
            <div className="p-5 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-mono text-xs font-bold text-neutral-400 uppercase">
                  Instagram
                </span>
                <span className="text-[11px] text-neutral-400">Hook & Carousel</span>
              </div>
              <p className="text-xs leading-relaxed opacity-85">
                HOOK (SLIDE 1):
                "The biggest mistake creators make isn't posting too little. It's abandoning what they already made."
                <br /><br />
                CAPTION:
                Stop starting from scratch every Monday. Work as an editor-in-chief.
                <br /><br />
                #CreatorEconomy #WorkflowDesign
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Human-in-the-Loop (Section 22) */}
      <section id="human-control" className="py-20 px-6 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-subtle)' }}>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
              Human Sovereignty
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif">
              AI creates the first draft.
              <br />
              You decide what gets published.
            </h2>
            <p className="text-xs sm:text-sm max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              No automatic publishing. No degraded voice. You inspect, adapt tone with one click, approve, or reject in seconds.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-center">
            <div className="p-3.5 rounded-lg border bg-neutral-500/5 font-mono text-xs font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
              1. Generated
            </div>
            <div className="p-3.5 rounded-lg border bg-neutral-500/5 font-mono text-xs font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
              2. Edit
            </div>
            <div className="p-3.5 rounded-lg border bg-neutral-500/5 font-mono text-xs font-semibold text-emerald-500" style={{ borderColor: 'var(--border-subtle)' }}>
              3. Approve
            </div>
            <div className="p-3.5 rounded-lg border bg-neutral-500/5 font-mono text-xs font-semibold text-amber-500" style={{ borderColor: 'var(--border-subtle)' }}>
              4. Export
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-serif">
            Ready to reclaim 5 hours on your next episode?
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            Start multiplying your audio and video recordings into native social posts, articles, and newsletters.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 mx-auto shadow-md hover:opacity-90 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>Launch Content Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer (Section 81 Team requirement) */}
      <footer className="py-8 px-6 border-t text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-600 dark:text-neutral-300">RepurposeAI</span>
            <span>·</span>
            <span>Created by Anant Goyal, Dhriti Tandon, Nitin Kumar, Pari Agrawal, Prashant Kumar</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/signin')} className="hover:underline">Sign In</button>
            <button onClick={() => navigate('/dashboard')} className="hover:underline">Dashboard</button>
            <button onClick={() => navigate('/settings')} className="hover:underline">Settings</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
