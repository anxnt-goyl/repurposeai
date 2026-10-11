import React, { useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Settings,
  Plus,
  Sun,
  Moon,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  GripVertical,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  useSidebar,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  COLLAPSED_SIDEBAR_WIDTH,
} from '../../contexts/SidebarContext';

interface SidebarProps {
  onOpenCommandPalette: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenCommandPalette,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { addToast } = useToast();
  const {
    sidebarWidth,
    setSidebarWidth,
    isCollapsed,
    toggleCollapse,
    isDragging,
    setIsDragging,
  } = useSidebar();

  const isResizingRef = useRef(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Assistant Chat', path: '/chat', icon: MessageSquare },
  ];

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  const handleThemeToggle = () => {
    toggleTheme();
    addToast(
      'Theme Updated',
      `Switched to ${theme === 'obsidian' ? 'Paper (Light)' : 'Obsidian (Dark)'}`,
      'info'
    );
  };

  const handleSignOut = useCallback(() => {
    signOut();
    addToast('Signed out', 'Session closed successfully', 'info');
    if (onCloseMobile) onCloseMobile();
    navigate('/signin', { replace: true });
  }, [signOut, addToast, onCloseMobile, navigate]);

  // Mouse & Touch Drag-to-resize handlers
  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isResizingRef.current) return;
      setSidebarWidth(clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };

    const stopResizing = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', stopResizing);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [setSidebarWidth, setIsDragging]);

  const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isCollapsed) return;
    isResizingRef.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const currentWidth = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;

  return (
    <>
      {/* Mobile backdrop with z-40 */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:z-30 border-r flex flex-col ${
          isDragging ? '' : 'transition-[width] duration-150 ease-out'
        } md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          width: isOpenMobile ? '280px' : `${currentWidth}px`,
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Brand Header */}
        <div
          className="h-16 px-3.5 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => {
              navigate('/dashboard');
              handleNavClick();
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
            title="RepurposeAI Dashboard"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider shrink-0 transition-transform group-hover:scale-105 shadow-2xs"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              R
            </div>
            {!isCollapsed && (
              <div className="min-w-0 truncate">
                <span className="font-bold text-sm tracking-tight block truncate">
                  REPURPOSEAI
                </span>
                <span
                  className="text-[10px] tracking-wide block uppercase font-mono"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Autonomous Agent
                </span>
              </div>
            )}
          </button>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button (X) */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex md:hidden p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            title="Close menu"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              navigate('/new-repurpose');
              handleNavClick();
            }}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-95 ${
              isCollapsed ? 'px-2' : 'px-3'
            }`}
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
            title="New Repurpose"
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            {!isCollapsed && <span className="truncate">New Repurpose</span>}
          </button>

          {/* Search Trigger */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="w-full mt-2 py-1.5 px-3 rounded-lg text-xs flex items-center justify-between border transition-colors cursor-pointer hover:bg-neutral-500/5"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="text-[11px] truncate">Search / Jump</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-500/20 opacity-60 shrink-0">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div
              className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Navigation
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/projects' && location.pathname.startsWith('/workspace'));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'font-semibold' : 'hover:bg-neutral-500/10'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                style={{
                  backgroundColor: isActive
                    ? 'var(--bg-surface-hover)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: isActive
                      ? 'var(--accent-highlight)'
                      : 'var(--text-tertiary)',
                  }}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Section (Settings, Theme, User Profile & Sign Out) */}
        <div
          className="p-2.5 border-t space-y-1 shrink-0 pb-6 md:pb-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {/* Settings Nav */}
          <NavLink
            to="/settings"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              location.pathname === '/settings'
                ? 'font-semibold'
                : 'hover:bg-neutral-500/10'
            } ${isCollapsed ? 'justify-center px-2' : ''}`}
            style={{
              backgroundColor:
                location.pathname === '/settings'
                  ? 'var(--bg-surface-hover)'
                  : 'transparent',
              color:
                location.pathname === '/settings'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
            }}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="w-4 h-4 shrink-0 text-neutral-400" />
            {!isCollapsed && <span className="truncate">Settings</span>}
          </NavLink>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={handleThemeToggle}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium hover:bg-neutral-500/10 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
            style={{ color: 'var(--text-secondary)' }}
            title={isCollapsed ? `Switch to ${theme === 'obsidian' ? 'Paper' : 'Obsidian'}` : undefined}
          >
            <div className="flex items-center gap-3">
              {theme === 'obsidian' ? (
                <Moon className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Sun className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              {!isCollapsed && <span>Theme</span>}
            </div>
            {!isCollapsed && (
              <span
                className="text-[11px] font-mono capitalize"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {theme}
              </span>
            )}
          </button>

          {/* User profile and Explicit Sign Out */}
          {user ? (
            <div
              className={`mt-2 pt-2 border-t flex items-center justify-between gap-2 px-1 ${
                isCollapsed ? 'flex-col justify-center gap-2' : ''
              }`}
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  navigate('/settings');
                  handleNavClick();
                }}
                title={`Profile: ${user.name} (${user.email})`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {user.name.charAt(0)}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-tight">
                      {user.name}
                    </p>
                    <p
                      className="text-[10px] truncate leading-tight font-mono text-neutral-400"
                    >
                      {user.email}
                    </p>
                  </div>
                )}
              </div>

              {/* Dedicated Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                className={`p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isCollapsed ? 'w-full justify-center' : ''
                }`}
                title="Sign Out of RepurposeAI"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                {!isCollapsed && <span className="text-xs font-medium text-red-500 hidden xl:inline">Sign Out</span>}
              </button>
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t px-1" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => {
                  navigate('/signin');
                  handleNavClick();
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium border text-center hover:bg-neutral-500/5 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Ergonomic Desktop Drag-to-Resize Handle */}
        {!isCollapsed && (
          <div
            onMouseDown={startResizing}
            onTouchStart={startResizing}
            onDoubleClick={() => toggleCollapse()}
            className="hidden md:flex absolute top-0 -right-2 bottom-0 w-4 cursor-col-resize z-50 items-center justify-center group"
            title="Drag to resize sidebar width · Double-click to collapse"
          >
            <div
              className={`w-1 h-12 rounded-full transition-all ${
                isDragging
                  ? 'bg-amber-500 w-1.5 opacity-100 shadow-sm'
                  : 'bg-neutral-500/20 group-hover:bg-amber-500/70 group-hover:w-1'
              }`}
            />
          </div>
        )}
      </aside>
    </>
  );
};
