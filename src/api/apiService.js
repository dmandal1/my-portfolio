/**
 * apiService.js — PHP/MySQL backend API service.
 * Provides the same exported function names used across the app.
 */
import { apiFetch, apiUpload, API_BASE, authHeaders } from './config';

// ── Helpers ────────────────────────────────────────────────────────────────
function slugify(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function normalizeBlog(data) {
  const tags =
    Array.isArray(data.tags)
      ? data.tags.map((t) => String(t || '').trim()).filter(Boolean).join(', ')
      : typeof data.tags === 'string'
        ? data.tags
        : '';
  const storedSlug =
    typeof data.slug === 'string' && data.slug.trim() ? slugify(data.slug) : '';
  return {
    allowComments: true,
    featured: false,
    excerpt: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    imageAlt: '',
    difficulty: 'intermediate',
    audience: '',
    prerequisites: '',
    repoUrl: '',
    demoUrl: '',
    series: '',
    ...data,
    tags,
    slug: storedSlug || `id-${data.id || slugify(data.title || 'post')}`,
    slugStored: Boolean(storedSlug),
    // Map snake_case DB fields to camelCase expected by the UI
    image:          data.image          || data.coverImage        || data.cover_image || '',
    coverImage:     data.coverImage     || data.cover_image       || data.image       || '',
    imageAlt:       data.imageAlt       || data.image_alt         || '',
    metaTitle:      data.metaTitle      || data.meta_title        || '',
    metaDescription:data.metaDescription|| data.meta_description || '',
    canonicalUrl:   data.canonicalUrl   || data.canonical_url     || '',
    repoUrl:        data.repoUrl        || data.repo_url          || '',
    demoUrl:        data.demoUrl        || data.demo_url          || '',
    allowComments:  data.allowComments  ?? data.allow_comments    ?? true,
    pendingReview:  data.pendingReview  ?? data.pending_review    ?? false,
    commentsCount:  data.commentsCount  || data.comments_count    || 0,
    createdAt:      data.createdAt      || data.created_at,
    updatedAt:      data.updatedAt      || data.updated_at,
    scheduledAt:    data.scheduledAt    || data.scheduled_at      || null,
    categoryIds:    Array.isArray(data.categoryIds)  ? data.categoryIds
                  : Array.isArray(data.category_ids) ? data.category_ids
                  : [],
    tagIds:         Array.isArray(data.tagIds)  ? data.tagIds
                  : Array.isArray(data.tag_ids) ? data.tag_ids
                  : [],
  };
}

// ── Admin settings ─────────────────────────────────────────────────────────
export async function saveAdminPanelSettings(settings) {
  await apiFetch('/settings.php', { method: 'POST', body: JSON.stringify(settings) });
  return { adminPanelSettings: 'ok' };
}

export function subscribeToAdminPanelSettings(callback, onError) {
  let cancelled = false;

  apiFetch('/settings.php')
    .then((data) => { if (!cancelled) callback(data); })
    .catch((err) => { if (!cancelled && onError) onError(err); });

  // Lightweight polling so admin tab toggles propagate
  const interval = window.setInterval(() => {
    apiFetch('/settings.php')
      .then((data) => { if (!cancelled) callback(data); })
      .catch(() => {});
  }, 15000);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}

// ── Blogs ──────────────────────────────────────────────────────────────────
export async function getAllPublishedBlogs() {
  try {
    const blogs = await apiFetch('/blogs.php');
    return blogs.map(normalizeBlog).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const tb = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return tb - ta;
    });
  } catch {
    return [];
  }
}

export async function getAllBlogsAdmin() {
  const blogs = await apiFetch('/blogs.php?admin=1');
  return blogs.map(normalizeBlog);
}

export async function getBlogBySlug(slug) {
  const raw = String(slug || '').trim();
  try {
    if (raw.toLowerCase().startsWith('id-')) {
      const id = raw.slice(3);
      const blog = await getBlogById(id);
      return blog?.published ? blog : null;
    }
    const blog = await apiFetch(`/blogs.php?slug=${encodeURIComponent(raw)}`);
    return blog ? normalizeBlog(blog) : null;
  } catch {
    return null;
  }
}

