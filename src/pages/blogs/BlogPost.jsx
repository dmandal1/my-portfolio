import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import php from "highlight.js/lib/languages/php";
import go from "highlight.js/lib/languages/go";
import ruby from "highlight.js/lib/languages/ruby";
import "highlight.js/styles/github-dark.css";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import TopButton from "../../components/topButton/TopButton";
import {
  getBlogBySlug,
  getComments,
  addComment,
  getAllPublishedBlogs,
  incrementViewCount,
  getCategoryList,
  getAuthorFollowerStats,
  setAuthorFollowStatus,
  getAuthorRatingSummary,
  setAuthorRating,

} from "../../api/apiService";
import { greeting as defaultGreeting, socialMediaLinks as defaultSocialLinks } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import authorPhoto from "../../assests/images/deepak_mandal.jpeg";
import BlogMaintenancePage from "./BlogMaintenancePage";
import useBlogMaintenanceSettings from "./useBlogMaintenanceSettings";
import "./BlogPost.css";
import { sanitizeRichHtml } from "../../shared/htmlSanitizer";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("php", php);
hljs.registerLanguage("go", go);
hljs.registerLanguage("ruby", ruby);

/* ── Content renderer ────────────────── */
function isHtmlContent(str) {
  return /<(div|p|br|b|i|strong|em|ul|ol|li|h[1-6]|img|a|span|table|blockquote|details|summary)\b/i.test(str || "");
}

function formatLanguageLabel(language) {
  const normalized = (language || "plaintext").toLowerCase();
  const labels = {
    plaintext: "Plain Text",
    javascript: "JavaScript",
    typescript: "TypeScript",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    python: "Python",
    java: "Java",
    php: "PHP",
    go: "Go",
    ruby: "Ruby",
  };
  return labels[normalized] || language || "Code";
}

function languageFromLabel(label) {
  const normalized = (label || "").trim().toLowerCase();
  const map = {
    "plain text": "plaintext",
    javascript: "javascript",
    typescript: "typescript",
    html: "html",
    css: "css",
    json: "json",
    python: "python",
    java: "java",
    php: "php",
    go: "go",
    ruby: "ruby",
  };
  return map[normalized] || "plaintext";
}

function languageFromCodeClass(className) {
  const match = String(className || "").match(/language-([a-z0-9-]+)/i);
  return match?.[1]?.toLowerCase() || "";
}

