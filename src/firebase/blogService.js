import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDocsFromServer,
  getDoc,
  getDocFromServer,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  onSnapshot,
  getCountFromServer,
  writeBatch,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from "firebase/storage";
import { auth, db, storage } from "./config";
import { cacheAdminSettings, normalizeAdminSettings } from "../pages/admin/components/adminSettingsConfig";

const BLOGS_COLLECTION = "blogs";
const ADMIN_PANEL_SETTINGS_COLLECTION = "adminPanelSettings";
const ADMIN_PANEL_SETTINGS_DOC = "settings";
const SITE_SETTINGS_COLLECTION = "siteSettings";
const ADMIN_SETTINGS_DOC = "adminPanel";
const SETTINGS_FALLBACK_DOC = "adminPanel";
const AUTHOR_FOLLOWERS_COLLECTION = "authorFollowers";

function getDeviceInfo() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const lang = (typeof navigator !== "undefined" && navigator.language) || "";
  const screen_w = (typeof window !== "undefined" && window.screen?.width) || null;
  const screen_h = (typeof window !== "undefined" && window.screen?.height) || null;
  const platform = (typeof navigator !== "undefined" && (navigator.userAgentData?.platform || navigator.platform)) || "";
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(ua);
  const timezone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
  const deviceId = (typeof window !== "undefined" && window.localStorage?.getItem("bp_device_fp")) || "";
  return { deviceId, ua, lang, screen_w, screen_h, platform, isMobile, timezone };
}

const TECHNICAL_BLOG_DEFAULTS = {
  excerpt: "",
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  imageAlt: "",
  difficulty: "intermediate",
  audience: "",
  prerequisites: "",
  repoUrl: "",
  demoUrl: "",
  series: "",
};

const BLOG_DEFAULTS = {
  allowComments: true,
  featured: false,
};