export async function getBlogById(id) {
  try {
    const blog = await apiFetch(`/blogs.php?id=${encodeURIComponent(id)}`);
    return blog ? normalizeBlog(blog) : null;
  } catch {
    return null;
  }
}

export async function createBlog(data) {
  return apiFetch('/blogs.php', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBlog(id, data) {
  return apiFetch(`/blogs.php?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBlog(id) {
  return apiFetch(`/blogs.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function publishScheduledPosts() {
  const result = await apiFetch('/blogs.php?action=publish_scheduled', { method: 'POST' });
  return result.published || 0;
}

export async function approvePendingPost(id) {
  return apiFetch(`/blogs.php?action=approve&id=${encodeURIComponent(id)}`, { method: 'POST' });
}

export async function rejectPendingPost(id) {
  return apiFetch(`/blogs.php?action=reject&id=${encodeURIComponent(id)}`, { method: 'POST' });
}

export async function incrementViewCount(blogId) {
  return apiFetch(`/blogs.php?action=increment_view&id=${encodeURIComponent(blogId)}`, { method: 'POST' });
}

export function subscribeToBlogs(callback, onError) {
  let cancelled = false;

  async function fetch() {
    try {
      const blogs = await getAllBlogsAdmin();
      if (!cancelled) callback(blogs);
    } catch (err) {
      if (!cancelled && onError) onError(err);
    }
  }

  fetch();
  const interval = window.setInterval(fetch, 10000);
  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}

// ── Media / Image upload ───────────────────────────────────────────────────
export function uploadCoverImage(file, onProgress, _oldUrl) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'blog-covers');

    // Simulate progress (no real XHR progress here — use XHR if needed)
    if (onProgress) onProgress(10);

    apiUpload('/media.php', form)
      .then((res) => {
        if (onProgress) onProgress(100);
        resolve(res.url);
      })
      .catch(reject);
  });
}

export function uploadPortfolioAsset(file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'portfolio-assets');

    if (onProgress) onProgress(10);
    apiUpload('/media.php', form)
      .then((res) => {
        if (onProgress) onProgress(100);
        resolve(res.url);
      })
      .catch(reject);
  });
}

export async function listAllMedia() {
  const items = await apiFetch('/media.php');
  return items.map((item) => ({
    name:        item.file_name,
    url:         item.url,
    size:        item.file_size,
    contentType: item.content_type,
    timeCreated: item.created_at,
    fullPath:    item.file_path,
    id:          item.id,
  }));
}

export async function deleteMediaItem(fullPath) {
  return apiFetch(`/media.php?full_path=${encodeURIComponent(fullPath)}`, { method: 'DELETE' });
}

// ── Comments ───────────────────────────────────────────────────────────────
export async function getComments(blogId) {
  try {
    return await apiFetch(`/comments.php?blog_id=${encodeURIComponent(blogId)}`);
  } catch {
    return [];
  }
}

export async function addComment(blogId, { name, message, parentId = null, isAuthorReply = false, replyToName = null }) {
  return apiFetch('/comments.php', {
    method: 'POST',
    body: JSON.stringify({ blogId, name, message, parentId, isAuthorReply, replyToName }),
  });
}

export async function deleteComment(blogId, commentId) {
  return apiFetch(
    `/comments.php?blog_id=${encodeURIComponent(blogId)}&comment_id=${encodeURIComponent(commentId)}`,
    { method: 'DELETE' }
  );
}

export async function getRecentComments(maxCount = 10) {
  try {
    return await apiFetch(`/comments.php?recent=1&max=${maxCount}`);
  } catch {
    return [];
  }
}

export async function getCommentsOverview() {
  try {
    return await apiFetch('/comments.php?overview=1');
  } catch {
    return { total: 0, comments: [] };
  }
}

export function subscribeToCommentsOverview(callback, onError) {
  let cancelled = false;

  async function fetch() {
    try {
      const data = await getCommentsOverview();
      if (!cancelled) callback(data);
    } catch (err) {
      if (!cancelled && onError) onError(err);
    }
  }

  fetch();
  const interval = window.setInterval(fetch, 10000);
  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}

