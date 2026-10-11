import React, { createContext, useContext, useState, useCallback } from 'react';

interface SidebarContextType {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapse: () => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  resetSidebarWidth: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const DEFAULT_SIDEBAR_WIDTH = 260;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 380;
export const COLLAPSED_SIDEBAR_WIDTH = 68;

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sidebarWidth, setSidebarWidthState] = useState<number>(() => {
    const saved = localStorage.getItem('repurposeai_sidebar_width');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= MIN_SIDEBAR_WIDTH && num <= MAX_SIDEBAR_WIDTH) {
        return num;
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    return localStorage.getItem('repurposeai_sidebar_collapsed') === 'true';
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const setSidebarWidth = useCallback((width: number) => {
    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
    setSidebarWidthState(clamped);
    localStorage.setItem('repurposeai_sidebar_width', clamped.toString());
  }, []);

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    localStorage.setItem('repurposeai_sidebar_collapsed', collapsed ? 'true' : 'false');
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem('repurposeai_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  }, []);

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidthState(DEFAULT_SIDEBAR_WIDTH);
    localStorage.setItem('repurposeai_sidebar_width', DEFAULT_SIDEBAR_WIDTH.toString());
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        sidebarWidth,
        setSidebarWidth,
        isCollapsed,
        setIsCollapsed,
        toggleCollapse,
        isDragging,
        setIsDragging,
        resetSidebarWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
