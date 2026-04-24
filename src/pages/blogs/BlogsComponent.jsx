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
    <div>
      <Header theme={theme} />
      <ErrorBoundary>
        {enabled ? (
          <BlogMaintenancePage settings={settings} theme={theme} />
        ) : (
          <Blogs theme={theme} publicSettings={settings} />
        )}
      </ErrorBoundary>
      <Footer theme={theme} onToggle={onToggle} />
      <TopButton theme={theme} />
    </div>
  );
}

export default BlogsComponent;