export function subscribeToRecentComments(callback, onError, maxCount = 10) {
  let cancelled = false;

  async function fetch() {
    try {
      const data = await getRecentComments(maxCount);
      if (!cancelled) callback(data);
    } catch (err) {
      if (!cancelled && onError) onError(err);
    }
  }

  fetch();
  const interval = window.setInterval(fetch, 10000);
  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}

// ── Categories ─────────────────────────────────────────────────────────────
export async function getCategoryList() {
  try {
    return await apiFetch('/categories.php');
  } catch {
    return [];
  }
}

export function subscribeToCategories(callback, onError) {
  let cancelled = false;
  apiFetch('/categories.php')
    .then((data) => { if (!cancelled) callback(data); })
    .catch((err) => { if (!cancelled && onError) onError(err); });

  const interval = window.setInterval(() => {
    apiFetch('/categories.php')
      .then((data) => { if (!cancelled) callback(data); })
      .catch(() => {});
  }, 15000);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}

export async function getCategories() {
  return apiFetch('/categories.php?counts=1');
}

export async function createCategory({ name, slug, parentId, description }) {
  return apiFetch('/categories.php', {
    method: 'POST',
    body: JSON.stringify({ name, slug, parentId, description }),
  });
}

export async function updateCategory(id, { name, slug, parentId, description }) {
  return apiFetch(`/categories.php?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name, slug, parentId, description }),
  });
}

export async function deleteCategory(id) {
  return apiFetch(`/categories.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Tags ───────────────────────────────────────────────────────────────────
export async function getTags() {
  return apiFetch('/tags.php');
}

export async function createTag(name) {
  return apiFetch('/tags.php', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function updateTag(id, { name, slug }) {
  return apiFetch(`/tags.php?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name, slug }),
  });
}

export async function deleteTag(id) {
  return apiFetch(`/tags.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Author followers ────────────────────────────────────────────────────────
export async function getAuthorFollowerStats(clientId) {
  try {
    const q = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
    return await apiFetch(`/followers.php${q}`);
  } catch {
    return { totalFollowers: 0, isFollowing: false };
  }
}

export async function setAuthorFollowStatus(clientId, shouldFollow) {
  if (!clientId) throw new Error('Missing client id.');
  return apiFetch('/followers.php', {
    method: 'POST',
    body: JSON.stringify({ clientId, follow: shouldFollow }),
  });
}

// ── Author ratings ──────────────────────────────────────────────────────────
export async function getAuthorRatingSummary(clientId = '') {
  try {
    const q = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
    return await apiFetch(`/ratings.php${q}`);
  } catch {
    return { count: 0, total: 0, userRating: 0 };
  }
}

export async function setAuthorRating(clientId, value) {
  if (!clientId) throw new Error('Missing client id.');
  return apiFetch('/ratings.php', {
    method: 'POST',
    body: JSON.stringify({ clientId, value }),
  });
}

// ── Portfolio: single-doc sections ─────────────────────────────────────────
async function getSection(name) {
  try {
    return await apiFetch(`/portfolio.php?section=${encodeURIComponent(name)}`);
  } catch { return null; }
}

async function saveSection(name, data) {
  return apiFetch(`/portfolio.php?section=${encodeURIComponent(name)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const getPortfolioProfile    = () => getSection('portfolioProfile');
export const savePortfolioProfile   = (d) => saveSection('portfolioProfile', d);
export const getPortfolioContact    = () => getSection('portfolioContact');
export const savePortfolioContact   = (d) => saveSection('portfolioContact', d);
export const getPortfolioSeo        = () => getSection('portfolioSeo');
export const savePortfolioSeo       = (d) => saveSection('portfolioSeo', d);
export const getExperienceHeader    = () => getSection('portfolioExperienceHeader');
export const saveExperienceHeader   = (d) => saveSection('portfolioExperienceHeader', d);
export const getContactPageData     = () => getSection('portfolioContactPageData');
export const saveContactPageData    = (d) => saveSection('portfolioContactPageData', d);
export const getProjectsHeader      = () => getSection('portfolioProjectsHeader');
export const saveProjectsHeader     = (d) => saveSection('portfolioProjectsHeader', d);
export const getOpenSourceConfig    = () => getSection('portfolioOpenSource');
export const saveOpenSourceConfig   = (d) => saveSection('portfolioOpenSource', d);
export const getPodcastSection      = () => getSection('portfolioPodcast');
export const savePodcastSection     = (d) => saveSection('portfolioPodcast', d);
export const getBlogSectionConfig   = () => getSection('portfolioBlogSection');
export const saveBlogSectionConfig  = (d) => saveSection('portfolioBlogSection', d);

// ── Portfolio: collection sections ─────────────────────────────────────────
function makeCollection(collectionName) {
  const enc = encodeURIComponent(collectionName);
  return {
    getAll:  () => apiFetch(`/portfolio.php?collection=${enc}`),
    create:  (data) => apiFetch(`/portfolio.php?collection=${enc}`, {
      method: 'POST', body: JSON.stringify(data),
    }),
    update:  (id, data) => apiFetch(`/portfolio.php?collection=${enc}&id=${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
    remove:  (id) => apiFetch(`/portfolio.php?collection=${enc}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  };
}

const _social      = makeCollection('portfolioSocialLinks');
const _education   = makeCollection('portfolioEducation');
const _competitive = makeCollection('portfolioCompetitiveSites');
const _projects    = makeCollection('portfolioProjects');
const _skills      = makeCollection('portfolioSkills');

export const getSocialLinks         = () => _social.getAll();
export const createSocialLink       = (d) => _social.create(d);
export const updateSocialLink       = (id, d) => _social.update(id, d);
export const deleteSocialLink       = (id) => _social.remove(id);

export const getEducation           = () => _education.getAll();
export const createDegree           = (d) => _education.create(d);
export const updateDegree           = (id, d) => _education.update(id, d);
export const deleteDegree           = (id) => _education.remove(id);

export const getCompetitiveSites    = () => _competitive.getAll();
export const createCompetitiveSite  = (d) => _competitive.create(d);
export const updateCompetitiveSite  = (id, d) => _competitive.update(id, d);
export const deleteCompetitiveSite  = (id) => _competitive.remove(id);

export const getPortfolioProjects   = () => _projects.getAll();
export const createPortfolioProject = (d) => _projects.create(d);
export const updatePortfolioProject = (id, d) => _projects.update(id, d);
export const deletePortfolioProject = (id) => _projects.remove(id);

export const getSkillGroups         = () => _skills.getAll();
export const createSkillGroup       = (d) => _skills.create(d);
export const updateSkillGroup       = (id, d) => _skills.update(id, d);
export const deleteSkillGroup       = (id) => _skills.remove(id);

// ── Portfolio: Certifications ───────────────────────────────────────────────
const _certs = makeCollection('portfolioCertifications');

export const getCertifications       = () => _certs.getAll();
export const createCertification     = (d) => _certs.create(d);
export const updateCertification     = (id, d) => _certs.update(id, d);
export const deleteCertification     = (id) => _certs.remove(id);

// ── Portfolio: Experience ───────────────────────────────────────────────────
const _exp = makeCollection('portfolioExperiences');

export const getExperiences          = () => _exp.getAll();
export const createExperience        = (d) => _exp.create(d);
export const updateExperience        = (id, d) => _exp.update(id, d);
export const deleteExperience        = (id) => _exp.remove(id);

// ── Database management ────────────────────────────────────────────────────
export const getDatabaseStats = () => apiFetch('/database.php?action=stats');

export const optimizeDatabase = () =>
  apiFetch('/database.php?action=optimize', { method: 'POST' });

export const truncateTable = (table) =>
  apiFetch(`/database.php?action=truncate&table=${encodeURIComponent(table)}`, { method: 'POST' });

export const restoreDatabaseTable = (auditId) =>
  apiFetch(`/database.php?action=restore&id=${auditId}`, { method: 'POST' });

export async function downloadDatabaseBackup(table = '') {
  const { getToken } = await import('./config');
  const token = getToken();
  const query = table ? `&table=${encodeURIComponent(table)}` : '';
  const res = await fetch(`${API_BASE}/database.php?action=backup${query}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Backup failed');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = table
    ? `portfolio_table_${table}_${new Date().toISOString().slice(0,10)}.sql`
    : `portfolio_backup_${new Date().toISOString().slice(0,10)}.sql`;
  a.click();
  URL.revokeObjectURL(url);
}