function slugify(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function normalizeBlog(data) {
  const tags =
    Array.isArray(data.tags)
      ? data.tags.map((t) => String(t || "").trim()).filter(Boolean).join(", ")
      : typeof data.tags === "string"
        ? data.tags
        : "";
  const imageAlt = typeof data.imageAlt === "string" ? data.imageAlt : "";
  const title = typeof data.title === "string" ? data.title : String(data.title || "");
  const subtitle = typeof data.subtitle === "string" ? data.subtitle : "";
  const content = typeof data.content === "string" ? data.content : "";
  const storedSlug = typeof data.slug === "string" && data.slug.trim()
    ? slugify(data.slug)
    : "";
  return {
    ...BLOG_DEFAULTS,
    ...TECHNICAL_BLOG_DEFAULTS,
    ...data,
    title,
    subtitle,
    content,
    tags,
    imageAlt,
    // If the document doesn't have a stored slug yet, fall back to an id-based slug.
    // This avoids expensive full-collection fallbacks when opening a post.
    slug: storedSlug || `id-${data.id || slugify(data.title || "post")}`,
    slugStored: Boolean(storedSlug),
  };
}

function normalizeBlogPayload(data, { includeDefaults = true } = {}) {
  const payload = includeDefaults ? { ...TECHNICAL_BLOG_DEFAULTS, ...data } : { ...data };
  Object.keys(TECHNICAL_BLOG_DEFAULTS).forEach((key) => {
    if (!(key in payload)) return;
    payload[key] = typeof payload[key] === "string" ? payload[key].trim() : payload[key] || "";
  });
  if ("difficulty" in payload) payload.difficulty = payload.difficulty || "intermediate";
  return payload;
}

export async function saveAdminPanelSettings(settings) {
  const normalized = normalizeAdminSettings(settings);
  const payload = { ...normalized, systemDoc: true, updatedAt: serverTimestamp() };

  const dedicatedResult = await Promise.allSettled([
    setDoc(doc(db, ADMIN_PANEL_SETTINGS_COLLECTION, ADMIN_PANEL_SETTINGS_DOC), payload, { merge: true }),
  ]).then((results) => results[0]);

  const writeReport = {
    adminPanelSettings:
      dedicatedResult.status === "fulfilled"
        ? "ok"
        : dedicatedResult.reason?.code || dedicatedResult.reason?.message || "failed",
  };

  if (dedicatedResult.status === "rejected") {
    const error = dedicatedResult.reason || new Error("Settings sync failed");
    error.writeReport = writeReport;
    throw error;
  }

  console.info("[saveAdminPanelSettings] write report", writeReport);
  cacheAdminSettings(normalized);
  return writeReport;
}

export function subscribeToAdminPanelSettings(callback, onError) {
  // Avoid realtime listeners here to prevent Firestore watch-stream issues from
  // crashing the public site (and to keep console clean when rules deny reads).
  // We do a one-time server fetch, and (only for signed-in admin) poll occasionally.
  const isAuthed = Boolean(auth?.currentUser);
  const dedicatedRef = doc(db, ADMIN_PANEL_SETTINGS_COLLECTION, ADMIN_PANEL_SETTINGS_DOC);
  const primaryRef = doc(db, SITE_SETTINGS_COLLECTION, ADMIN_SETTINGS_DOC);

  let cancelled = false;

  async function fetchOnce() {
    try {
      const dedicated = await getDocFromServer(dedicatedRef);
      if (cancelled) return;
      if (dedicated.exists()) {
        const normalized = cacheAdminSettings(dedicated.data());
        callback(normalized);
        return;
      }
    } catch (err) {
      if (cancelled) return;
      if (err?.code !== "permission-denied") {
        console.error("subscribeToAdminPanelSettings dedicated fetch error:", err);
      }
    }

    try {
      const snap = await getDocFromServer(primaryRef);
      if (cancelled) return;
      if (snap.exists()) {
        const normalized = cacheAdminSettings(snap.data());
        callback(normalized);
        return;
      }
    } catch (err) {
      if (cancelled) return;
      // Fall through to legacy path for backward compatibility with older deployments.
      if (err?.code !== "permission-denied") {
        console.error("subscribeToAdminPanelSettings fetch error:", err);
      }
    }

    callback({});
    if (onError) onError(new Error("Admin panel settings document not found."));
  }

  fetchOnce();

  // Admin gets lightweight polling so toggling maintenance from another tab updates.
  const interval = isAuthed ? window.setInterval(fetchOnce, 15000) : null;
  return () => {
    cancelled = true;
    if (interval) window.clearInterval(interval);
  };
}

export async function getAllPublishedBlogs() {
  // Use only `where` — no orderBy — to avoid requiring a Firestore composite index.
  // Sort client-side instead.
  const q = query(
    collection(db, BLOGS_COLLECTION),
    where("published", "==", true)
  );
  // Use server fetch to avoid listener-based getDocs path in some environments.
  // If this fails (offline / permission issues), fall back to an empty list and let the UI use static posts.
  let snapshot;
  try {
    snapshot = await getDocsFromServer(q);
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("[blogService] getAllPublishedBlogs failed:", err);
    }
    return [];
  }
  const docs = snapshot.docs.map((d) => normalizeBlog({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt ?? 0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt ?? 0);
    return tb - ta;
  });
}

export async function getAllBlogsAdmin() {
  const q = query(
    collection(db, BLOGS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => normalizeBlog({ id: d.id, ...d.data() }));
}

export async function getBlogBySlug(slug) {
  const raw = String(slug || "").trim();
  if (raw.toLowerCase().startsWith("id-")) {
    const id = raw.slice(3);
    const byId = await getBlogById(id).catch(() => null);
    return byId?.published ? byId : null;
  }

  const normalizedSlug = slugify(raw);

  try {
    const q = query(
      collection(db, BLOGS_COLLECTION),
      where("slug", "==", normalizedSlug),
      where("published", "==", true)
    );
    const snapshot = await getDocsFromServer(q);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map((d) => normalizeBlog({ id: d.id, ...d.data() }));
      const publishedMatch = docs.find((post) => post.published === true);
      if (publishedMatch) return publishedMatch;
    }
  } catch (error) {
    console.error("[blogService] getBlogBySlug lookup failed:", error);
  }
  return null;
}

export async function getBlogById(id) {
  const ref = doc(db, BLOGS_COLLECTION, id);
  let snapshot;
  try {
    snapshot = await getDocFromServer(ref);
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("[blogService] getBlogById failed:", err);
    }
    return null;
  }
  if (!snapshot.exists()) return null;
  return normalizeBlog({ id: snapshot.id, ...snapshot.data() });
}

