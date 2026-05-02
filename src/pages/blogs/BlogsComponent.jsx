import React from "react";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import TopButton from "../../components/topButton/TopButton";
import Blogs from "../../containers/blogs/Blogs";
import BlogMaintenancePage from "./BlogMaintenancePage";
import useBlogMaintenanceSettings from "./useBlogMaintenanceSettings";
import ErrorBoundary from "../../components/ErrorBoundary";

function BlogsComponent({ theme, onToggle }) {
  const { enabled, settings } = useBlogMaintenanceSettings();
  return (
    <div className="blogs-wrapper" style={{ 
      backgroundColor: theme.body, 
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      transition: "background-color 0.25s ease-out",
      animation: "blogsPageFadeIn 0.4s ease-out forwards"
    }}>
      <Header theme={theme} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <ErrorBoundary>
          {enabled ? (
            <BlogMaintenancePage settings={settings} theme={theme} />
          ) : (
            <Blogs theme={theme} publicSettings={settings} />
          )}
        </ErrorBoundary>
      </div>
      <Footer theme={theme} onToggle={onToggle} />
      <TopButton theme={theme} />
    </div>
  );
}

export default BlogsComponent;
