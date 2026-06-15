import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./Blog.css";
import BlogCard from "../../components/blogCard/BlogCard";
import { blogSection, greeting as defaultGreeting } from "../../portfolio";
import { getAllPublishedBlogs, getCategoryList } from "../../api/apiService";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

function SkeletonCard() {
  return (
    <div className="bc-card bc-skeleton">
      <div className="bc-sk-img" />
      <div className="bc-body" style={{ gap: 12 }}>
        <div className="bc-sk-line" style={{ width: "80%", height: 20 }} />
        <div className="bc-sk-line" style={{ width: "55%", height: 13 }} />
        <div className="bc-sk-line" style={{ width: "92%", height: 14 }} />
        <div className="bc-sk-line" style={{ width: "88%", height: 14 }} />
        <div className="bc-sk-footer">
          <div className="bc-sk-line" style={{ width: 130, height: 12 }} />
          <div className="bc-sk-line" style={{ width: 90, height: 32, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

function normalizeStaticBlog(blog, index, authorName) {
  return {
    id: blog.url || `static-blog-${index}`,
    title: blog.title,
    subtitle: blog.description,
    description: blog.description,
    image: blog.image,
    externalUrl: blog.url,
    author: authorName || defaultGreeting.logo_name || "Author",
    tags: blog.tags || "Blog",
  };
}

function formatDate(ts) {
  if (!ts) return "Freshly published";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getPostTime(post) {
  const source = post.publishedAt || post.createdAt;
  const date = source?.toDate ? source.toDate() : new Date(source ?? 0);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function getPostHref(post) {
  return post.slug ? `/blogs/${post.slug}` : post.externalUrl || post.url || "#";
}

function PostLink({ post, className, children }) {
  const href = getPostHref(post);

  if (post.slug) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function getBlogCategoryNames(blog, categoryById) {
  const fromIds = (Array.isArray(blog.categoryIds) ? blog.categoryIds : [])
    .map((id) => categoryById.get(id)?.name)
    .filter(Boolean);
  if (fromIds.length > 0) return fromIds;
  return (blog.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function getPageFromParams(searchParams) {
  const raw = Number.parseInt(searchParams.get("page") || "1", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("start-ellipsis");
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    items.push(pageNumber);
  }
  if (end < totalPages - 1) items.push("end-ellipsis");
  items.push(totalPages);

  return items;
}

export default function Blogs({ theme, publicSettings = {} }) {
  const portfolioData = usePortfolioData();
  const authorName = portfolioData?.profile?.logo_name || defaultGreeting.logo_name;
  const [blogs, setBlogs] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [sidebarHeight, setSidebarHeight] = useState(720);
  const [searchParams, setSearchParams] = useSearchParams();
  const mainRef = useRef(null);
  const gridRef = useRef(null);
  const categoryFromUrl = searchParams.get("category") || "All";
  const pageFromUrl = getPageFromParams(searchParams);

  const [featuredSlide, setFeaturedSlide] = useState(0);
  const [featuredVisibleCount, setFeaturedVisibleCount] = useState(3);

  const featuredCardsPerSlide = Math.max(1, Number(publicSettings.publicBlogFeaturedCount) || 3);
  const columnsPerRow = Number(publicSettings.publicBlogColumnsPerRow) || 3;
  const rowsPerPage = Number(publicSettings.publicBlogRowsPerPage) || 2;
  const postsPerPage = Math.max(1, Number(publicSettings.publicBlogPostsPerPage) || 6);
  const effectiveColumns = Math.max(
    columnsPerRow,
    Math.ceil(postsPerPage / Math.max(1, rowsPerPage)),
  );
  const recentPostsCount = Number(publicSettings.publicBlogRecentPostsCount) || 9;
  const showSearchWidget = publicSettings.publicBlogShowSearchWidget !== false;
  const showCategoryWidget = publicSettings.publicBlogShowCategoryWidget !== false;
  const showRecentWidget = publicSettings.publicBlogShowRecentWidget !== false;

  // 1. Fetch categories on mount
  useEffect(() => {
    getCategoryList()
      .then((categoriesData) => {
        setAllCategories(categoriesData || []);
      })
      .catch((err) => {
        console.error("[Blogs] Failed to load categories:", err);
      });
  }, []);

  // 2. Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 3. Fetch blogs on search change
  useEffect(() => {
    setLoading(true);
    getAllPublishedBlogs(debouncedSearchQuery)
      .then((data) => {
        if (data.length > 0) {
          setBlogs(data);
        } else {
          if (!debouncedSearchQuery) {
            setBlogs(blogSection.blogs.map((blog, index) => normalizeStaticBlog(blog, index, authorName)));
          } else {
            setBlogs([]);
          }
        }
      })
      .catch((err) => {
        console.error("[Blogs] Failed to fetch search results:", err);
        setBlogs(blogSection.blogs.map((blog, index) => normalizeStaticBlog(blog, index, authorName)));
      })
      .finally(() => setLoading(false));
  }, [debouncedSearchQuery, authorName]);

  useEffect(() => {
    const updateFeaturedVisibleCount = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth <= 700) {
        setFeaturedVisibleCount(1);
      } else if (window.innerWidth <= 1120) {
        setFeaturedVisibleCount(Math.min(2, featuredCardsPerSlide));
      } else {
        setFeaturedVisibleCount(featuredCardsPerSlide);
      }
    };

    updateFeaturedVisibleCount();
    window.addEventListener("resize", updateFeaturedVisibleCount);
    return () => window.removeEventListener("resize", updateFeaturedVisibleCount);
  }, [featuredCardsPerSlide]);

  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
    setCategorySearch("");
  }, [categoryFromUrl]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, postsPerPage]);

  useEffect(() => {
    setPage(pageFromUrl);
  }, [pageFromUrl]);

  const categories = useMemo(() => {
    const counts = new Map();
    const categoryById = new Map(allCategories.map((category) => [category.id, category]));

    blogs.forEach((blog) => {
      getBlogCategoryNames(blog, categoryById).forEach((categoryName) => {
        counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
      });
    });

    return [{ name: "All", count: blogs.length }, ...Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }))];
  }, [blogs, allCategories]);

  const visibleCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const filteredBlogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const categoryById = new Map(allCategories.map((category) => [category.id, category]));

    return blogs.filter((blog) => {
      const searchableText = [
        blog.title,
        blog.subtitle,
        blog.excerpt,
        blog.metaDescription,
        blog.description,
        blog.author,
        blog.tags,
        blog.difficulty,
        blog.audience,
        blog.prerequisites,
        blog.series,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || searchableText.includes(q);
      const matchesCategory =
        selectedCategory === "All" ||
        getBlogCategoryNames(blog, categoryById).includes(selectedCategory);

      return matchesQuery && matchesCategory;
    }).sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
      return getPostTime(b) - getPostTime(a);
    });
  }, [blogs, allCategories, searchQuery, selectedCategory]);

  function selectCategory(categoryName) {
    setSelectedCategory(categoryName);
    setCategorySearch("");
    const next = new URLSearchParams(searchParams);
    if (categoryName === "All") next.delete("category");
    else next.set("category", categoryName);
    next.delete("page");
    setSearchParams(next);
  }

  function goToPage(nextPage) {
    const normalizedPage = Math.min(Math.max(1, nextPage), pageCount);
    setPage(normalizedPage);
    const next = new URLSearchParams(searchParams);
    if (normalizedPage === 1) next.delete("page");
    else next.set("page", String(normalizedPage));
    setSearchParams(next);
    requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const featuredPosts = blogs
    .filter((blog) => blog.featured)
    .sort((a, b) => getPostTime(b) - getPostTime(a));
  const showFeatured = publicSettings.publicBlogShowFeatured !== false && !loading && featuredPosts.length > 0 && selectedCategory === "All" && !searchQuery.trim();
  const gridBlogs = useMemo(
    () => (showFeatured ? filteredBlogs.filter((blog) => !blog.featured) : filteredBlogs),
    [filteredBlogs, showFeatured]
  );

  const featuredPages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < featuredPosts.length; i += featuredVisibleCount) {
      pages.push(featuredPosts.slice(i, i + featuredVisibleCount));
    }
    return pages;
  }, [featuredPosts, featuredVisibleCount]);

  useEffect(() => {
    setFeaturedSlide(0);
  }, [featuredVisibleCount, selectedCategory, searchQuery]);

  useEffect(() => {
    if (featuredSlide < featuredPages.length) return;
    setFeaturedSlide(Math.max(0, featuredPages.length - 1));
  }, [featuredPages.length, featuredSlide]);

  const pageCount = Math.max(1, Math.ceil(gridBlogs.length / postsPerPage));

  useEffect(() => {
    if (page <= pageCount) return;
    const next = new URLSearchParams(searchParams);
    if (pageCount <= 1) next.delete("page");
    else next.set("page", String(pageCount));
    setPage(pageCount);
    setSearchParams(next);
  }, [page, pageCount, searchParams, setSearchParams]);

  const pageEnd = Math.min(page * postsPerPage, gridBlogs.length);
  const pagedBlogs = gridBlogs.slice((page - 1) * postsPerPage, page * postsPerPage);
  const paginationItems = getPaginationItems(page, pageCount);
  const pageStart = gridBlogs.length === 0 ? 0 : (page - 1) * postsPerPage + 1;

  const recentPosts = [...blogs].sort((a, b) => getPostTime(b) - getPostTime(a)).slice(0, recentPostsCount);

  useEffect(() => {
    const gridNode = gridRef.current;
    if (!gridNode) return undefined;

    const measureSidebarHeight = () => {
      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
        setSidebarHeight(0);
        return;
      }

      const cards = Array.from(gridNode.children).filter((node) => node.classList?.contains("bc-card") || node.classList?.contains("bc-skeleton"));
      if (cards.length === 0) {
        setSidebarHeight(720);
        return;
      }

      const mainNode = mainRef.current;
      const mainRect = mainNode?.getBoundingClientRect() || gridNode.getBoundingClientRect();
      const rows = [];

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const existingRow = rows.find((row) => Math.abs(row.top - rect.top) < 8);
        if (existingRow) {
          existingRow.bottom = Math.max(existingRow.bottom, rect.bottom);
          existingRow.count += 1;
        } else {
          rows.push({ top: rect.top, bottom: rect.bottom, count: 1 });
        }
      });

      rows.sort((a, b) => a.top - b.top);
      const targetRow = rows[Math.min(1, rows.length - 1)];
      const measured = Math.max(420, Math.round(targetRow.bottom - mainRect.top) - 15);
      setSidebarHeight(measured);
    };

    measureSidebarHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        window.requestAnimationFrame(measureSidebarHeight);
      });
      observer.observe(gridNode);
      Array.from(gridNode.children).forEach((child) => observer.observe(child));
      window.addEventListener("resize", measureSidebarHeight);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", measureSidebarHeight);
      };
    }

    window.addEventListener("resize", measureSidebarHeight);
    return () => window.removeEventListener("resize", measureSidebarHeight);
  }, [loading, pagedBlogs.length, page, selectedCategory, searchQuery]);

  const themeVars = {
    "--blog-bg": theme?.body || "#F0F8FF",
    "--blog-card": theme?.cardBackground || "#FFFFFF",
    "--blog-text": theme?.text || "#0A1628",
    "--blog-muted": theme?.secondaryText || "#4A6FA5",
    "--blog-accent": theme?.imageHighlight || theme?.gradientStart || "#1565C0",
    "--blog-accent-2": theme?.gradientEnd || "#42A5F5",
    "--blog-soft": theme?.compImgHighlight || "#E3F2FD",
    "--blog-border": theme?.cardBorder || "#BBDEFB",
    "--blog-glow": theme?.accentGlow || "rgba(66, 165, 245, 0.24)",
    "--blog-gradient": `linear-gradient(135deg, ${theme?.gradientStart || theme?.imageHighlight || "#1565C0"} 0%, ${theme?.gradientEnd || "#42A5F5"} 100%)`,
  };

  return (
    <section className="blogs-section" id="blogs" style={themeVars}>
      <div className="blogs-pagehead">
        <div className="blogs-pagehead-left">
          <h1 className="blogs-page-title">Blog Posts</h1>
        </div>
      </div>

      <div className="blogs-layout">
        <div className="blogs-main" ref={mainRef}>
          {showFeatured && (() => {
            const totalPages = featuredPages.length;
            const slideStart = featuredSlide * featuredVisibleCount + 1;
            const slideEnd = Math.min((featuredSlide + 1) * featuredVisibleCount, featuredPosts.length);
            return (
              <section className="blogs-featured" aria-label="Featured posts">
                <div className="blogs-featured-head">
                  <span className="blogs-featured-kicker"><i className="fas fa-star" /> Featured</span>
                  <h2>Featured Posts</h2>
                  {totalPages > 1 && (
                    <span className="blogs-featured-counter">{slideStart}–{slideEnd} of {featuredPosts.length}</span>
                  )}
                </div>
                <div className="blogs-featured-slider">
                  {totalPages > 1 && (
                    <button
                      className="blogs-featured-arrow blogs-featured-arrow--prev"
                      onClick={() => setFeaturedSlide(p => Math.max(0, p - 1))}
                      disabled={featuredSlide === 0}
                      aria-label="Previous featured posts"
                    >
                      <i className="fas fa-chevron-left" />
                    </button>
                  )}
                  <div className="blogs-featured-track-wrap">
                    <div
                      className="blogs-featured-track"
                      style={{ transform: `translateX(-${featuredSlide * 100}%)` }}
                    >
                      {featuredPages.map((featuredPage, pi) => (
                        <div key={pi} className="blogs-featured-slide" style={{ "--featured-cols": featuredVisibleCount }}>
                          {featuredPage.map((blog, i) => (
                            <BlogCard key={`featured-${blog.id}`} blog={blog} theme={theme} index={pi * featuredVisibleCount + i} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <button
                      className="blogs-featured-arrow blogs-featured-arrow--next"
                      onClick={() => setFeaturedSlide(p => Math.min(totalPages - 1, p + 1))}
                      disabled={featuredSlide === totalPages - 1}
                      aria-label="Next featured posts"
                    >
                      <i className="fas fa-chevron-right" />
                    </button>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="blogs-featured-dots">
                    {featuredPages.map((_, i) => (
                      <button
                        key={i}
                        className={`blogs-featured-dot${i === featuredSlide ? " is-active" : ""}`}
                        onClick={() => setFeaturedSlide(i)}
                        aria-label={`Go to page ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })()}

          <div
            className="blogs-grid"
            ref={gridRef}
            style={{
              "--blog-columns": Math.min(effectiveColumns, Math.max(1, pagedBlogs.length || effectiveColumns)),
            }}
          >
            {loading ? (
              [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
            ) : pagedBlogs.length === 0 && !showFeatured ? (
              <div className="blogs-empty">
                <span className="blogs-empty-icon">📭</span>
                <p>No blog posts found for this search.</p>
              </div>
            ) : pagedBlogs.length === 0 ? (
              <div className="blogs-empty blogs-empty--compact">
                <p>All matching posts are featured above.</p>
              </div>
            ) : (
              pagedBlogs.map((blog, i) => (
                <BlogCard key={blog.id} blog={blog} theme={theme} index={i} />
              ))
            )}
          </div>

          {!loading && gridBlogs.length > 0 && pageCount > 1 && (
            <div className="blogs-pagination">
              <div className="blogs-pagination-summary">
                Showing <strong>{pageStart}-{pageEnd}</strong>{" "}
                of <strong>{gridBlogs.length}</strong> posts
              </div>

              <div className="blogs-pagination-controls" aria-label="Blog pagination">
              <button
                type="button"
                className="blogs-page-btn blogs-page-btn--nav"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <i className="fas fa-arrow-left" /> <span>Prev</span>
              </button>

              {paginationItems.map((item) => (
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    className={`blogs-page-btn${item === page ? " is-active" : ""}`}
                    onClick={() => goToPage(item)}
                    aria-label={`Go to page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="blogs-page-ellipsis" aria-hidden="true">...</span>
                )
              ))}

              <button
                type="button"
                className="blogs-page-btn blogs-page-btn--nav"
                onClick={() => goToPage(page + 1)}
                disabled={page === pageCount}
                aria-label="Next page"
              >
                <span>Next</span> <i className="fas fa-arrow-right" />
              </button>
              </div>
            </div>
          )}
        </div>

        <aside
          className="blogs-sidebar"
          style={sidebarHeight > 0 ? { "--blogs-sidebar-target-h": `${sidebarHeight}px` } : undefined}
        >
          {showSearchWidget && (
            <div className="blogs-widget blogs-widget--search">
              <label htmlFor="blogs-search-posts" className="blogs-widget-title">Search</label>
              <div className="blogs-searchbox">
                <input
                  id="blogs-search-posts"
                  name="blogsSearch"
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="blogs-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <i className="fas fa-times" />
                  </button>
                ) : (
                  <span className="blogs-search-icon">
                    <i className="fas fa-search" />
                  </span>
                )}
              </div>
            </div>
          )}

          {showCategoryWidget && (
            <div className="blogs-widget blogs-widget--categories">
              <label htmlFor="blogs-search-categories" className="blogs-widget-title">Categories</label>
              <div className="blogs-searchbox blogs-searchbox--category">
                <input
                  id="blogs-search-categories"
                  name="blogsCategorySearch"
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  autoComplete="off"
                />
                {categorySearch ? (
                  <button
                    type="button"
                    className="blogs-search-clear"
                    onClick={() => setCategorySearch("")}
                    aria-label="Clear category search"
                  >
                    <i className="fas fa-times" />
                  </button>
                ) : (
                  <span className="blogs-search-icon">
                    <i className="fas fa-search" />
                  </span>
                )}
              </div>

              <div className="blogs-category-list">
                {visibleCategories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    className={`blogs-category-item${selectedCategory === category.name ? " is-active" : ""}`}
                    onClick={() => selectCategory(category.name)}
                  >
                    <span>{category.name}</span>
                    <strong>{category.count}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showRecentWidget && (
            <div className="blogs-widget blogs-widget--recent">
              <h3 className="blogs-widget-title">Recent Posts</h3>
              <div className="blogs-recent-list">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="blogs-recent-item blogs-recent-skeleton">
                      <div className="bc-sk-line" style={{ width: 54, height: 46, borderRadius: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div className="bc-sk-line" style={{ width: "85%", height: 12 }} />
                        <div className="bc-sk-line" style={{ width: "55%", height: 10 }} />
                      </div>
                    </div>
                  ))
                ) : recentPosts.length === 0 ? (
                  <p className="blogs-sidebar-empty">No recent posts yet.</p>
                ) : (
                  recentPosts.map((post) => (
                    <PostLink key={post.id} post={post} className="blogs-recent-item">
                      <div className="blogs-recent-thumb">
                        {post.image ? (
                          <img src={post.image} alt={post.title} loading="lazy" decoding="async" />
                        ) : (
                          <span>✍️</span>
                        )}
                      </div>
                      <div className="blogs-recent-info">
                        <span className="blogs-recent-title">{post.title}</span>
                        <span className="blogs-recent-date">{formatDate(post.createdAt)}</span>
                      </div>
                    </PostLink>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
