import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ToastProvider } from './contexts/ToastContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';

// Components
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastContainer } from './components/common/ToastContainer';
import { ExportModal } from './components/common/ExportModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { NewRepurposePage } from './pages/NewRepurposePage';
import { ProcessingPage } from './pages/ProcessingPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';

// Authenticated Layout Wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const { sidebarWidth, isCollapsed, isDragging } = useSidebar();

  const currentSidebarWidth = isCollapsed ? 68 : sidebarWidth;

  // Determine current page title
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return { title: 'Dashboard', sub: 'Command Center' };
    if (path.startsWith('/projects')) return { title: 'Projects', sub: 'All Episodes' };
    if (path.startsWith('/workspace')) return { title: 'Workspace', sub: 'Content Adaptation' };
    if (path.startsWith('/new-repurpose')) return { title: 'New Repurpose', sub: 'Audio & Video Ingestion' };
    if (path.startsWith('/processing')) return { title: 'Pipeline', sub: 'Autonomous Processing' };
    if (path.startsWith('/chat')) return { title: 'Assistant Chat', sub: 'Contextual Engine' };
    if (path.startsWith('/settings')) return { title: 'Settings', sub: 'Preferences & Theme' };
    return { title: 'RepurposeAI', sub: 'Workspace' };
  };

  const headerInfo = getHeaderTitle();

  return (
    <div
      className="min-h-screen flex transition-colors font-sans"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main View Area with Dynamic Responsive Padding */}
      <div
        className={`flex-1 flex flex-col min-w-0 md:[padding-left:var(--sidebar-w)] ${
          isDragging ? 'transition-none' : 'transition-[padding-left] duration-150 ease-out'
        }`}
        style={{
          ['--sidebar-w' as any]: `${currentSidebarWidth}px`,
        }}
      >
        <Navbar
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          title={headerInfo.title}
          subtitle={headerInfo.sub}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenExport={
          location.pathname.startsWith('/projects') ||
          location.pathname.startsWith('/workspace')
            ? () => setExportModalOpen(true)
            : undefined
        }
      />

      {/* Global Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
};

// Route protection component: redirect unauthenticated users to /signin
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
};

// Public only route: redirect already authenticated users to /dashboard
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <SidebarProvider>
              <Router>
                {/* Global Floating Toasts */}
                <ToastContainer />

                <Routes>
                  {/* Public Landing */}
                  <Route path="/" element={<LandingPage />} />

                  {/* Public Auth Routes */}
                  <Route
                    path="/signin"
                    element={
                      <PublicOnlyRoute>
                        <SignInPage />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/signup"
                    element={
                      <PublicOnlyRoute>
                        <SignUpPage />
                      </PublicOnlyRoute>
                    }
                  />

                  {/* Protected Authenticated Workspace Shell */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects"
                    element={
                      <ProtectedRoute>
                        <ProjectsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/workspace/:id"
                    element={
                      <ProtectedRoute>
                        <WorkspacePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/new-repurpose"
                    element={
                      <ProtectedRoute>
                        <NewRepurposePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/processing"
                    element={
                      <ProtectedRoute>
                        <ProcessingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Router>
            </SidebarProvider>
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
