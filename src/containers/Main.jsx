import React, { Component } from "react";
import { Route, Routes, HashRouter, Outlet } from "react-router-dom";
import Home from "../pages/home/HomeComponent";
import Splash from "../pages/splash/Splash";
import usePortfolioMaintenanceSettings from "../pages/portfolio/usePortfolioMaintenanceSettings";
import PortfolioMaintenancePage from "../pages/portfolio/PortfolioMaintenancePage";
import Education from "../pages/education/EducationComponent";
import Experience from "../pages/experience/Experience";
import Opensource from "../pages/opensource/Opensource";
import Contact from "../pages/contact/ContactComponent";
import Projects from "../pages/projects/Projects";
import Blogs from "../pages/blogs/BlogsComponent";
import BlogPost from "../pages/blogs/BlogPost";
import AdminLogin from "../pages/admin/AdminLogin";
import AdminHome from "../pages/admin/AdminHome";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminPostEditor from "../pages/admin/AdminPostEditor";
import AdminMedia from "../pages/admin/AdminMedia";
import AdminComments from "../pages/admin/AdminComments";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminTags from "../pages/admin/AdminTags";
import AdminSettings from "../pages/admin/AdminSettings";
import AdminAnalytics from "../pages/admin/AdminAnalytics";
import AdminPortfolio from "../pages/admin/AdminPortfolio";
import AdminDatabase from "../pages/admin/AdminDatabase";
import AdminInbox from "../pages/admin/AdminInbox";
import AdminNewsletter from "../pages/admin/AdminNewsletter";
import AdminAudit from "../pages/admin/AdminAudit";
import AdminSystem from "../pages/admin/AdminSystem";
import Install from "../pages/install/Install";
import { PortfolioDataProvider } from "../contexts/PortfolioDataContext";
import AdminContentAudit from "../pages/admin/AdminContentAudit";
import AdminEditorialPlanner from "../pages/admin/AdminEditorialPlanner";
import AdminSEO from "../pages/admin/AdminSEO";
import AdminRedirects from "../pages/admin/AdminRedirects";
import AdminRevisions from "../pages/admin/AdminRevisions";
import AdminProfile from "../pages/admin/AdminProfile";
import AdminModerationQueue from "../pages/admin/AdminModerationQueue";
import AdminImportExport from "../pages/admin/AdminImportExport";
import AdminResetPassword from "../pages/admin/AdminResetPassword";
import ProtectedRoute from "../components/protectedRoute/ProtectedRoute";
import { AuthProvider } from "../contexts/AuthContext";
import { ToastProvider } from "../pages/admin/components/AdminToast";
import { AdminSettingsProvider } from "../pages/admin/components/AdminSettingsContext";
import { settings } from "../portfolio.js";
import Error404 from "../pages/errors/error404/Error";
import ErrorBoundary from "../components/ErrorBoundary";
import AdminTransition from "../pages/admin/components/AdminTransition";

function PortfolioGuard({ children }) {
  const { enabled, settings } = usePortfolioMaintenanceSettings();

  // Allow Admin and Install routes to bypass maintenance mode so the user isn't locked out.
  const isAdminPath = window.location.hash.startsWith("#/admin");
  const isInstallPath = window.location.hash.startsWith("#/install");

  if (enabled && !isAdminPath && !isInstallPath) {
    return <PortfolioMaintenancePage settings={settings} />;
  }
  return children;
}

function Guarded({ children }) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: 24, textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px" }}>Something went wrong.</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>Please refresh the page and try again.</p>
        </div>
      }
    >
      <PortfolioGuard>{children}</PortfolioGuard>
    </ErrorBoundary>
  );
}

const commonRoutes = (theme, onToggle) => (
  <>
    <Route path="/home" element={<Home theme={theme} />} />
    <Route path="/experience" element={<Experience theme={theme} />} />
    <Route path="/education" element={<Education theme={theme} />} />
    <Route path="/opensource" element={<Opensource theme={theme} />} />
    <Route path="/contact" element={<Contact theme={theme} />} />
    <Route path="/projects" element={<Projects theme={theme} />} />
    <Route path="/blogs" element={<Blogs theme={theme} onToggle={onToggle} />} />
    <Route
      path="/blogs/:slug"
      element={
        <ErrorBoundary>
          <BlogPost theme={theme} />
        </ErrorBoundary>
      }
    />

    {/* Admin routes */}
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin/reset-password" element={<AdminResetPassword />} />
    <Route
      path="/admin/home"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminHome />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/dashboard"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminDashboard />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/post/new"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminPostEditor key="new" />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/post/:id/edit"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminPostEditor />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/media"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminMedia />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/comments"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminComments />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/categories"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminCategories />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/tags"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminTags />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/analytics"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminAnalytics />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/content-audit"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminContentAudit />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/editorial-planner"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminEditorialPlanner />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/audit"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminAudit />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/system"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminSystem />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/database"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminDatabase />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/inbox"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminInbox />
          </ToastProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/subscribers"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminNewsletter />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/settings"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminSettings />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/portfolio"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminPortfolio />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/seo"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminSEO />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/redirects"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminRedirects />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/post/:id/revisions"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminRevisions />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/profile"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminProfile />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/moderation"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminModerationQueue />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin/import-export"
      element={
        <ProtectedRoute>
          <ToastProvider>
            <AdminImportExport />
          </ToastProvider>
        </ProtectedRoute>
      }
    />

    <Route path="/install" element={<Install />} />
    <Route path="*" element={<Error404 theme={theme} />} />
  </>
);

const MainContent = ({ theme, onToggle }) => (
  <HashRouter>
    <AdminTransition>
      <Routes>
        <Route
          element={
            <Guarded>
              <Outlet />
            </Guarded>
          }
        >
          {settings.isSplash ? (
            <>
              <Route path="/" element={<Splash theme={theme} />} />
              <Route path="/splash" element={<Splash theme={theme} />} />
            </>
          ) : (
            <Route path="/" element={<Home theme={theme} />} />
          )}
          {commonRoutes(theme, onToggle)}
        </Route>
      </Routes>
    </AdminTransition>
  </HashRouter>
);

export default class Main extends Component {
  render() {
    const { theme, onToggle } = this.props;
    return (
      <AuthProvider>
        <PortfolioDataProvider>
          <AdminSettingsProvider>
            <MainContent theme={theme} onToggle={onToggle} />
          </AdminSettingsProvider>
        </PortfolioDataProvider>
      </AuthProvider>
    );
  }
}
