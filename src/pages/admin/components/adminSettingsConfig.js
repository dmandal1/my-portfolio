export const SETTINGS_KEY = "adminPanelSettings";

export const DEFAULT_SETTINGS = {
  /* General */
  siteName:            "Deepak Mandal",
  siteTagline:         "Full Stack Developer",
  defaultAuthor:       "Deepak Mandal",
  timezone:            "Asia/Kolkata",
  /* Appearance */
  theme:               "light",
  sidebarCollapsed:    false,
  /* Dashboard */
  dashboardDefaultFilter: "all",
  dashboardRecentPostsCount: 6,
  dashboardRecentCommentsCount: 10,
  dashboardShowRecentComments: true,
  dashboardShowAuthorColumn: true,
  dashboardShowCommentsColumn: true,
  dashboardShowViewsColumn: true,
  dashboardShowDateColumn: true,
  /* Content */
  postsPerPage:        12,
  defaultDifficulty:   "intermediate",
  defaultComments:     true,
  defaultFeatured:     false,
  requireCoverBeforePublish: false,
  requireCategoryBeforePublish: false,
  requireTagsBeforePublish: false,
  /* Editor */
  autosave:            true,
  autosaveIntervalSec: 5,
  editorReadiness:     true,
  requireSeoBeforePublish: false,
  showWordCount:       true,
  spellcheck:          true,
  enableTechnicalBlocks: true,
  enableEmojiPicker:   true,
  readingSpeedWpm:     200,
  /* Media */
  maxUploadSizeMb:     5,
  /* SEO */
  defaultCanonicalHost: "",
  defaultMetaDesc:     "",
  ogImageDefault:      "",
  twitterHandle:       "",
  /* Notifications */
  notifyComments:      true,
  notifyPendingReview: true,
  notifyBrowser:       false,
  /* Portfolio Maintenance */
  portfolioMaintenanceMode: false,
  portfolioMaintenanceTitle: "Portfolio is under maintenance",
  portfolioMaintenanceMessage: "I'm making some updates to my portfolio. Please check back shortly.",
  portfolioMaintenanceEndsAt: "",
  portfolioMaintenanceContactUrl: "",
  portfolioMaintenanceWhatsComing: "Refreshed project showcase\nPerformance & accessibility improvements\nNew blog integration\nRedesigned contact section",
  portfolioMaintenanceShowSocials: true,
  portfolioMaintenanceShowResume: true,
  /* Public Blog Maintenance */
  blogMaintenanceMode: false,
  blogMaintenanceTitle: "Blogs are under maintenance",
  blogMaintenanceMessage: "I am improving the blog experience and polishing a few posts. Please check back shortly.",
  blogMaintenanceEta: "",
  blogMaintenanceEndsAt: "",
  blogMaintenanceContactUrl: "/#/contact",
  blogMaintenanceShowHomeLink: true,
  /* Public Blog Display */
  publicBlogFeaturedCount: 4,
  publicBlogColumnsPerRow: 3,
  publicBlogRowsPerPage: 2,
  publicBlogPostsPerPage: 6,
  publicBlogRecentPostsCount: 9,
  publicBlogPostRecentCount: 6,
  publicBlogCategoryCount: 6,
  publicBlogShowFeatured: true,
  publicBlogInfiniteScroll: false,
  publicBlogShowStatsWidget: true,
  publicBlogCommentsEnabled: true,
  publicBlogShowSearchWidget: true,
  publicBlogShowCategoryWidget: true,
  publicBlogShowRecentWidget: true,
  publicBlogShowArticleTools: true,
};

export const TIMEZONES = [
  "Asia/Kolkata", "UTC", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "Europe/London",
  "Europe/Berlin", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore",
  "Australia/Sydney",
];

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function normalizeAdminSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  const publicBlogColumnsPerRow = clampNumber(merged.publicBlogColumnsPerRow, DEFAULT_SETTINGS.publicBlogColumnsPerRow, 2, 4);
  const publicBlogRowsPerPage = clampNumber(merged.publicBlogRowsPerPage, DEFAULT_SETTINGS.publicBlogRowsPerPage, 1, 6);
  return {
    ...merged,
    postsPerPage:        clampNumber(merged.postsPerPage, DEFAULT_SETTINGS.postsPerPage, 6, 48),
    dashboardRecentPostsCount: clampNumber(merged.dashboardRecentPostsCount, DEFAULT_SETTINGS.dashboardRecentPostsCount, 3, 12),
    dashboardRecentCommentsCount: clampNumber(merged.dashboardRecentCommentsCount, DEFAULT_SETTINGS.dashboardRecentCommentsCount, 3, 20),
    autosaveIntervalSec: clampNumber(merged.autosaveIntervalSec, DEFAULT_SETTINGS.autosaveIntervalSec, 3, 60),
    readingSpeedWpm:     clampNumber(merged.readingSpeedWpm, DEFAULT_SETTINGS.readingSpeedWpm, 120, 320),
    maxUploadSizeMb:     clampNumber(merged.maxUploadSizeMb, DEFAULT_SETTINGS.maxUploadSizeMb, 1, 25),
    publicBlogFeaturedCount: clampNumber(merged.publicBlogFeaturedCount, DEFAULT_SETTINGS.publicBlogFeaturedCount, 1, 8),
    publicBlogColumnsPerRow,
    publicBlogRowsPerPage,
    publicBlogPostsPerPage: clampNumber(merged.publicBlogPostsPerPage, DEFAULT_SETTINGS.publicBlogPostsPerPage, 1, 24),
    publicBlogRecentPostsCount: clampNumber(merged.publicBlogRecentPostsCount, DEFAULT_SETTINGS.publicBlogRecentPostsCount, 3, 15),
    publicBlogPostRecentCount: clampNumber(merged.publicBlogPostRecentCount, DEFAULT_SETTINGS.publicBlogPostRecentCount, 2, 10),
    publicBlogCategoryCount: clampNumber(merged.publicBlogCategoryCount, DEFAULT_SETTINGS.publicBlogCategoryCount, 3, 12),
  };
}

export function loadAdminSettings() {
  try {
    return normalizeAdminSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function applyAdminTheme(theme) {
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved =
    theme === "system"
      ? prefersDark ? "dark" : "light"
      : theme;
  document.documentElement.setAttribute("data-admin-theme", resolved);
  localStorage.setItem("adminDarkMode", String(resolved === "dark"));
}