function toHighlightLang(languageId) {
  const map = {
    plaintext: "",
    javascript: "javascript",
    typescript: "typescript",
    html: "xml",
    css: "css",
    json: "json",
    python: "python",
    java: "java",
    php: "php",
    go: "go",
    ruby: "ruby",
  };
  return map[languageId] || "";
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightCode(codeText, languageId) {
  const code = String(codeText || "");
  const lang = toHighlightLang(languageId);
  if (!lang || !hljs.getLanguage(lang)) return escapeHtml(code);
  try {
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}

function getPublishedCodeText(codeNode) {
  if (!codeNode) return "";

  const renderedLines = codeNode.querySelectorAll?.(".bp-code-line-content");
  if (renderedLines && renderedLines.length > 0) {
    return Array.from(renderedLines)
      .map((line) => line.textContent || "")
      .join("\n")
      .replace(/\r\n/g, "\n");
  }

  return String(codeNode.textContent || "").replace(/\r\n/g, "\n");
}

function renderHighlightedCodeWithLines(codeText, languageId) {
  const normalized = String(codeText || "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  return lines.map((line) => {
    const lineHtml = line.length > 0 ? highlightCode(line, languageId) : "&nbsp;";
    return `<span class="bp-code-line"><span class="bp-code-line-content">${lineHtml}</span></span>`;
  }).join("");
}

function normalizeApiMethodName(value) {
  const method = String(value || "").trim().split(/\s+/)[0]?.toUpperCase() || "GET";
  return ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"].includes(method)
    ? method
    : "CUSTOM";
}

function syncApiMethodBadges(root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll(".awp-api-method").forEach((methodNode) => {
    const upperText = String(methodNode.textContent || "").toUpperCase();
    methodNode.textContent = upperText;
    methodNode.setAttribute("data-method", normalizeApiMethodName(upperText));
  });
}

function transformPublishedHtml(content) {
  if (!content) return "";
  if (!content.includes("awp-codeblock") && !content.includes("bp-codeblock") && !content.includes("awp-technical-block") && !content.includes("awp-terminal-remove") && !content.includes("awp-api-method") && !content.includes("awp-checklist") && !content.includes("awp-details-add") && !content.includes("awp-references-add") && !content.includes("awp-faq-add") && !content.includes("awp-troubleshooting-add") && !content.includes("awp-glossary-add") && !content.includes("awp-benchmark-add") && !content.includes("awp-environment-add") && !content.includes("awp-testing-add") && !content.includes("awp-prerequisites-add") && !content.includes("awp-steps-add")) return content;
  if (typeof document === "undefined") return content;

  const holder = document.createElement("div");
  holder.innerHTML = content;
  syncApiMethodBadges(holder);

  holder.querySelectorAll(".awp-technical-remove, .awp-terminal-remove, .awp-checklist-add, .awp-details-add, .awp-references-add, .awp-faq-add, .awp-troubleshooting-add, .awp-glossary-add, .awp-benchmark-add, .awp-environment-add, .awp-testing-add, .awp-prerequisites-add, .awp-steps-add").forEach((button) => {
    button.remove();
  });
  holder.querySelectorAll(".awp-checklist input[type='checkbox']").forEach((checkbox) => {
    checkbox.setAttribute("disabled", "disabled");
  });
  holder.querySelectorAll(".awp-technical-block").forEach((wrapper) => {
    while (wrapper.firstChild) {
      wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
    }
    wrapper.remove();
  });

  holder.querySelectorAll(".awp-codeblock").forEach((block) => {
    const languageFromAttr = block.getAttribute("data-code-language") || languageFromLabel(block.querySelector(".awp-codeblock-lang-label")?.textContent) || "plaintext";
    const languageLabel = block.querySelector(".awp-codeblock-lang-label")?.textContent?.trim()
      || formatLanguageLabel(languageFromAttr);
    const codeText = block.querySelector(".awp-codeblock-code")?.textContent || "";

    const figure = document.createElement("figure");
    figure.className = "bp-codeblock";
    figure.setAttribute("data-code-language", languageFromAttr);

    const caption = document.createElement("figcaption");
    caption.className = "bp-codeblock-label";

    const leftNode = document.createElement("span");
    leftNode.className = "bp-codeblock-header-left";

    const macControls = document.createElement("span");
    macControls.className = "bp-codeblock-mac-controls";

    const dotRed = document.createElement("span");
    dotRed.className = "bp-codeblock-mac-dot bp-codeblock-mac-dot--red";
    const dotYellow = document.createElement("span");
    dotYellow.className = "bp-codeblock-mac-dot bp-codeblock-mac-dot--yellow";
    const dotGreen = document.createElement("span");
    dotGreen.className = "bp-codeblock-mac-dot bp-codeblock-mac-dot--green";
    macControls.appendChild(dotRed);
    macControls.appendChild(dotYellow);
    macControls.appendChild(dotGreen);

    const langNode = document.createElement("span");
    langNode.className = "bp-codeblock-lang";
    langNode.textContent = languageLabel;
    leftNode.appendChild(macControls);
    leftNode.appendChild(langNode);

    const actionsNode = document.createElement("span");
    actionsNode.className = "bp-codeblock-actions";

    const copyNode = document.createElement("span");
    copyNode.className = "bp-codeblock-copy";
    copyNode.textContent = "Copy";
    actionsNode.appendChild(copyNode);
    caption.appendChild(leftNode);
    caption.appendChild(actionsNode);

    const pre = document.createElement("pre");
    pre.className = "bp-codeblock-pre";

    const code = document.createElement("code");
    code.className = `bp-codeblock-code language-${languageFromAttr}`;
    code.innerHTML = renderHighlightedCodeWithLines(codeText, languageFromAttr);

    pre.appendChild(code);
    figure.appendChild(caption);
    figure.appendChild(pre);
    block.replaceWith(figure);
  });

  holder.querySelectorAll(".bp-codeblock").forEach((block) => {
    const caption = block.querySelector(".bp-codeblock-label");
    if (caption) {
      const labelTextRaw = caption.querySelector(".bp-codeblock-lang")?.textContent?.trim()
        || caption.querySelector(".bp-codeblock-lang-btn")?.textContent?.trim()
        || caption.textContent?.trim()
        || "Plain Text";
      const normalizedLabel = formatLanguageLabel(languageFromLabel(labelTextRaw));
      caption.innerHTML = "";

      const leftNode = document.createElement("span");
      leftNode.className = "bp-codeblock-header-left";

      const macControls = document.createElement("span");
      macControls.className = "bp-codeblock-mac-controls";

      const dotRed = document.createElement("span");
      dotRed.className = "bp-codeblock-mac-dot bp-codeblock-mac-dot--red";
      const dotYellow = document.createElement("span");
      dotYellow.className = "bp-codeblock-mac-dot bp-codeblock-mac-dot--yellow";
      const dotGreen = document.createElement("span");
      dotGreen.className = "bp-codeblock-mac-dot bp-codeblock-mac-dot--green";
      macControls.appendChild(dotRed);
      macControls.appendChild(dotYellow);
      macControls.appendChild(dotGreen);

      const langNode = document.createElement("span");
      langNode.className = "bp-codeblock-lang";
      langNode.textContent = normalizedLabel;
      leftNode.appendChild(macControls);
      leftNode.appendChild(langNode);

      const actionsNode = document.createElement("span");
      actionsNode.className = "bp-codeblock-actions";

      const copyNode = document.createElement("span");
      copyNode.className = "bp-codeblock-copy";
      copyNode.textContent = "Copy";

      actionsNode.appendChild(copyNode);
      caption.appendChild(leftNode);
      caption.appendChild(actionsNode);
    }

    const languageFromAttr = block.getAttribute("data-code-language") || "";
    const languageFromClass = languageFromCodeClass(block.querySelector(".bp-codeblock-code")?.className);
    const languageFromLangNode = block.querySelector(".bp-codeblock-lang")?.textContent?.trim()
      || block.querySelector(".bp-codeblock-lang-btn")?.textContent?.trim();
    const languageId = languageFromAttr
      || languageFromClass
      || languageFromLabel(languageFromLangNode)
      || "plaintext";

    block.setAttribute("data-code-language", languageId);
    const langNode = block.querySelector(".bp-codeblock-lang") || block.querySelector(".bp-codeblock-lang-btn");
    if (langNode) langNode.textContent = formatLanguageLabel(languageId);

    const code = block.querySelector(".bp-codeblock-code");
    if (!code) return;
    const text = getPublishedCodeText(code);
    code.className = `bp-codeblock-code language-${languageId}`;
    code.innerHTML = renderHighlightedCodeWithLines(text, languageId);

    const footer = block.querySelector(".bp-codeblock-footer");
    if (footer) footer.remove();
  });

  return holder.innerHTML;
}

function PostBody({ content }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const copyWithFallback = async (text) => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    };

    const handleCopy = async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const terminalCopyBtn = target?.closest(".awp-terminal-copy");
      if (terminalCopyBtn && root.contains(terminalCopyBtn)) {
        const terminal = terminalCopyBtn.closest(".awp-terminal");
        const text = terminal?.querySelector("pre")?.textContent || "";
        if (!text.trim()) return;

        try {
          await copyWithFallback(text);
          terminalCopyBtn.textContent = "Copied";
          setTimeout(() => {
            terminalCopyBtn.innerHTML = '<i class="far fa-copy" aria-hidden="true"></i> Copy';
          }, 1200);
        } catch {
          // ignore copy failures silently
        }
        return;
      }

      const copyBtn = target?.closest(".bp-codeblock-copy");
      if (!copyBtn || !root.contains(copyBtn)) return;
      const block = copyBtn.closest(".bp-codeblock");
      const codeNode = block?.querySelector(".bp-codeblock-code");
      const codeText = getPublishedCodeText(codeNode);
      if (!codeText) return;

      try {
        await copyWithFallback(codeText);
        const old = copyBtn.textContent;
        copyBtn.textContent = "Copied";
        setTimeout(() => {
          copyBtn.textContent = old || "Copy";
        }, 1200);
      } catch {
        // ignore copy failures silently
      }
    };

    root.addEventListener("click", handleCopy);
    return () => root.removeEventListener("click", handleCopy);
  }, [content]);

  if (!content) return null;

  if (isHtmlContent(content)) {
    const clean = sanitizeRichHtml(transformPublishedHtml(content), { mode: "public" });
    return (
      <div
        ref={bodyRef}
        className="bp-body bp-body--html"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return (
    <div className="bp-body" ref={bodyRef}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

/* ── Helpers ──────────────────────────── */
function formatDate(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function readingTime(content) {
  if (!content) return "1 min read";
  const words = content.replace(/[#*_`~[\]()>!-]/g, "").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function avatarInitials(name) {
  return (name || "?").trim().split(" ").map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

function avatarColor(name) {
  const palette = ["#1565C0","#0D47A1","#1976D2","#1E88E5","#0277BD","#283593","#3949AB","#42A5F5"];
  let hash = 0;
  for (const c of (name || "?")) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function getDeviceFingerprint() {
  if (typeof window === "undefined") return "";
  const storageKey = "bp_device_fp";
  try {
    const cached = window.localStorage.getItem(storageKey);
    if (cached && /^[0-9a-f]{32}$/.test(cached)) return cached;
  } catch { /* ignore */ }

  try {
    const nav = window.navigator || {};
    const scr = window.screen || {};
    const signals = [
      nav.userAgent || "",
      nav.language || "",
      (nav.languages || []).join(","),
      String(scr.width || 0),
      String(scr.height || 0),
      String(scr.colorDepth || 0),
      String(window.devicePixelRatio || 1),
      String(nav.hardwareConcurrency || 0),
      String(nav.deviceMemory || 0),
      nav.platform || nav.userAgentData?.platform || "",
      (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })(),
      (() => { try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch { return ""; } })(),
    ];
    const raw = signals.join("|");
    // four independent hashes over rotated strings for 128-bit spread
    const fp = [
      hashString(raw),
      hashString(raw.split("").reverse().join("")),
      hashString(raw.slice(Math.floor(raw.length / 3))),
      hashString(raw.slice(0, Math.ceil((raw.length * 2) / 3))),
    ].join("");
    try { window.localStorage.setItem("bp_device_fp", fp); } catch { /* ignore */ }
    return fp;
  } catch {
    return "";
  }
}



/* ── Reading Progress ─────────────────── */
function ReadingProgress({ articleRef }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    function update() {
      const el = articleRef.current;
      if (!el) return;
      const scrolled = window.scrollY - el.offsetTop + window.innerHeight * 0.15;
      setPct(Math.min(100, Math.max(0, (scrolled / el.offsetHeight) * 100)));
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [articleRef]);

  return (
    <div className="bp-progress-track" aria-hidden="true">
      <div className="bp-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Star Rating ──────────────────────── */
function StarRating({ rating = 0, count = 0, interactive = false, userRating = 0, onRate }) {
  const roundedRating = Math.round(Number(rating) || 0);
  return (
    <span className="bp-stars-wrap" aria-label={`${rating || 0} out of 5 stars`}>
      <span className="bp-stars">
        {[1, 2, 3, 4, 5].map((s) => (
          interactive ? (
            <button
              key={s}
              type="button"
              className={`bp-star-btn${s <= userRating ? " is-active" : ""}`}
              onClick={() => onRate?.(s)}
              aria-label={`Rate ${s} star${s === 1 ? "" : "s"}`}
            >
              <i className={s <= userRating ? "fas fa-star" : "far fa-star"} />
            </button>
          ) : (
            <i
              key={s}
              className={s <= roundedRating ? "fas fa-star" : "far fa-star"}
            />
          )
        ))}
      </span>
      {count > 0 && <span className="bp-stars-count">({count} ratings)</span>}
    </span>
  );
}

/* ── Social Share ─────────────────────── */
function SocialShare({ title }) {
  const url = typeof window === "undefined" ? "" : window.location.href;
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title || "");

  const platforms = [
    {
      label: "Facebook",
      icon: "fab fa-facebook-f",
      color: "#1877F2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    },
    {
      label: "Twitter",
      icon: "fab fa-twitter",
      color: "#1DA1F2",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encoded}`,
    },
    {
      label: "LinkedIn",
      icon: "fab fa-linkedin-in",
      color: "#0A66C2",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    },
    {
      label: "WhatsApp",
      icon: "fab fa-whatsapp",
      color: "#25D366",
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encoded}`,
    },
  ];

  return (
    <div className="bp-share">
      <span className="bp-share-label">Share:</span>
      {platforms.map((p) => (
        <a
          key={p.label}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          className="bp-share-btn"
          style={{ "--share-color": p.color }}
          aria-label={`Share on ${p.label}`}
        >
          <i className={p.icon} />
        </a>
      ))}
    </div>
  );
}

/* ── Comment Form ─────────────────────── */
function CommentForm({ blogId, onAdded }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) { setError("Name and message are required."); return; }
    setError("");
    setSubmitting(true);
    try {
      await addComment(blogId, { name, message });
      setName(""); setMessage("");
      setSuccess(true);
      onAdded();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err?.message || "Failed to post comment. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <form className="bp-comment-form" onSubmit={handleSubmit}>
      <h4 className="bp-comment-form-title">Leave a comment</h4>
      {error   && <div className="bp-comment-error"   role="alert">{error}</div>}
      {success && <div className="bp-comment-success" role="status">✓ Comment posted! Thank you.</div>}
      <div className="bp-cf-row">
        <div className="bp-cf-field">
          <label htmlFor="bp-cf-name">Your Name</label>
          <input id="bp-cf-name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Doe" maxLength={60} autoComplete="name" />
        </div>
      </div>
      <div className="bp-cf-field">
        <label htmlFor="bp-cf-msg">Message</label>
        <textarea id="bp-cf-msg" value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Share your thoughts…" rows={4} maxLength={1000} />
        <span className="bp-cf-count">{message.length} / 1000</span>
      </div>
      <button type="submit" className="bp-cf-submit" disabled={submitting}>
        {submitting ? <><span className="bp-spin" aria-hidden="true" /> Posting…</> : "Post Comment"}
      </button>
    </form>
  );
}

/* ── Comment Item ─────────────────────── */
function CommentItem({ comment, replies = [] }) {
  const initials = avatarInitials(comment.name);
  const color    = avatarColor(comment.name);
  const date = comment.createdAt
    ? (comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt))
        .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  function formatDate(ts) {
    if (!ts) return "";
    return (ts.toDate ? ts.toDate() : new Date(ts))
      .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="bp-comment-item">
      <div className="bp-comment-avatar" style={{ background: color }}>{initials}</div>
      <div className="bp-comment-content">
        <div className="bp-comment-header">
          <span className="bp-comment-name">{comment.name}</span>
          <span className="bp-comment-verb">commented</span>
          {date && <span className="bp-comment-date">{date}</span>}
        </div>
        <p className="bp-comment-message">{comment.message}</p>

        {replies.length > 0 && (
          <div className="bp-replies">
            {replies.map((r) => (
              <div key={r.id} className="bp-reply-item">
                {r.isAuthorReply ? (
                  <img src={authorPhoto} alt={r.name} className="bp-reply-author-photo" />
                ) : (
                  <div className="bp-comment-avatar bp-comment-avatar--reply" style={{ background: avatarColor(r.name) }}>
                    {avatarInitials(r.name)}
                  </div>
                )}
                <div className="bp-comment-content">
                  <div className="bp-comment-header">
                    <span className="bp-comment-name">{r.name}</span>
                    {r.isAuthorReply && <span className="bp-author-tag">Author</span>}
                    {r.createdAt && <span className="bp-comment-date">{formatDate(r.createdAt)}</span>}
                  </div>
                  <p className="bp-comment-message">{r.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sidebar: About Author ────────────── */
function AboutAuthor({ totalPosts = 0, authorName = "", authorRole = "", authorBio = "" }) {
  const clientId = useMemo(() => getDeviceFingerprint(), []);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followAnim, setFollowAnim] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingAverage, setRatingAverage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthorCardData() {
      const [followStats, ratingSummary] = await Promise.all([
        getAuthorFollowerStats(clientId),
        getAuthorRatingSummary(clientId),
      ]);
      if (cancelled) return;

      setFollowersCount(Number(followStats?.totalFollowers) || 0);
      setIsFollowing(Boolean(followStats?.isFollowing));
      setUserRating(Number(ratingSummary?.userRating) || 0);
      setRatingCount(Number(ratingSummary?.count) || 0);
      setRatingAverage(ratingSummary?.count > 0 ? ratingSummary.total / ratingSummary.count : 0);
    }

    loadAuthorCardData();
    return () => { cancelled = true; };
  }, [clientId]);

  async function handleFollow() {
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowAnim(true);
    setFollowersCount((current) => Math.max(0, current + (next ? 1 : -1)));
    try {
      const result = await setAuthorFollowStatus(clientId, next);
      setFollowersCount(Number(result?.totalFollowers) || 0);
      setIsFollowing(Boolean(result?.isFollowing));
    } catch {
      setIsFollowing(!next);
      setFollowersCount((current) => Math.max(0, current + (next ? -1 : 1)));
    }
    setTimeout(() => setFollowAnim(false), 400);
  }

  async function handleRate(nextRating) {
    try {
      const summary = await setAuthorRating(clientId, nextRating);
      setUserRating(nextRating);
      setRatingCount(Number(summary?.count) || 0);
      setRatingAverage(summary?.count > 0 ? summary.total / summary.count : 0);
    } catch (err) {
      console.error("[rating] setAuthorRating failed:", err?.code, err?.message);
    }
  }

  const portfolioData = usePortfolioData();
  const profile = portfolioData?.profile || defaultGreeting;
  const sharePlatforms = (portfolioData?.socialLinks || defaultSocialLinks).slice(0, 5);

  return (
    <div className="bp-author-card-v2">
      {/* gradient banner */}
      <div className="bp-author-banner" aria-hidden="true" />

      {/* avatar ring */}
      <div className="bp-author-avatar-ring">
        <img
          src={profile.authorImage || authorPhoto}
          alt={authorName || profile.logo_name}
          className="bp-author-avatar-photo"
          onError={(e) => { e.target.src = authorPhoto; }}
        />
      </div>

        <div className="bp-author-body-v2">
        <div className="bp-author-name-lg">{authorName || profile.logo_name}</div>
        <div className="bp-author-role-badge">
          <i className="fas fa-code" /> {authorRole || profile.job_profile || "Developer"}
        </div>

        {(authorBio || profile.subTitle) && (
          <p className="bp-author-bio">{authorBio || profile.subTitle}</p>
        )}

        {/* stats row */}
        <div className="bp-author-stats">
          <div className="bp-author-stat">
            <strong>{totalPosts || "—"}</strong>
            <span>Posts</span>
          </div>
          <div className="bp-author-stat-divider" />
          <div className="bp-author-stat">
            <strong>{followersCount > 0 ? followersCount.toLocaleString("en-IN") : "0"}</strong>
            <span>Followers</span>
          </div>
          <div className="bp-author-stat-divider" />
          <div className="bp-author-stat">
            <strong>{ratingCount > 0 ? `${ratingAverage.toFixed(1)} ★` : "—"}</strong>
            <span>Rating</span>
          </div>
        </div>

        <div className="bp-author-rating-live">
          <StarRating
            rating={ratingAverage}
            count={ratingCount}
            interactive
            userRating={userRating}
            onRate={handleRate}
          />
        </div>

        {/* social icons */}
        {sharePlatforms.length > 0 && (
          <div className="bp-author-socials">
            {sharePlatforms.map((s) => (
              <a
                key={s.name}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bp-author-social-btn"
                style={{ "--s-color": s.backgroundColor || "#1565c0" }}
                aria-label={s.name}
              >
                <i className={`fab fa-${s.fontAwesomeIcon?.replace("fa-", "") || "globe"}`} />
              </a>
            ))}
          </div>
        )}

        {/* follow button */}
        <button
          type="button"
          className={`bp-author-follow-btn${isFollowing ? " is-following" : ""}${followAnim ? " bp-follow-anim" : ""}`}
          onClick={handleFollow}
          aria-pressed={isFollowing}
        >
          {isFollowing ? (
            <><i className="fas fa-check" /> Following</>
          ) : (
            <><i className="fas fa-plus" /> Follow</>
          )}
        </button>
      </div>
    </div>
  );
}

function getBlogCategoryNames(blog, categoryById) {
  const fromIds = (Array.isArray(blog.categoryIds) ? blog.categoryIds : [])
    .map((id) => categoryById.get(id)?.name)
    .filter(Boolean);
  if (fromIds.length > 0) return fromIds;
  return (blog.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
}

/* ── Sidebar: Categories ──────────────── */
function SidebarCategories({ blogs, allCategories, limit = 6 }) {
  const sidebarCategories = useMemo(() => {
    const counts = new Map();
    const categoryById = new Map(allCategories.map((category) => [category.id, category]));
    blogs.forEach((blog) => {
      getBlogCategoryNames(blog, categoryById).forEach((categoryName) => {
        counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
      });
    });
    return [
      { name: "All", count: blogs.length },
      ...Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    ];
  }, [blogs, allCategories]);

  return (
    <div className="bp-widget">
      <h3 className="bp-widget-title">Categories</h3>
      <div className="bp-sidebar-category-list">
        {sidebarCategories.slice(0, limit).map((c) => {
          const to = c.name === "All"
            ? "/blogs"
            : { pathname: "/blogs", search: `?category=${encodeURIComponent(c.name)}` };
          return (
            <Link
              key={c.name}
              to={to}
              className="bp-sidebar-category-item"
            >
              <span>{c.name}</span>
              <strong>{c.count}</strong>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sidebar: Stats ───────────────────── */
function SidebarStats({ views, commentsCount, commentSort, onSortChange }) {
  const isNewest = commentSort !== "oldest";
  return (
    <div className="bp-widget bp-widget--stats">
      <div className="bp-stats-top">
        <span className="bp-stats-comment-count">{commentsCount} Comments</span>
        <button
          type="button"
          className="bp-stats-sort-label bp-stats-sort-btn"
          onClick={() => onSortChange(isNewest ? "oldest" : "newest")}
          title={`Currently: ${isNewest ? "Newest first" : "Oldest first"} — click to toggle`}
        >
          <i className={`fas fa-sort-amount-${isNewest ? "down" : "up"}`} />
          {isNewest ? "Newest" : "Oldest"}
        </button>
      </div>
      <div className="bp-stat-row">
        <span className="bp-stat-label">Total Views</span>
        <div className="bp-stat-val">
          <strong>{Number(views).toLocaleString("en-IN")}</strong>
          <i className="fas fa-info-circle bp-stat-info" />
        </div>
      </div>
      <div className="bp-stat-row">
        <span className="bp-stat-label">Total Comments</span>
        <div className="bp-stat-val">
          <strong>{commentsCount}</strong>
          <i className="fas fa-info-circle bp-stat-info" />
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar: Search ──────────────────── */
function SidebarSearch() {
  const [query, setQuery] = useState("");
  return (
    <div className="bp-widget bp-widget--search">
      <div className="bp-search-box">
        <input
          id="bp-sidebar-search"
          name="bpSidebarSearch"
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bp-search-input"
          autoComplete="off"
        />
        <button type="button" className="bp-search-btn" aria-label="Search">
          <i className="fas fa-search" />
        </button>
      </div>
    </div>
  );
}

/* ── Sidebar: Recent Posts ────────────── */
function SidebarRecentPosts({ posts }) {
  return (
    <div className="bp-widget">
      <h3 className="bp-widget-title">Recent Posts</h3>
      <div className="bp-sidebar-recent-list">
        {posts.map((p) => {
          const href = p.slug ? `/blogs/${p.slug}` : p.externalUrl || "#";
          const LinkEl = p.slug ? Link : "a";
          const extraProps = p.slug ? { to: href } : { href, target: "_blank", rel: "noopener noreferrer" };
          return (
            <LinkEl key={p.id} className="bp-sidebar-recent-item" {...extraProps}>
              <div className="bp-sidebar-recent-thumb">
                {p.image ? <img src={p.image} alt={p.title} /> : <span>✍️</span>}
              </div>
              <div className="bp-sidebar-recent-info">
                <span className="bp-sidebar-recent-title">{p.title}</span>
                <span className="bp-sidebar-recent-date">{formatDateShort(p.createdAt)}</span>
              </div>
            </LinkEl>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   Main Component
   ══════════════════════════════════════ */
export default function BlogPost({ theme }) {
  const maintenance = useBlogMaintenanceSettings();
  const location = useLocation();
  const { slug } = useParams();
  const [blog, setBlog]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [comments, setComments]   = useState([]);
  const [cLoading, setCLoading]   = useState(false);
  const [commentSort, setCommentSort] = useState("newest");
  const [allBlogs, setAllBlogs]   = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const articleRef  = useRef(null);
  const commentsRef = useRef(null);

  // If navigation came from the blog list we can prefetch the cover image before the
  // Firestore fetch completes. This improves perceived performance on slow networks.
  const navPrefetchImage = location?.state?.prefetchImage || "";

  async function loadComments(blogId, mounted = true) {
    try {
      const fetchedComments = await getComments(blogId);
      if (!mounted) return;
      setComments(fetchedComments || []);
    } catch {
      if (!mounted) return;
      setComments([]);
    }
  }
  const navPrefetchTitle = location?.state?.prefetchTitle || "";

  // ── Bookmark ──────────────────────────────────────────────────
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkAnim, setBookmarkAnim] = useState(false);

  // ── Share dropdown ────────────────────────────────────────────
  const [shareOpen, setShareOpen]   = useState(false);
  const [copyDone, setCopyDone]     = useState(false);
  const shareRef = useRef(null);

  // ── TOC (Table of Contents) ───────────────────────────────────
  const [tocOpen, setTocOpen]   = useState(false);
  const [tocItems, setTocItems] = useState([]);
  const tocRef = useRef(null);

  // ── Image gallery / lightbox ──────────────────────────────────
  const [galleryOpen, setGalleryOpen]   = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // ── More menu ─────────────────────────────────────────────────
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  function retryLoad() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    if (maintenance.enabled) {
      setLoading(false);
      return undefined;
    }
    let mounted = true;
    setLoading(true); setNotFound(false); setLoadError(""); setComments([]);
    setHeroLoaded(false);

    class TimeoutError extends Error {
      constructor(message = "Request timed out") {
        super(message);
        this.name = "TimeoutError";
      }
    }

    function withTimeout(promise, ms) {
      let timeoutId = null;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new TimeoutError()), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
    }

    async function load() {
      try {
        const data = await withTimeout(getBlogBySlug(slug), 15000);
        if (!mounted) return;
        if (!data) { setNotFound(true); return; }
        setBlog(data);
        // Render the article ASAP; load sidebar lists in the background.
        getAllPublishedBlogs()
          .then((blogs) => { if (mounted) setAllBlogs(blogs || []); })
          .catch(() => { if (mounted) setAllBlogs([]); });
        getCategoryList()
          .then((categories) => { if (mounted) setAllCategories(categories || []); })
          .catch(() => { if (mounted) setAllCategories([]); });

        // ── Track view once per browser session per post ──────────
        const sessionKey = `viewed:${data.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          incrementViewCount(data.id)
            .then(() => {
              // Optimistically update local count so the reader sees the
              // incremented number immediately without a second fetch.
              if (mounted) {
                setBlog((prev) => prev ? { ...prev, views: (prev.views ?? 0) + 1 } : prev);
              }
            })
            .catch(() => {}); // non-critical — silently ignore errors
        }

        setCLoading(true);
        try {
          await loadComments(data.id, mounted);
        } catch { if (mounted) { setComments([]); } }
        finally { if (mounted) setCLoading(false); }
      } catch (err) {
        if (!mounted) return;
        if (err?.name === "TimeoutError") {
          setLoadError("This article is taking longer than usual to load. Please check your connection and try again.");
          return;
        }
        setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [slug, maintenance.enabled, reloadToken]);

  function reloadComments() {
    if (!blog?.id) return;
    loadComments(blog.id);
  }

  // ── Bookmark: init from localStorage when blog loads ──────────
  useEffect(() => {
    if (!blog?.id) return;
    const saved = JSON.parse(localStorage.getItem("bp_bookmarks") || "[]");
    setIsBookmarked(saved.includes(blog.id));
  }, [blog?.id]);

  // ── TOC + gallery: extract from rendered article ──────────────
  useEffect(() => {
    if (!blog || !articleRef.current) return;
    // small delay so DOM has painted
    const t = setTimeout(() => {
      const root = articleRef.current;
      if (!root) return;
      // headings
      const headings = Array.from(root.querySelectorAll(".bp-body h2, .bp-body h3, .bp-body h4"));
      headings.forEach((h, i) => { if (!h.id) h.id = `toc-${i}`; });
      setTocItems(headings.map((h) => ({ id: h.id, text: h.textContent.trim(), level: parseInt(h.tagName[1]) })));
      // images
      const imgs = Array.from(root.querySelectorAll(".bp-body img")).filter((img) => img.src);
      setGalleryImages(imgs.map((img) => ({ src: img.src, alt: img.alt || "" })));
    }, 120);
    return () => clearTimeout(t);
  }, [blog]);

  // ── Outside-click: share, TOC, more dropdowns ─────────────────
  useEffect(() => {
    function handler(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
      if (tocRef.current   && !tocRef.current.contains(e.target))   setTocOpen(false);
      if (moreRef.current  && !moreRef.current.contains(e.target))  setMoreOpen(false);
    }
    if (shareOpen || tocOpen || moreOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [shareOpen, tocOpen, moreOpen]);

  // ── Keyboard: close gallery on Escape, arrow keys ────────────
  useEffect(() => {
    if (!galleryOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setGalleryOpen(false);
      if (e.key === "ArrowRight") setGalleryIndex((i) => Math.min(i + 1, galleryImages.length - 1));
      if (e.key === "ArrowLeft")  setGalleryIndex((i) => Math.max(i - 1, 0));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [galleryOpen, galleryImages.length]);

  // ── Handlers ──────────────────────────────────────────────────
  function scrollToComments() {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleBookmark() {
    if (!blog?.id) return;
    const saved = JSON.parse(localStorage.getItem("bp_bookmarks") || "[]");
    const next = isBookmarked
      ? saved.filter((id) => id !== blog.id)
      : [...saved, blog.id];
    localStorage.setItem("bp_bookmarks", JSON.stringify(next));
    setIsBookmarked(!isBookmarked);
    setBookmarkAnim(true);
    setTimeout(() => setBookmarkAnim(false), 600);
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: blog?.title || "", url }); return; } catch { /* user cancelled */ }
    }
    setShareOpen((v) => !v);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch { /* ignore */ }
    setMoreOpen(false);
  }

  const themeVars = {
    "--bp-accent":   theme?.imageHighlight  || theme?.gradientStart || "#1565C0",
    "--bp-accent2":  theme?.gradientEnd     || "#42A5F5",
    "--bp-text":     theme?.text            || "#0A1628",
    "--bp-muted":    theme?.secondaryText   || "#4A6FA5",
    "--bp-soft":     theme?.compImgHighlight || "#E3F2FD",
    "--bp-border":   theme?.cardBorder      || "#BBDEFB",
    "--bp-bg":       theme?.body            || "#F0F8FF",
    "--bp-gradient": `linear-gradient(135deg, ${theme?.gradientStart || "#1565C0"} 0%, ${theme?.gradientEnd || "#42A5F5"} 100%)`,
  };

  if (maintenance.enabled) {
    return (
      <div style={themeVars}>
        <Header theme={theme} />
        <BlogMaintenancePage settings={maintenance.settings} theme={theme} />
        <Footer theme={theme} />
        <TopButton theme={theme} />
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) return (
    <div style={themeVars}>
      <Helmet>
        {navPrefetchImage && (
          <link
            rel="preload"
            as="image"
            href={navPrefetchImage}
            fetchpriority="high"
          />
        )}
      </Helmet>
      <Header theme={theme} />
      <div className="bp-page">
        <div className="bp-loading">
          <div className="bp-loading-spinner" />
          <p>Loading article…</p>
        </div>
      </div>
      <Footer theme={theme} />
    </div>
  );

  /* ── Error ── */
  if (loadError) return (
    <div style={themeVars}>
      <Header theme={theme} />
      <div className="bp-page">
        <div className="bp-not-found">
          <div className="bp-not-found-code">!</div>
          <h2>Could not load article</h2>
          <p>{loadError}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" className="bp-back-btn" onClick={retryLoad}>Retry</button>
            <Link to="/blogs" className="bp-back-btn">← Back to Blog</Link>
          </div>
        </div>
      </div>
      <Footer theme={theme} />
    </div>
  );

  /* ── 404 ── */
  if (notFound) return (
    <div style={themeVars}>
      <Header theme={theme} />
      <div className="bp-page">
        <div className="bp-not-found">
          <div className="bp-not-found-code">404</div>
          <h2>Post not found</h2>
          <p>The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blogs" className="bp-back-btn">← Back to Blog</Link>
        </div>
      </div>
      <Footer theme={theme} />
    </div>
  );

  const tags      = blog.tags ? blog.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const views     = blog.views ?? 0;
  const postRecentLimit = Number(maintenance.settings.publicBlogPostRecentCount) || 6;
  const categoryLimit = Number(maintenance.settings.publicBlogCategoryCount) || 6;
  const recentPosts = allBlogs.filter((b) => b.id !== blog.id).slice(0, postRecentLimit);
const portfolioCtx = usePortfolioData();
  const profileData = portfolioCtx?.profile || defaultGreeting;
  const authorName  = blog.author || profileData.logo_name || "Deepak Mandal";
  const metaTitle = blog.metaTitle || blog.title;
  const metaDescription = blog.metaDescription || blog.excerpt || blog.subtitle || `${blog.title} by ${authorName}`;
	  const leadText = blog.subtitle || blog.excerpt || blog.metaDescription || "";
	  const canonicalUrl = blog.canonicalUrl || (typeof window !== "undefined" ? window.location.href : "");
	  const commentsEnabled = maintenance.settings.publicBlogCommentsEnabled !== false && blog.allowComments !== false;
  const coverUrl = blog.image || navPrefetchImage || "";
  const coverAlt = blog.imageAlt || blog.title || navPrefetchTitle || "Blog cover";
  const visibleCommentIds = new Set(comments.map((comment) => comment.id));
  const visibleCommentsCount = comments.filter((comment) => !comment.parentId || visibleCommentIds.has(comment.parentId)).length;

  return (
	    <div className="bp-root" style={themeVars}>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
	        <meta property="og:title" content={metaTitle} />
	        <meta property="og:description" content={metaDescription} />
	        <meta property="og:type" content="article" />
	        {coverUrl && <meta property="og:image" content={coverUrl} />}
	        <meta name="twitter:card" content={coverUrl ? "summary_large_image" : "summary"} />
	        <meta name="twitter:title" content={metaTitle} />
	        <meta name="twitter:description" content={metaDescription} />
	        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
		        {coverUrl && (
		          <link
		            rel="preload"
		            as="image"
		            href={coverUrl}
		            fetchpriority="high"
		          />
		        )}
	      </Helmet>
      <Header theme={theme} />
      <ReadingProgress articleRef={articleRef} />

      <main className="bp-page">
        {/* ── Breadcrumb ── */}
        <div className="bp-pagehead">
          <nav className="bp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span className="bp-bc-sep">/</span>
            <Link to="/blogs">Blog Posts</Link>
            <span className="bp-bc-sep">/</span>
            <span className="bp-bc-current">{blog.title}</span>
          </nav>
        </div>

        {/* ── Two-column layout ── */}
        <div className="bp-layout">

          {/* ── Article ── */}
          <article className="bp-article" ref={articleRef}>

	            {/* Hero image */}
	            {coverUrl && (
	              <div className={`bp-hero${heroLoaded ? " is-loaded" : ""}`}>
		                <img
		                  src={coverUrl}
		                  alt={coverAlt}
		                  className="bp-hero-img"
		                  loading="eager"
		                  fetchPriority="high"
		                  decoding="async"
		                  onLoad={() => setHeroLoaded(true)}
		                  onError={() => setHeroLoaded(true)}
		                />
	              </div>
	            )}

            {/* Title */}
            <h1 className="bp-title">{blog.title}</h1>

            {/* Meta row */}
            <div className="bp-meta-row">
              <div className="bp-meta-left">
                <div className="bp-meta-author">
                  <div className="bp-meta-avatar">{avatarInitials(authorName)}</div>
                  <span className="bp-meta-name">{authorName}</span>
                </div>
                <span className="bp-meta-sep">•</span>
                <span className="bp-meta-date">{formatDate(blog.createdAt)}</span>
                <span className="bp-meta-sep">•</span>
                <span className="bp-meta-read">
                  <i className="far fa-clock" /> {readingTime(blog.content)}
                </span>
                <span className="bp-meta-sep">•</span>
                <button
                  type="button"
                  className="bp-meta-comments-count bp-meta-comments-count--btn"
                  onClick={scrollToComments}
                  title="Jump to comments"
                >
                  <i className="far fa-comment" /> {visibleCommentsCount}
                </button>
                <span className="bp-meta-sep">•</span>
                <span className="bp-meta-views">
                  <i className="fas fa-eye" /> {Number(views).toLocaleString("en-IN")} views
                </span>
              </div>
              <div className="bp-meta-right">
                {/* Bookmark */}
                <button
                  type="button"
                  className={`bp-meta-icon-btn${isBookmarked ? " is-bookmarked" : ""}${bookmarkAnim ? " bp-bookmark-pop" : ""}`}
                  title={isBookmarked ? "Remove bookmark" : "Bookmark this post"}
                  onClick={toggleBookmark}
                >
                  <i className={isBookmarked ? "fas fa-bookmark" : "far fa-bookmark"} />
                </button>

                {/* Share */}
                <div className="bp-meta-dropdown-wrap" ref={shareRef}>
                  <button
                    type="button"
                    className={`bp-meta-icon-btn${shareOpen ? " is-active" : ""}`}
                    title="Share"
                    onClick={handleShare}
                  >
                    <i className="fas fa-share-alt" />
                  </button>
                  {shareOpen && (
                    <div className="bp-meta-dropdown bp-share-dropdown">
                      <div className="bp-meta-dropdown-title">Share this post</div>
                      {[
                        { label: "Facebook",  icon: "fab fa-facebook-f",   color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}` },
                        { label: "Twitter/X", icon: "fab fa-twitter",      color: "#1DA1F2", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}` },
                        { label: "LinkedIn",  icon: "fab fa-linkedin-in",  color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}` },
                        { label: "WhatsApp",  icon: "fab fa-whatsapp",     color: "#25D366", href: `https://api.whatsapp.com/send?text=${encodeURIComponent(blog.title + " " + window.location.href)}` },
                      ].map((p) => (
                        <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer"
                          className="bp-meta-dropdown-item" style={{ "--item-color": p.color }}
                          onClick={() => setShareOpen(false)}>
                          <i className={p.icon} /> {p.label}
                        </a>
                      ))}
                      <button type="button" className="bp-meta-dropdown-item bp-meta-dropdown-item--copy"
                        onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopyDone(true); setTimeout(() => setCopyDone(false), 2000); setShareOpen(false); }}>
                        <i className={copyDone ? "fas fa-check" : "fas fa-link"} />
                        {copyDone ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rating row */}
            {maintenance.settings.publicBlogShowArticleTools !== false && (
              <div className="bp-rating-row">
                <span className="bp-tools-label">
                  <i className="fas fa-sliders-h" /> Article tools
                </span>
                <div className="bp-rating-actions">

                {/* TOC */}
                <div className="bp-meta-dropdown-wrap" ref={tocRef}>
                  <button
                    type="button"
                    className={`bp-rating-action-btn${tocOpen ? " is-active" : ""}`}
                    title="Table of contents"
                    onClick={() => setTocOpen((v) => !v)}
                  >
                    <i className="fas fa-list" />
                  </button>
                  {tocOpen && (
                    <div className="bp-meta-dropdown bp-toc-dropdown">
                      <div className="bp-meta-dropdown-title">Contents</div>
                      {tocItems.length === 0
                        ? <p className="bp-toc-empty">No headings found</p>
                        : tocItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="bp-toc-item"
                            style={{ paddingLeft: item.level === 3 ? 24 : item.level === 4 ? 36 : 12 }}
                            onClick={() => {
                              document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                              setTocOpen(false);
                            }}
                          >
                            {item.level > 2 && <span className="bp-toc-indent" />}
                            {item.text}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>

                {/* Gallery */}
                <button
                  type="button"
                  className="bp-rating-action-btn"
                  title={galleryImages.length ? `View ${galleryImages.length} image${galleryImages.length > 1 ? "s" : ""}` : "No images"}
                  disabled={galleryImages.length === 0}
                  onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}
                >
                  <i className="far fa-image" />
                  {galleryImages.length > 0 && <span className="bp-action-badge">{galleryImages.length}</span>}
                </button>

                {/* More */}
                <div className="bp-meta-dropdown-wrap" ref={moreRef}>
                  <button
                    type="button"
                    className={`bp-rating-action-btn${moreOpen ? " is-active" : ""}`}
                    title="More options"
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    <i className="fas fa-ellipsis-h" />
                  </button>
                  {moreOpen && (
                    <div className="bp-meta-dropdown bp-more-dropdown">
                      <button type="button" className="bp-meta-dropdown-item" onClick={handleCopyLink}>
                        <i className={copyDone ? "fas fa-check" : "fas fa-link"} />
                        {copyDone ? "Copied!" : "Copy link"}
                      </button>
                      <button type="button" className="bp-meta-dropdown-item" onClick={() => { window.print(); setMoreOpen(false); }}>
                        <i className="fas fa-print" /> Print
                      </button>
                    </div>
                  )}
                </div>

                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="bp-tags">
                {tags.map((t) => <span key={t} className="bp-tag">{t}</span>)}
              </div>
            )}

            {(blog.difficulty || blog.audience || blog.prerequisites || blog.repoUrl || blog.demoUrl || blog.series) && (
              <div className="bp-tech-meta">
                {blog.difficulty && (
                  <span className="bp-tech-pill">
                    <i className="fas fa-signal" /> {blog.difficulty}
                  </span>
                )}
                {blog.audience && (
                  <span className="bp-tech-pill">
                    <i className="fas fa-user-friends" /> {blog.audience}
                  </span>
                )}
                {blog.series && (
                  <span className="bp-tech-pill">
                    <i className="fas fa-layer-group" /> {blog.series}
                  </span>
                )}
                {blog.prerequisites && (
                  <span className="bp-tech-pill bp-tech-pill--wide">
                    <i className="fas fa-tools" /> {blog.prerequisites}
                  </span>
                )}
                {blog.repoUrl && (
                  <a className="bp-tech-pill" href={blog.repoUrl} target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-github" /> Repository
                  </a>
                )}
                {blog.demoUrl && (
                  <a className="bp-tech-pill" href={blog.demoUrl} target="_blank" rel="noopener noreferrer">
                    <i className="fas fa-external-link-alt" /> Demo
                  </a>
                )}
              </div>
            )}

            {blog.canonicalUrl && (
              <div className="bp-editorial-meta">
                <a href={blog.canonicalUrl} target="_blank" rel="noopener noreferrer">
                  <i className="fas fa-link" /> Canonical source
                </a>
              </div>
            )}

            {/* Lead / subtitle */}
            {leadText && (
              <p className="bp-lead">{leadText}</p>
            )}

            {/* Article body */}
            <PostBody content={blog.content} />

            {/* Social share */}
            <SocialShare title={blog.title} />

            {/* Comments */}
            <section className="bp-comments" aria-label="Comments" ref={commentsRef}>
              <div className="bp-comments-header">
                <h3 className="bp-comments-title">
                  {visibleCommentsCount} Comment{visibleCommentsCount === 1 ? "" : "s"}
                </h3>
                <div className="bp-comments-sort">
                  <span className="bp-comments-sort-label">Sort by</span>
                  <select
                    id="bp-comments-sort"
                    name="bpCommentsSort"
                    className="bp-comments-sort-select"
                    aria-label="Sort comments"
                    value={commentSort}
                    onChange={e => setCommentSort(e.target.value)}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              </div>

              {commentsEnabled ? (
                <CommentForm blogId={blog.id} onAdded={reloadComments} />
              ) : (
                <div className="bp-comments-closed" role="note">
                  <i className="fas fa-lock" aria-hidden="true" />
                  <div>
                    <strong>Comments are closed for this post.</strong>
                    <p>You can still read existing discussion below.</p>
                  </div>
                </div>
              )}

              <div className="bp-comments-list">
                {cLoading ? (
                  <p className="bp-comments-loading">Loading comments…</p>
                ) : visibleCommentsCount === 0 ? (
                  <div className="bp-comments-empty">
                    <span>{commentsEnabled ? "💬" : "🔒"}</span>
                    <p>{commentsEnabled ? "Be the first to share your thoughts!" : "No comments to show."}</p>
                  </div>
                ) : (() => {
                  const topLevel = comments
                    .filter((c) => !c.parentId)
                    .sort((a, b) => {
                      const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
                      const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
                      return commentSort === "oldest" ? ta - tb : tb - ta;
                    });
                  const repliesMap = comments.reduce((acc, c) => {
                    if (c.parentId) {
                      acc[c.parentId] = [...(acc[c.parentId] || []), c];
                    }
                    return acc;
                  }, {});
                  return topLevel.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      replies={repliesMap[c.id] || []}
                    />
                  ));
                })()}
              </div>
            </section>
          </article>

          {/* ── Sidebar ── */}
          <aside className="bp-sidebar">
            <AboutAuthor
              totalPosts={allBlogs.length}
              authorName={authorName}
              authorRole={profileData.job_profile}
              authorBio={profileData.authorBio || profileData.subTitle}
            />
            {maintenance.settings.publicBlogShowCategoryWidget !== false && (
              <SidebarCategories blogs={allBlogs} allCategories={allCategories} limit={categoryLimit} />
            )}
            {maintenance.settings.publicBlogShowRecentWidget !== false && (
              <SidebarRecentPosts posts={recentPosts} />
            )}
            {maintenance.settings.publicBlogShowStatsWidget !== false && (
              <SidebarStats views={views} commentsCount={visibleCommentsCount} commentSort={commentSort} onSortChange={setCommentSort} />
            )}
          </aside>

        </div>
      </main>

      <Footer theme={theme} />
      <TopButton theme={theme} />

      {/* ── Image gallery lightbox ── */}
      {galleryOpen && galleryImages.length > 0 && (
        <div
          className="bp-gallery-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setGalleryOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <button
            type="button"
            className="bp-gallery-close"
            onClick={() => setGalleryOpen(false)}
            aria-label="Close gallery"
          >
            <i className="fas fa-times" />
          </button>

          <button
            type="button"
            className="bp-gallery-nav bp-gallery-nav--prev"
            onClick={() => setGalleryIndex((i) => Math.max(i - 1, 0))}
            disabled={galleryIndex === 0}
            aria-label="Previous image"
          >
            <i className="fas fa-chevron-left" />
          </button>

          <div className="bp-gallery-stage">
            <img
              src={galleryImages[galleryIndex].src}
              alt={galleryImages[galleryIndex].alt}
              className="bp-gallery-img"
            />
            {galleryImages[galleryIndex].alt && (
              <p className="bp-gallery-caption">{galleryImages[galleryIndex].alt}</p>
            )}
            <div className="bp-gallery-counter">
              {galleryIndex + 1} / {galleryImages.length}
            </div>
          </div>

          <button
            type="button"
            className="bp-gallery-nav bp-gallery-nav--next"
            onClick={() => setGalleryIndex((i) => Math.min(i + 1, galleryImages.length - 1))}
            disabled={galleryIndex === galleryImages.length - 1}
            aria-label="Next image"
          >
            <i className="fas fa-chevron-right" />
          </button>

          {galleryImages.length > 1 && (
            <div className="bp-gallery-thumbs">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className={`bp-gallery-thumb${i === galleryIndex ? " is-active" : ""}`}
                  onClick={() => setGalleryIndex(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={img.src} alt={img.alt} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
