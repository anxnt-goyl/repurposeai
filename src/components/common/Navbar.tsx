import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSidebar } from '../../contexts/SidebarContext';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  title,
  subtitle,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { addToast } = useToast();
  const { isCollapsed, toggleCollapse } = useSidebar();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setUserMenuOpen(false);
    signOut();
    addToast('Signed out', 'Session closed successfully', 'info');
    navigate('/signin', { replace: true });
  };

  return (
    <header
      className="sticky top-0 z-30 h-16 border-b flex items-center justify-between px-3 sm:px-6 backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-1 rounded-lg md:hidden hover:bg-neutral-500/10 transition-colors cursor-pointer"
          aria-label="Open mobile sidebar navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg border hover:bg-neutral-500/10 transition-colors text-neutral-400 hover:text-neutral-200 cursor-pointer"
          style={{ borderColor: 'var(--border-subtle)' }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Dynamic Title / Breadcrumb */}
        <div className="min-w-0 truncate">
          {title && (
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">{title}</span>
              {subtitle && (
                <>
                  <span className="text-neutral-400 font-normal">/</span>
                  <span
                    className="text-xs font-normal truncate hidden sm:inline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {subtitle}
                  </span>
                </>
              )}
            </h1>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg border hover:bg-neutral-500/5 transition-colors cursor-pointer"
          style={{ borderColor: 'var(--border-subtle)' }}
          title={`Switch to ${theme === 'obsidian' ? 'Paper' : 'Obsidian'}`}
          aria-label="Toggle Theme"
        >
          {theme === 'obsidian' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-700" />
          )}
        </button>

        {/* User Account Popover & Direct Sign Out */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 sm:py-1 rounded-lg border hover:bg-neutral-500/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)' }}
              title="Account Menu"
              aria-label="Account Menu"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-contrast)',
                }}
              >
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-medium truncate max-w-[90px] hidden md:inline">
                {user.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60 hidden sm:inline" />
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="font-semibold truncate">{user.name}</p>
                  <p className="text-[11px] font-mono truncate text-neutral-400">{user.email}</p>
                  <span className="inline-block mt-1 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                    Pro Creator Plan
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-neutral-500/10 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 opacity-70" />
                    <span>Workspace Settings</span>
                  </button>
                </div>

                <div className="pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-neutral-500/5 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