export async function createBlog(data) {
  const normalized = normalizeBlogPayload(data);
  const slug = normalized.slug ? slugify(normalized.slug) : slugify(normalized.title);
  const payload = { ...normalized, slug, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  if (payload.scheduledAt instanceof Date) {
    payload.scheduledAt = Timestamp.fromDate(payload.scheduledAt);
  }
  return addDoc(collection(db, BLOGS_COLLECTION), payload);
}

export async function updateBlog(id, data) {
  const docRef = doc(db, BLOGS_COLLECTION, id);
  const normalized = normalizeBlogPayload(data, { includeDefaults: false });
  const updates = { ...normalized, updatedAt: serverTimestamp() };
  if (normalized.slug) {
    updates.slug = slugify(normalized.slug);
  } else if (normalized.title) {
    updates.slug = slugify(normalized.title);
  }
  // Convert JS Date scheduledAt to Firestore Timestamp
  if (updates.scheduledAt instanceof Date) {
    updates.scheduledAt = Timestamp.fromDate(updates.scheduledAt);
  }
  return updateDoc(docRef, updates);
}

/**
 * Check all unpublished posts with a past scheduledAt and publish them.
 * Call this on admin page load for lightweight client-side scheduling.
 */
export async function publishScheduledPosts() {
  const now = Timestamp.now();
  const q = query(
    collection(db, BLOGS_COLLECTION),
    where("published", "==", false),
  );
  const snapshot = await getDocs(q);
  const due = snapshot.docs.filter((d) => {
    const sa = d.data().scheduledAt;
    if (!sa) return false;
    return sa.toMillis ? sa.toMillis() <= now.toMillis() : new Date(sa) <= new Date();
  });
  await Promise.all(
    due.map((d) =>
      updateDoc(doc(db, BLOGS_COLLECTION, d.id), {
        published: true,
        pendingReview: false,
        scheduledAt: null,
        updatedAt: serverTimestamp(),
      })
    )
  );
  return due.length;
}

export async function deleteBlog(id) {
  return deleteDoc(doc(db, BLOGS_COLLECTION, id));
}

/**
 * Atomically increment the view counter for a blog post.
 * Safe to call from the public blog-post page.
 */
export async function incrementViewCount(blogId) {
  return updateDoc(doc(db, BLOGS_COLLECTION, blogId), {
    views: increment(1),
  });
}

/**
 * Subscribe to the full blogs collection in real time.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToBlogs(callback, onError) {
  const q = query(collection(db, BLOGS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => normalizeBlog({ id: d.id, ...d.data() }));
      callback(docs);
    },
    (err) => {
      console.error("subscribeToBlogs error:", err);
      if (onError) onError(err);
    }
  );
}

export async function approvePendingPost(id) {
  return updateDoc(doc(db, BLOGS_COLLECTION, id), {
    published: true,
    pendingReview: false,
    scheduledAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectPendingPost(id) {
  return updateDoc(doc(db, BLOGS_COLLECTION, id), {
    published: false,
    pendingReview: false,
    scheduledAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Upload a cover image file to Firebase Storage.
 * Returns the public download URL.
 * @param {File}     file          - The File object from an <input type="file">
 * @param {Function} onProgress    - (pct: number) => void  optional progress callback
 * @param {string}   [oldUrl]      - Previous cover URL — will be deleted from Storage if provided
 */
/**
 * List all media files uploaded to Firebase Storage.
 * Returns items sorted newest-first.
 */
export async function listAllMedia() {
  const folderRef = ref(storage, "blog-covers/");
  const result = await listAll(folderRef);
  const items = await Promise.all(
    result.items.map(async (itemRef) => {
      const [url, meta] = await Promise.all([
        getDownloadURL(itemRef),
        getMetadata(itemRef),
      ]);
      return {
        name: itemRef.name,
        url,
        size: meta.size,
        contentType: meta.contentType,
        timeCreated: meta.timeCreated,
        fullPath: itemRef.fullPath,
      };
    })
  );
  return items.sort(
    (a, b) => new Date(b.timeCreated) - new Date(a.timeCreated)
  );
}

/**
 * Delete a media item from Firebase Storage by its full storage path.
 */
export async function deleteMediaItem(fullPath) {
  return deleteObject(ref(storage, fullPath));
}

export function uploadCoverImage(file, onProgress, oldUrl) {
  return new Promise(async (resolve, reject) => {
    // Delete old image from Storage if it came from Firebase Storage
    if (oldUrl?.includes("firebasestorage.googleapis.com")) {
      try {
        await deleteObject(ref(storage, oldUrl));
      } catch {
        // old file may already be gone — continue
      }
    }

    const ext = file.name.split(".").pop();
    const path = `blog-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) onProgress((snap.bytesTransferred / snap.totalBytes) * 100);
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/* ── Comments ─────────────────────────────────────────── */
const COMMENTS_SUBCOLLECTION = "comments";

export async function getComments(blogId) {
  const q = query(
    collection(db, BLOGS_COLLECTION, blogId, COMMENTS_SUBCOLLECTION),
    orderBy("createdAt", "asc")
  );
  let snapshot;
  try {
    snapshot = await getDocsFromServer(q);
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("[blogService] getComments failed:", err);
    }
    return [];
  }
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addComment(blogId, { name, message, parentId = null, isAuthorReply = false, replyToName = null }) {
  if (!isAuthorReply) {
    const blogSnap = await getDocFromServer(doc(db, BLOGS_COLLECTION, blogId)).catch(() => null);
    if (!blogSnap || !blogSnap.exists() || blogSnap.data()?.allowComments === false) {
      throw new Error("Comments are disabled for this post.");
    }
  }

  const data = {
    name: name.trim().slice(0, 80),
    message: message.trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  };
  if (parentId) data.parentId = parentId;
  if (replyToName) data.replyToName = replyToName.trim().slice(0, 80);
  if (isAuthorReply) data.isAuthorReply = true;
  const commentRef = await addDoc(
    collection(db, BLOGS_COLLECTION, blogId, COMMENTS_SUBCOLLECTION),
    data
  );

  await updateDoc(doc(db, BLOGS_COLLECTION, blogId), {
    commentsCount: increment(1),
    lastCommentedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return commentRef;
}

export async function getAuthorFollowerStats(clientId) {
  let totalFollowers = 0;
  let isFollowing = false;

  try {
    const snapshot = await getDocsFromServer(collection(db, AUTHOR_FOLLOWERS_COLLECTION));
    totalFollowers = snapshot.size;
    if (clientId) {
      isFollowing = snapshot.docs.some((entry) => entry.id === clientId);
    }
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("[blogService] getAuthorFollowerStats failed:", err);
    }
  }

  return { totalFollowers, isFollowing };
}

export async function setAuthorFollowStatus(clientId, shouldFollow) {
  if (!clientId) throw new Error("Missing client id.");
  const followerRef = doc(db, AUTHOR_FOLLOWERS_COLLECTION, clientId);

  if (shouldFollow) {
    await setDoc(followerRef, {
      following: true,
      updatedAt: serverTimestamp(),
      device: getDeviceInfo(),
    }, { merge: true });
  } else {
    await deleteDoc(followerRef);
  }

  return getAuthorFollowerStats(clientId);
}

const AUTHOR_RATINGS_COLLECTION = "authorRatings";

export async function getAuthorRatingSummary(clientId = "") {
  try {
    const snapshot = await getDocsFromServer(collection(db, AUTHOR_RATINGS_COLLECTION));
    const ratings = snapshot.docs
      .map((d) => Number(d.data()?.value))
      .filter((v) => v >= 1 && v <= 5);
    const userRating = clientId
      ? Number(snapshot.docs.find((d) => d.id === clientId)?.data()?.value) || 0
      : 0;
    return {
      count: ratings.length,
      total: ratings.reduce((sum, v) => sum + v, 0),
      userRating,
    };
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("[blogService] getAuthorRatingSummary failed:", err);
    }
    return { count: 0, total: 0, userRating: 0 };
  }
}

export async function setAuthorRating(clientId, value) {
  if (!clientId) throw new Error("Missing client id.");
  const rating = Math.max(1, Math.min(5, Number(value) || 0));
  if (!rating) throw new Error("Invalid rating value.");
  await setDoc(
    doc(db, AUTHOR_RATINGS_COLLECTION, clientId),
    { value: rating, updatedAt: serverTimestamp(), device: getDeviceInfo() },
    { merge: true }
  );
  return getAuthorRatingSummary(clientId);
}

export async function deleteComment(blogId, commentId) {
  const commentsRef = collection(db, BLOGS_COLLECTION, blogId, COMMENTS_SUBCOLLECTION);
  const snapshot = await getDocsFromServer(query(commentsRef));
  const comments = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));

  const idsToDelete = new Set([commentId]);
  let changed = true;
  while (changed) {
    changed = false;
    comments.forEach((comment) => {
      if (comment.parentId && idsToDelete.has(comment.parentId) && !idsToDelete.has(comment.id)) {
        idsToDelete.add(comment.id);
        changed = true;
      }
    });
  }

  if (idsToDelete.size === 0) return;

  const batch = writeBatch(db);
  idsToDelete.forEach((id) => {
    batch.delete(doc(db, BLOGS_COLLECTION, blogId, COMMENTS_SUBCOLLECTION, id));
  });

  const remainingCount = comments.filter((comment) => !idsToDelete.has(comment.id)).length;
  batch.update(doc(db, BLOGS_COLLECTION, blogId), {
    commentsCount: remainingCount,
    updatedAt: serverTimestamp(),
  });

  return batch.commit();
}

export async function getRecentComments(maxCount = 10) {
  // No orderBy — avoids collection-group index requirement; sort client-side.
  const q = query(
    collectionGroup(db, COMMENTS_SUBCOLLECTION),
    limit(50)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map((d) => ({
    id: d.id,
    blogId: d.ref.parent.parent?.id || null,
    ...d.data(),
  }));
  docs.sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return tb - ta;
  });
  return docs.slice(0, maxCount);
}

export async function getCommentsOverview() {
  const commentsRef = collectionGroup(db, COMMENTS_SUBCOLLECTION);
  const [countSnap, listSnap] = await Promise.all([
    getCountFromServer(commentsRef),
    getDocs(commentsRef),
  ]);

  const docs = listSnap.docs.map((d) => ({
    id: d.id,
    blogId: d.ref.parent.parent?.id || null,
    ...d.data(),
  }));

  docs.sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return tb - ta;
  });

  return {
    total: countSnap.data().count || 0,
    comments: docs,
  };
}

export function subscribeToCommentsOverview(callback, onError) {
  const commentsRef = collectionGroup(db, COMMENTS_SUBCOLLECTION);
  return onSnapshot(
    commentsRef,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        blogId: d.ref.parent.parent?.id || null,
        ...d.data(),
      }));
      docs.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tb - ta;
      });
      callback({
        total: docs.length,
        comments: docs,
      });
    },
    (err) => {
      console.error("subscribeToCommentsOverview error:", err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToRecentComments(callback, onError, maxCount = 10) {
  // No orderBy — avoids needing a collection-group descending index; sort client-side.
  const q = query(
    collectionGroup(db, COMMENTS_SUBCOLLECTION),
    limit(50)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        blogId: d.ref.parent.parent?.id || null,
        ...d.data(),
      }));
      docs.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tb - ta;
      });
      callback(docs.slice(0, maxCount));
    },
    (err) => {
      console.error("subscribeToRecentComments error:", err);
      if (onError) onError(err);
    }
  );
}

/* ── Categories ───────────────────────────────────────── */
const CATEGORIES_COLLECTION = "categories";

export async function getCategoryList() {
  const categoriesQuery = query(collection(db, CATEGORIES_COLLECTION), orderBy("name", "asc"));
  let categoriesSnap;
  try {
    categoriesSnap = await getDocsFromServer(categoriesQuery);
  } catch (err) {
    if (err?.code !== "permission-denied") {
      console.error("[blogService] getCategoryList failed:", err);
    }
    return [];
  }
  return categoriesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((category) => !category.systemDoc && category.id !== SETTINGS_FALLBACK_DOC);
}

export function subscribeToCategories(callback, onError) {
  const q = query(collection(db, CATEGORIES_COLLECTION), orderBy("name", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((category) => !category.systemDoc && category.id !== SETTINGS_FALLBACK_DOC));
    },
    (err) => {
      console.error("subscribeToCategories error:", err);
      if (onError) onError(err);
    }
  );
}

export async function getCategories() {
  const categoriesQuery = query(collection(db, CATEGORIES_COLLECTION), orderBy("name", "asc"));
  const blogsQuery = query(collection(db, BLOGS_COLLECTION));

  const [categoriesSnap, blogsSnap] = await Promise.all([
    getDocs(categoriesQuery),
    getDocs(blogsQuery),
  ]);

  const categories = categoriesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((category) => !category.systemDoc && category.id !== SETTINGS_FALLBACK_DOC);
  const counts = new Map(categories.map((c) => [c.id, 0]));
  const bySlug = new Map(categories.map((c) => [slugify(c.slug || c.name || ""), c.id]));
  const byName = new Map(categories.map((c) => [String(c.name || "").trim().toLowerCase(), c.id]));

  blogsSnap.docs.forEach((d) => {
    const data = d.data();
    const matchedIds = new Set();

    const idCandidates = [
      ...(Array.isArray(data.categoryIds) ? data.categoryIds : []),
      ...(data.categoryId ? [data.categoryId] : []),
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    idCandidates.forEach((id) => {
      if (counts.has(id)) matchedIds.add(id);
    });

    const nameLikeCandidates = [
      ...(Array.isArray(data.categories) ? data.categories : []),
      ...(typeof data.categories === "string" ? data.categories.split(",") : []),
      ...(Array.isArray(data.category) ? data.category : []),
      ...(typeof data.category === "string" ? data.category.split(",") : []),
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    nameLikeCandidates.forEach((value) => {
      const bySlugId = bySlug.get(slugify(value));
      if (bySlugId) matchedIds.add(bySlugId);
      const byNameId = byName.get(value.toLowerCase());
      if (byNameId) matchedIds.add(byNameId);
    });

    matchedIds.forEach((id) => {
      counts.set(id, (counts.get(id) || 0) + 1);
    });
  });

  return categories.map((c) => ({
    ...c,
    postCount: counts.get(c.id) || 0,
  }));
}

export async function createCategory({ name, slug, parentId, description }) {
  return addDoc(collection(db, CATEGORIES_COLLECTION), {
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    parentId: parentId || null,
    description: description?.trim() || "",
    postCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateCategory(id, { name, slug, parentId, description }) {
  return updateDoc(doc(db, CATEGORIES_COLLECTION, id), {
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    parentId: parentId || null,
    description: description?.trim() || "",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(id) {
  return deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
}

/* ── Tags ─────────────────────────────────────────────── */
const TAGS_COLLECTION = "tags";

export async function getTags() {
  const tagsQuery = query(collection(db, TAGS_COLLECTION), orderBy("name", "asc"));
  const blogsQuery = query(collection(db, BLOGS_COLLECTION));

  const [tagsSnap, blogsSnap] = await Promise.all([
    getDocs(tagsQuery),
    getDocs(blogsQuery),
  ]);

  const tags = tagsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const counts = new Map(tags.map((t) => [t.id, 0]));
  const idSet = new Set(tags.map((t) => t.id));
  const bySlug = new Map(tags.map((t) => [slugify(t.slug || t.name || ""), t.id]));
  const byName = new Map(tags.map((t) => [String(t.name || "").trim().toLowerCase(), t.id]));

  blogsSnap.docs.forEach((d) => {
    const data = d.data();
    const matchedIds = new Set();

    const idCandidates = [
      ...(Array.isArray(data.tagIds) ? data.tagIds : []),
      ...(data.tagId ? [data.tagId] : []),
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    idCandidates.forEach((id) => {
      if (idSet.has(id)) matchedIds.add(id);
    });

    const rawTags = [
      ...(Array.isArray(data.tags) ? data.tags : []),
      ...(typeof data.tags === "string" ? data.tags.split(",") : []),
    ];

    rawTags.forEach((raw) => {
      if (!raw) return;

      // Support string tags and object tags from legacy shapes.
      if (typeof raw === "object") {
        const rawId = String(raw.id || raw.tagId || "").trim();
        if (rawId && idSet.has(rawId)) matchedIds.add(rawId);

        const rawSlug = slugify(String(raw.slug || raw.name || "").trim());
        const bySlugId = bySlug.get(rawSlug);
        if (bySlugId) matchedIds.add(bySlugId);

        const rawName = String(raw.name || "").trim().toLowerCase();
        const byNameId = byName.get(rawName);
        if (byNameId) matchedIds.add(byNameId);
        return;
      }

      const value = String(raw).trim();
      if (!value) return;

      const bySlugId = bySlug.get(slugify(value));
      if (bySlugId) matchedIds.add(bySlugId);

      const byNameId = byName.get(value.toLowerCase());
      if (byNameId) matchedIds.add(byNameId);
    });

    matchedIds.forEach((id) => {
      counts.set(id, (counts.get(id) || 0) + 1);
    });
  });

  return tags.map((t) => ({
    ...t,
    postCount: counts.get(t.id) || 0,
  }));
}

export async function createTag(name) {
  return addDoc(collection(db, TAGS_COLLECTION), {
    name: name.trim(),
    slug: slugify(name),
    postCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateTag(id, { name, slug }) {
  return updateDoc(doc(db, TAGS_COLLECTION, id), {
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTag(id) {
  return deleteDoc(doc(db, TAGS_COLLECTION, id));
}
