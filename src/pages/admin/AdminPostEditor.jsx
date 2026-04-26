import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, Link } from "react-router-dom";
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
import { createBlog, createCategory, createTag, getCategories, getTags, getBlogById, listAllMedia, publishScheduledPosts, updateBlog, uploadCoverImage } from "../../firebase/blogService";
import AdminSidebar from "./components/AdminSidebar";
import AdminDatePicker from "./components/AdminDatePicker";
import { useToast } from "./components/AdminToast";
import { useAdminSettings } from "./components/useAdminSettings";
import { sanitizeRichHtml } from "../../shared/htmlSanitizer";
import "./Admin.css";
import "../blogs/BlogPost.css";

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

const BLOCK_ITEMS = [
  { tag: "p",  label: "Paragraph", icon: "fa-paragraph" },
  { tag: "h1", label: "Heading 1",  icon: "fa-heading"   },
  { tag: "h2", label: "Heading 2",  icon: "fa-heading"   },
  { tag: "h3", label: "Heading 3",  icon: "fa-heading"   },
  { tag: "h4", label: "Heading 4",  icon: "fa-heading"   },
  { tag: "h5", label: "Heading 5",  icon: "fa-heading"   },
];


const EMPTY_FORM = {
  title: "",
  subtitle: "",
  image: "",
  imageAlt: "",
  tags: [],
  content: "",
  published: false,
  scheduledAt: "",
  slug: "",
  allowComments: true,
  featured: false,
  categoryIds: [],
  excerpt: "",
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  difficulty: "intermediate",
  audience: "",
  prerequisites: "",
  repoUrl: "",
  demoUrl: "",
  series: "",
};

const TITLE_MAX = 100;
const SUBTITLE_MAX = 200;
const META_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}


/* ── Tag chip input ─────────────────────────────────── */
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  function addTag(raw) {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  }

  function onKeyDown(e) {
    if (["Enter", ",", "Tab"].includes(e.key)) {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="atags-wrap" onClick={() => inputRef.current?.focus()}>
      {tags.map((t) => (
        <span key={t} className="atag-chip">
          {t}
          <button
            type="button"
            className="atag-rm"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)); }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="atag-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? "Add tags (press Enter or comma)…" : ""}
      />
    </div>
  );
}

/* ── Word / char count ──────────────────────────────── */
function contentStats(html, readingSpeedWpm = 200) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[#a-z0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").filter(Boolean).length : 0;
  const chars = html.length;
  const speed = Math.min(320, Math.max(120, Number(readingSpeedWpm) || 200));
  const readMin = Math.max(1, Math.round(words / speed));
  return { words, chars, readMin };
}

function plainTextFromHtml(html) {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[#a-z0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatScheduledDate(value) {
  if (!value) return "";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hsvToHex(h, s, v) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c; g = x; b = 0;
  } else if (hue < 120) {
    r = x; g = c; b = 0;
  } else if (hue < 180) {
    r = 0; g = c; b = x;
  } else if (hue < 240) {
    r = 0; g = x; b = c;
  } else if (hue < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex) {
  const clean = (hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { h: 0, s: 0, v: 0 };

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

function toLangId(label) {
  return (label || "plaintext")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "plaintext";
}

function getLangLabel(languageId) {
  const labels = {
    plaintext: "Plain Text",
    javascript: "JavaScript",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    python: "Python",
    java: "Java",
    php: "PHP",
    go: "Go",
    ruby: "Ruby",
    typescript: "TypeScript",
  };
  return labels[languageId] || "Plain Text";
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

function normalizeTenorGif(item) {
  const formats = item?.media_formats || item?.media?.[0] || {};
  const previewUrl =
    formats.tinygif?.url ||
    formats.nanogif?.url ||
    formats.gif?.url ||
    "";
  const fullUrl =
    formats.gif?.url ||
    formats.tinygif?.url ||
    formats.nanogif?.url ||
    previewUrl;

  return {
    id: item?.id || fullUrl,
    title: item?.content_description || item?.title || "GIF",
    previewUrl,
    fullUrl,
  };
}

const GIF_QUICK_SEARCHES = ["Trending", "Reactions", "Laugh", "Love", "Thanks", "Wow", "Sorry", "Party"];
const GIF_PAGE_SIZE = 12;

function getHighlightedHtml(codeText, languageId) {
  const code = String(codeText || "");
  const lang = toHighlightLang(languageId);
  if (!lang || !hljs.getLanguage(lang)) return escapeHtml(code);
  try {
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}

function renderHighlightedCodeWithLines(codeText, languageId) {
  const normalized = String(codeText || "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  return lines.map((line) => {
    const lineHtml = line.length > 0 ? getHighlightedHtml(line, languageId) : "&nbsp;";
    return `<span class="awp-code-line"><span class="awp-code-line-content">${lineHtml}</span></span>`;
  }).join("");
}

/* ── Preview-mode helpers (awp-codeblock → bp-codeblock) ── */
function renderBpCodeLines(codeText, languageId) {
  const normalized = String(codeText || "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  return lines.map((line) => {
    const lineHtml = line.length > 0 ? getHighlightedHtml(line, languageId) : "&nbsp;";
    return `<span class="bp-code-line"><span class="bp-code-line-content">${lineHtml}</span></span>`;
  }).join("");
}

function transformPreviewHtml(content) {
  if (!content) return "";
  if (!content.includes("awp-codeblock") && !content.includes("bp-codeblock")) return content;
  if (typeof document === "undefined") return content;

  const holder = document.createElement("div");
  holder.innerHTML = content;

  holder.querySelectorAll(".awp-codeblock").forEach((block) => {
    const languageId = block.getAttribute("data-code-language") || "plaintext";
    const langLabel = block.querySelector(".awp-codeblock-lang-label")?.textContent?.trim()
      || getLangLabel(languageId);
    const codeNode = block.querySelector(".awp-codeblock-code");
    const codeText = String(codeNode?.textContent || "").replace(/\r\n/g, "\n");

    const figure = document.createElement("figure");
    figure.className = "bp-codeblock";
    figure.setAttribute("data-code-language", languageId);
    figure.innerHTML = `
      <figcaption class="bp-codeblock-label">
        <span class="bp-codeblock-header-left">
          <span class="bp-codeblock-mac-controls">
            <span class="bp-codeblock-mac-dot bp-codeblock-mac-dot--red"></span>
            <span class="bp-codeblock-mac-dot bp-codeblock-mac-dot--yellow"></span>
            <span class="bp-codeblock-mac-dot bp-codeblock-mac-dot--green"></span>
          </span>
          <span class="bp-codeblock-lang">${langLabel}</span>
        </span>
        <span class="bp-codeblock-actions">
          <span class="bp-codeblock-copy">Copy</span>
        </span>
      </figcaption>
      <pre class="bp-codeblock-pre"><code class="bp-codeblock-code language-${languageId}">${renderBpCodeLines(codeText, languageId)}</code></pre>
    `;
    block.replaceWith(figure);
  });

  return holder.innerHTML;
}

function getCodeTextWithLineBreaks(codeNode, preferRaw = false) {
  if (!codeNode) return "";

  const raw = codeNode.dataset?.raw;
  if (preferRaw && typeof raw === "string") {
    return raw.replace(/\r\n/g, "\n");
  }

  // innerText preserves visual line breaks from contenteditable operations
  // (e.g. Enter inserting <div>/<br>), unlike textContent.
  const withBreaks = typeof codeNode.innerText === "string"
    ? codeNode.innerText
    : String(codeNode.textContent || "");

  return withBreaks.replace(/\r\n/g, "\n");
}

function getCaretCharacterOffsetWithin(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
}

function getSelectionCharacterOffsetsWithin(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };

  const range = selection.getRangeAt(0);
  const startInside = element.contains(range.startContainer);
  const endInside = element.contains(range.endContainer);
  if (!startInside || !endInside) {
    const caret = getCaretCharacterOffsetWithin(element);
    return { start: caret, end: caret };
  }

  const startRange = range.cloneRange();
  startRange.selectNodeContents(element);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(element);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    start: startRange.toString().length,
    end: endRange.toString().length,
  };
}

function setCaretPosition(element, chars) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  let charsLeft = chars;
  let found = false;

  const walk = (node) => {
    if (found) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;
      if (charsLeft <= textLength) {
        range.setStart(node, charsLeft);
        range.collapse(true);
        found = true;
      } else {
        charsLeft -= textLength;
      }
      return;
    }
    node.childNodes.forEach(walk);
  };

  walk(element);

  if (!found) {
    range.selectNodeContents(element);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function normalizeCodeBlocksHtml(html) {
  if (!html || (!html.includes("awp-codeblock") && !html.includes("bp-codeblock"))) return html || "";

  const holder = document.createElement("div");
  holder.innerHTML = html;

  const languageDefs = [
    { id: "plaintext", label: "Plain Text", badge: "TXT", tone: "neutral" },
    { id: "javascript", label: "JavaScript", badge: "JS", tone: "yellow" },
    { id: "html", label: "HTML", badge: "H", tone: "orange" },
    { id: "css", label: "CSS", badge: "5", tone: "blue" },
    { id: "json", label: "JSON", badge: "{}", tone: "green" },
    { id: "python", label: "Python", badge: "PY", tone: "python" },
    { id: "java", label: "Java", badge: "J", tone: "java" },
    { id: "php", label: "PHP", badge: "PHP", tone: "violet" },
    { id: "go", label: "Go", badge: "GO", tone: "cyan" },
    { id: "ruby", label: "Ruby", badge: "R", tone: "ruby" },
    { id: "typescript", label: "TypeScript", badge: "TS", tone: "ts" },
  ];

  const makeLangOptionsHtml = (activeLanguage) => languageDefs.map((lang) => {
    const selectedClass = lang.id === activeLanguage ? " is-selected" : "";
    return `<div role="button" tabindex="0" class="awp-codeblock-lang-option${selectedClass}" data-code-action="select-lang" data-code-lang="${lang.id}" data-code-label="${lang.label}">
      <span class="awp-codeblock-lang-badge awp-codeblock-lang-badge--${lang.tone}">${lang.badge}</span>
      <span class="awp-codeblock-lang-option-label">${lang.label}</span>
      <i class="fas fa-check awp-codeblock-lang-check" aria-hidden="true"></i>
    </div>`;
  }).join("");

  const makeCanonicalBlock = (activeLanguage, codeText) => {
    const block = document.createElement("div");
    block.className = "awp-codeblock";
    block.setAttribute("data-code-language", activeLanguage);
    block.innerHTML = [
      '<div class="awp-codeblock-toolbar" contenteditable="false">',
      '<div class="awp-codeblock-header-left">',
      '<span class="awp-codeblock-mac-controls" aria-hidden="true">',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--red"></span>',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--yellow"></span>',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--green"></span>',
      '</span>',
      '<div class="awp-codeblock-lang-wrap">',
      '<div role="button" tabindex="0" class="awp-codeblock-lang-btn" data-code-action="toggle-lang">',
      `<span class="awp-codeblock-lang-label">${getLangLabel(activeLanguage)}</span>`,
      '<i class="fas fa-chevron-down" aria-hidden="true"></i>',
      '</div>',
      '<div class="awp-codeblock-lang-menu">',
      '<div class="awp-codeblock-lang-search">',
      '<i class="fas fa-search awp-codeblock-lang-search-icon" aria-hidden="true"></i>',
      '<input class="awp-codeblock-lang-search-input" data-code-search="true" type="text" placeholder="Search language..." />',
      '</div>',
      `<div class="awp-codeblock-lang-options">${makeLangOptionsHtml(activeLanguage)}</div>`,
      '</div>',
      '</div>',
      '</div>',
      '<div role="button" tabindex="0" class="awp-codeblock-copy" data-code-action="copy"><i class="far fa-copy" aria-hidden="true"></i> Copy</div>',
      '<div role="button" tabindex="0" class="awp-codeblock-remove" data-code-action="remove" aria-label="Remove code block">×</div>',
      '</div>',
      `<pre class="awp-codeblock-pre"><code class="awp-codeblock-code" contenteditable="true" spellcheck="false">${escapeHtml(codeText)}</code></pre>`,
    ].join("");
    return block;
  };

  holder.querySelectorAll(".bp-codeblock").forEach((legacyBlock) => {
    const languageFromAttr = legacyBlock.getAttribute("data-code-language") || "";
    const languageFromClass = String(legacyBlock.querySelector(".bp-codeblock-code")?.className || "").match(/language-([a-z0-9-]+)/i)?.[1]?.toLowerCase() || "";
    const languageFromLabel = toLangId(
      legacyBlock.querySelector(".bp-codeblock-lang")?.textContent?.trim()
      || legacyBlock.querySelector(".bp-codeblock-lang-btn")?.textContent?.trim()
      || ""
    );
    const activeLanguage = languageFromAttr || languageFromClass || languageFromLabel || "plaintext";

    const codeNode = legacyBlock.querySelector(".bp-codeblock-code");
    const renderedLines = codeNode?.querySelectorAll?.(".bp-code-line-content");
    const codeText = renderedLines && renderedLines.length > 0
      ? Array.from(renderedLines).map((line) => line.textContent || "").join("\n")
      : String(codeNode?.textContent || "").replace(/\r\n/g, "\n");

    const langOptions = makeLangOptionsHtml(activeLanguage);

    const converted = document.createElement("div");
    converted.className = "awp-codeblock";
    converted.setAttribute("data-code-language", activeLanguage);
    converted.innerHTML = [
      '<div class="awp-codeblock-toolbar" contenteditable="false">',
      '<div class="awp-codeblock-header-left">',
      '<span class="awp-codeblock-mac-controls" aria-hidden="true">',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--red"></span>',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--yellow"></span>',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--green"></span>',
      '</span>',
      '<div class="awp-codeblock-lang-wrap">',
      '<div role="button" tabindex="0" class="awp-codeblock-lang-btn" data-code-action="toggle-lang">',
      `<span class="awp-codeblock-lang-label">${getLangLabel(activeLanguage)}</span>`,
      '<i class="fas fa-chevron-down" aria-hidden="true"></i>',
      '</div>',
      '<div class="awp-codeblock-lang-menu">',
      '<div class="awp-codeblock-lang-search">',
      '<i class="fas fa-search awp-codeblock-lang-search-icon" aria-hidden="true"></i>',
      '<input class="awp-codeblock-lang-search-input" data-code-search="true" type="text" placeholder="Search language..." />',
      '</div>',
      `<div class="awp-codeblock-lang-options">${langOptions}</div>`,
      '</div>',
      '</div>',
      '</div>',
      '<div role="button" tabindex="0" class="awp-codeblock-copy" data-code-action="copy"><i class="far fa-copy" aria-hidden="true"></i> Copy</div>',
      '<div role="button" tabindex="0" class="awp-codeblock-remove" data-code-action="remove" aria-label="Remove code block">×</div>',
      '</div>',
      `<pre class="awp-codeblock-pre"><code class="awp-codeblock-code" contenteditable="true" spellcheck="false">${escapeHtml(codeText)}</code></pre>`,
    ].join("");

    legacyBlock.replaceWith(converted);
  });

  holder.querySelectorAll(".awp-codeblock, .bp-codeblock").forEach((block) => {
    const languageFromAttr = block.getAttribute("data-code-language") || "";
    const languageFromClass = String(block.querySelector(".awp-codeblock-code, .bp-codeblock-code")?.className || "").match(/language-([a-z0-9-]+)/i)?.[1]?.toLowerCase() || "";
    const labelText = block.querySelector(".awp-codeblock-lang-label")?.textContent?.trim()
      || block.querySelector(".awp-codeblock-lang-btn")?.textContent?.trim()
      || block.querySelector(".awp-codeblock-lang")?.textContent?.trim()
      || block.querySelector(".bp-codeblock-lang")?.textContent?.trim()
      || block.querySelector(".bp-codeblock-lang-btn")?.textContent?.trim()
      || "";
    const selectedOpt = block.querySelector(".awp-codeblock-lang-option.is-selected, .bp-codeblock-lang-option.is-selected")?.getAttribute("data-code-lang") || "";
    const activeLanguage = languageFromAttr || languageFromClass || selectedOpt || toLangId(labelText) || "plaintext";

    const codeNode = block.querySelector(".awp-codeblock-code, .bp-codeblock-code");
    const awpLines = codeNode?.querySelectorAll?.(".awp-code-line-content");
    const bpLines = codeNode?.querySelectorAll?.(".bp-code-line-content");
    const codeText = awpLines && awpLines.length > 0
      ? Array.from(awpLines).map((line) => line.textContent || "").join("\n")
      : bpLines && bpLines.length > 0
        ? Array.from(bpLines).map((line) => line.textContent || "").join("\n")
        : String(codeNode?.textContent || "").replace(/\r\n/g, "\n");

    block.replaceWith(makeCanonicalBlock(activeLanguage, codeText));
  });

  holder.querySelectorAll(".awp-codeblock").forEach((block) => {
    block.removeAttribute("contenteditable");

    const existingBtnLabel = block.querySelector(".awp-codeblock-lang-label")?.textContent?.trim();
    const existingSelectedOption = block.querySelector(".awp-codeblock-lang-option.is-selected");
    const activeLanguage = block.getAttribute("data-code-language")
      || existingSelectedOption?.getAttribute("data-code-lang")
      || toLangId(existingBtnLabel)
      || "plaintext";
    block.setAttribute("data-code-language", activeLanguage);

    const codeNode = block.querySelector(".awp-codeblock-code");
    if (codeNode) {
      codeNode.setAttribute("contenteditable", "true");
      codeNode.setAttribute("spellcheck", "false");
    }

    const toolbar = block.querySelector(".awp-codeblock-toolbar");
    if (toolbar) {
      toolbar.setAttribute("contenteditable", "false");

      let headerLeft = toolbar.querySelector(".awp-codeblock-header-left");
      if (!headerLeft) {
        headerLeft = document.createElement("div");
        headerLeft.className = "awp-codeblock-header-left";
        toolbar.prepend(headerLeft);
      }

      let macControls = headerLeft.querySelector(".awp-codeblock-mac-controls");
      if (!macControls) {
        macControls = document.createElement("span");
        macControls.className = "awp-codeblock-mac-controls";
        ["red", "yellow", "green"].forEach((tone) => {
          const dot = document.createElement("span");
          dot.className = `awp-codeblock-mac-dot awp-codeblock-mac-dot--${tone}`;
          macControls.appendChild(dot);
        });
        headerLeft.prepend(macControls);
      }

      const langWrap = toolbar.querySelector(".awp-codeblock-lang-wrap");
      if (!langWrap) {
        const wrap = document.createElement("div");
        wrap.className = "awp-codeblock-lang-wrap";
        wrap.innerHTML = [
          '<div role="button" tabindex="0" class="awp-codeblock-lang-btn" data-code-action="toggle-lang">',
          `<span class="awp-codeblock-lang-label">${getLangLabel(activeLanguage)}</span>`,
          '<i class="fas fa-chevron-down" aria-hidden="true"></i>',
          '</div>',
          '<div class="awp-codeblock-lang-menu">',
          '<div class="awp-codeblock-lang-search">',
          '<i class="fas fa-search awp-codeblock-lang-search-icon" aria-hidden="true"></i>',
          '<input class="awp-codeblock-lang-search-input" data-code-search="true" type="text" placeholder="Search language..." />',
          '</div>',
          `<div class="awp-codeblock-lang-options">${makeLangOptionsHtml(activeLanguage)}</div>`,
          '</div>',
        ].join("");
        headerLeft.appendChild(wrap);
      } else if (langWrap.parentElement !== headerLeft) {
        headerLeft.appendChild(langWrap);
      }
    }

    const langBtn = block.querySelector(".awp-codeblock-lang-btn");
    if (langBtn) {
      langBtn.setAttribute("data-code-action", "toggle-lang");
      const labelNode = langBtn.querySelector(".awp-codeblock-lang-label");
      if (labelNode) labelNode.textContent = getLangLabel(activeLanguage);
      let caretNode = langBtn.querySelector("i");
      if (!caretNode) {
        caretNode = document.createElement("i");
        caretNode.className = "fas fa-chevron-down";
        caretNode.setAttribute("aria-hidden", "true");
        langBtn.appendChild(caretNode);
      }
    }

    block.querySelectorAll(".awp-codeblock-lang-option").forEach((opt) => {
      opt.setAttribute("data-code-action", "select-lang");
      if (!opt.getAttribute("data-code-lang")) {
        opt.setAttribute("data-code-lang", toLangId(opt.textContent?.trim()));
      }
      if (!opt.getAttribute("data-code-label")) {
        const labelText = opt.querySelector(".awp-codeblock-lang-option-label")?.textContent?.trim()
          || opt.textContent?.trim()
          || getLangLabel(opt.getAttribute("data-code-lang"));
        opt.setAttribute("data-code-label", labelText);
      }
      opt.classList.toggle("is-selected", opt.getAttribute("data-code-lang") === activeLanguage);
    });

    const copyBtn = block.querySelector(".awp-codeblock-copy");
    if (copyBtn) {
      copyBtn.setAttribute("data-code-action", "copy");
    } else if (toolbar) {
      const newCopy = document.createElement("div");
      newCopy.setAttribute("role", "button");
      newCopy.setAttribute("tabindex", "0");
      newCopy.className = "awp-codeblock-copy";
      newCopy.setAttribute("data-code-action", "copy");
      newCopy.innerHTML = '<i class="far fa-copy" aria-hidden="true"></i> Copy';
      toolbar.appendChild(newCopy);
    }

    const removeBtn = block.querySelector(".awp-codeblock-remove");
    if (removeBtn) {
      removeBtn.setAttribute("data-code-action", "remove");
    } else if (toolbar) {
      const newRemove = document.createElement("div");
      newRemove.setAttribute("role", "button");
      newRemove.setAttribute("tabindex", "0");
      newRemove.className = "awp-codeblock-remove";
      newRemove.setAttribute("data-code-action", "remove");
      newRemove.setAttribute("aria-label", "Remove code block");
      newRemove.textContent = "×";
      toolbar.appendChild(newRemove);
    }

    const optionsContainer = block.querySelector(".awp-codeblock-lang-options");
    if (optionsContainer && optionsContainer.children.length === 0) {
      optionsContainer.innerHTML = makeLangOptionsHtml(activeLanguage);
    }
  });

  return holder.innerHTML;
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
    const rawText = methodNode.textContent || "";
    const upperText = rawText.toUpperCase();
    const shouldRestoreCaret = rawText !== upperText && methodNode.contains(window.getSelection?.()?.anchorNode);
    const caretOffset = shouldRestoreCaret ? getCaretCharacterOffsetWithin(methodNode) : 0;
    if (rawText !== upperText) methodNode.textContent = upperText;
    const method = normalizeApiMethodName(upperText);
    methodNode.setAttribute("data-method", method);
    if (shouldRestoreCaret) setCaretPosition(methodNode, caretOffset);
  });
}

function ensureChecklistControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-checklist-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-checklist input[type='checkbox']").forEach((checkbox) => {
    checkbox.removeAttribute("disabled");
    checkbox.setAttribute("contenteditable", "false");
  });

  root.querySelectorAll(".awp-checklist").forEach((list) => {
    if (list.nextElementSibling?.classList?.contains("awp-checklist-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-checklist-add";
    addButton.setAttribute("data-checklist-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add item';
    list.insertAdjacentElement("afterend", addButton);
  });
}

function ensureDetailsControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-details-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll('.awp-technical-block[data-technical-type="details"]').forEach((block) => {
    if (block.querySelector(".awp-details-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-details-add";
    addButton.setAttribute("data-details-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add section';
    block.appendChild(addButton);
  });
}

function ensureReferencesControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-references-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-references").forEach((block) => {
    if (block.querySelector(".awp-references-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-references-add";
    addButton.setAttribute("data-references-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add reference';
    block.appendChild(addButton);
  });
}

function ensureFaqControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-faq-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-faq-block").forEach((block) => {
    if (block.querySelector(".awp-faq-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-faq-add";
    addButton.setAttribute("data-faq-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add question';
    block.appendChild(addButton);
  });
}

function ensureTroubleshootingControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-troubleshooting-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-troubleshooting").forEach((block) => {
    if (block.querySelector(".awp-troubleshooting-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-troubleshooting-add";
    addButton.setAttribute("data-troubleshooting-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add row';
    block.appendChild(addButton);
  });
}

function ensureGlossaryControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-glossary-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-glossary").forEach((block) => {
    if (block.querySelector(".awp-glossary-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-glossary-add";
    addButton.setAttribute("data-glossary-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add row';
    block.appendChild(addButton);
  });
}

function ensureBenchmarkControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-benchmark-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-benchmark").forEach((block) => {
    if (block.querySelector(".awp-benchmark-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-benchmark-add";
    addButton.setAttribute("data-benchmark-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add row';
    block.appendChild(addButton);
  });
}

function ensureEnvironmentControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-environment-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-environment").forEach((block) => {
    if (block.querySelector(".awp-environment-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-environment-add";
    addButton.setAttribute("data-environment-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add row';
    block.appendChild(addButton);
  });
}

function ensureTestingControls(root, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(".awp-testing-add").forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(".awp-testing").forEach((block) => {
    if (block.querySelector(".awp-testing-add")) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "awp-testing-add";
    addButton.setAttribute("data-testing-add", "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Add row';
    block.appendChild(addButton);
  });
}

function ensureListAddControl(root, blockSelector, listSelector, buttonClass, dataAttr, label, includeControls = true) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll(`.${buttonClass}`).forEach((button) => {
    if (!includeControls) button.remove();
  });

  if (!includeControls) return;

  root.querySelectorAll(blockSelector).forEach((block) => {
    if (block.querySelector(`.${buttonClass}`)) return;
    if (!block.querySelector(listSelector)) return;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = buttonClass;
    addButton.setAttribute(dataAttr, "true");
    addButton.setAttribute("contenteditable", "false");
    addButton.innerHTML = `<i class="fas fa-plus" aria-hidden="true"></i> ${label}`;
    block.appendChild(addButton);
  });
}

function normalizeTechnicalBlocksHtml(html, options = {}) {
  const includeControls = options.includeControls !== false;
  if (!html || (!html.includes("awp-api-method") && !html.includes("awp-checklist") && !html.includes("awp-details") && !html.includes("awp-references") && !html.includes("awp-faq-block") && !html.includes("awp-troubleshooting") && !html.includes("awp-glossary") && !html.includes("awp-benchmark") && !html.includes("awp-environment") && !html.includes("awp-testing") && !html.includes("awp-prerequisites") && !html.includes("awp-steps"))) return html || "";

  const holder = document.createElement("div");
  holder.innerHTML = html;
  syncApiMethodBadges(holder);
  ensureChecklistControls(holder, includeControls);
  ensureDetailsControls(holder, includeControls);
  ensureReferencesControls(holder, includeControls);
  ensureFaqControls(holder, includeControls);
  ensureTroubleshootingControls(holder, includeControls);
  ensureGlossaryControls(holder, includeControls);
  ensureBenchmarkControls(holder, includeControls);
  ensureEnvironmentControls(holder, includeControls);
  ensureTestingControls(holder, includeControls);
  ensureListAddControl(holder, ".awp-prerequisites", "ul", "awp-prerequisites-add", "data-prerequisites-add", "Add item", includeControls);
  ensureListAddControl(holder, ".awp-steps", "ol", "awp-steps-add", "data-steps-add", "Add step", includeControls);
  return holder.innerHTML;
}

function serializeCodeBlocksForStorage(html) {
  if (!html || !html.includes("awp-codeblock")) return html || "";

  const holder = document.createElement("div");
  holder.innerHTML = html;

  holder.querySelectorAll(".awp-codeblock").forEach((block) => {
    const codeNode = block.querySelector(".awp-codeblock-code");
    if (!codeNode) return;

    // Persist plain code text only; syntax highlighting spans are render-only.
    const raw = (codeNode.dataset?.raw ?? codeNode.textContent ?? "").replace(/\r\n/g, "\n");
    codeNode.textContent = raw;
    codeNode.dataset.raw = raw;

    const lang = block.getAttribute("data-code-language") || "plaintext";
    block.setAttribute("data-code-language", lang);
  });

  return holder.innerHTML;
}

function stripEditorUiArtifacts(html) {
  if (!html || !html.includes("awp-find-hl")) return html || "";

  const holder = document.createElement("div");
  holder.innerHTML = html;
  holder.querySelectorAll(".awp-find-hl").forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ""));
  });
  holder.normalize();
  return holder.innerHTML;
}

export default function AdminPostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const editorSettings = useAdminSettings();
  const isEditing = Boolean(id);
  const maxUploadSizeMb = Math.min(25, Math.max(1, Number(editorSettings.maxUploadSizeMb) || 5));
  const maxUploadBytes = maxUploadSizeMb * 1024 * 1024;
  const autosaveDelayMs = Math.min(60, Math.max(3, Number(editorSettings.autosaveIntervalSec) || 5)) * 1000;
  const readingSpeedWpm = Math.min(320, Math.max(120, Number(editorSettings.readingSpeedWpm) || 200));

  const [form, setForm]         = useState(() =>
    isEditing ? EMPTY_FORM : {
      ...EMPTY_FORM,
      difficulty:    editorSettings.defaultDifficulty,
      allowComments: editorSettings.defaultComments,
      featured:      editorSettings.defaultFeatured,
    }
  );
  const [loading, setLoading]   = useState(isEditing);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState("idle"); // "idle" | "saving" | "saved" | "fading"
  const initialPublishedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  const lastSavedId = useRef(null);
  const formRef = useRef(form); // always mirrors latest form — used inside auto-save timer to avoid stale closure


  /* Slug — auto-sync from title until user manually customises it.
   * Works for both new posts and edit mode (unless the stored slug
   * was already manually customised to something different from the title). */
  const slugCustomizedRef = useRef(false);
  useEffect(() => {
    if (slugCustomizedRef.current) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title]);

  /* Upload state */
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [contentImageUploading, setContentImageUploading] = useState(false);
  const [contentImagePct, setContentImagePct] = useState(0);
  const coverInputRef = useRef(null);
  const contentImageInputRef = useRef(null);

  /* ── Live categories from Firestore ── */
  const [allCategories, setAllCategories]     = useState([]);
  const [catsLoading, setCatsLoading]         = useState(true);
  const [catPanelOpen, setCatPanelOpen]       = useState(true);
  const [featPanelOpen, setFeatPanelOpen]     = useState(true);
  const [catSearch, setCatSearch]             = useState("");
  const [addCatOpen, setAddCatOpen]           = useState(false);
  const [newCatName, setNewCatName]           = useState("");
  const [newCatParentId, setNewCatParentId]   = useState("");
  const [addingCat, setAddingCat]             = useState(false);

  /* ── Live tags from Firestore ── */
  const [allTags, setAllTags]                 = useState([]);
  const [tagsLoading, setTagsLoading]         = useState(true);
  const [tagPanelOpen, setTagPanelOpen]       = useState(true);
  const [tagSearch, setTagSearch]             = useState("");
  const [addTagOpen, setAddTagOpen]           = useState(false);
  const [newTagName, setNewTagName]           = useState("");
  const [addingTag, setAddingTag]             = useState(false);

  useEffect(() => {
    getCategories()
      .then(setAllCategories)
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  useEffect(() => {
    getTags()
      .then(setAllTags)
      .catch(() => {})
      .finally(() => setTagsLoading(false));
  }, []);

  async function handleAddQuickCat(e) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      await createCategory({ name, slug, parentId: newCatParentId, description: "" });
      const fresh = await getCategories();
      setAllCategories(fresh);
      const created = fresh.find((c) => c.slug === slug);
      if (created) {
        setForm((p) => ({ ...p, categoryIds: [...p.categoryIds, created.id] }));
      }
      setNewCatName("");
      setNewCatParentId("");
      setAddCatOpen(false);
    } catch {
      /* ignore — user can retry */
    } finally {
      setAddingCat(false);
    }
  }

  async function handleAddQuickTag(e) {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    setAddingTag(true);
    try {
      await createTag(name);
      const fresh = await getTags();
      setAllTags(fresh);
      setForm((p) => ({
        ...p,
        tags: p.tags.includes(name) ? p.tags : [...p.tags, name],
      }));
      setNewTagName("");
      setAddTagOpen(false);
    } catch {
      /* ignore — user can retry */
    } finally {
      setAddingTag(false);
    }
  }

  /* Media picker state */
  const [mediaPickerOpen, setMediaPickerOpen]   = useState(false);
  const [mediaItems, setMediaItems]             = useState([]);
  const [mediaLoading, setMediaLoading]         = useState(false);
  const [mediaPickerMode, setMediaPickerMode]   = useState("cover");

  /* Block-type dropdown */
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const blockMenuRef = useRef(null);
  const [selectedBlock, setSelectedBlock] = useState({ tag: "p", label: "Paragraph", icon: "fa-paragraph" });

  /* Table picker */
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 });
  const tablePickerRef = useRef(null);

  /* Technical blogging block menu */
  const [techMenuOpen, setTechMenuOpen] = useState(false);
  const techMenuRef = useRef(null);

  /* Video embed popover */
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const embedRef = useRef(null);
  const embedInputRef = useRef(null);

  /* Special characters picker */
  const [charsOpen, setCharsOpen] = useState(false);
  const [charsCat, setCharsCat] = useState(0);
  const [charsSearch, setCharsSearch] = useState("");
  const charsRef = useRef(null);

  /* Emoji picker */
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCat, setEmojiCat] = useState(0);
  const [emojiSearch, setEmojiSearch] = useState("");
  const emojiRef = useRef(null);

  /* GIF picker */
  const [gifOpen, setGifOpen] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifLoading, setGifLoading] = useState(false);
  const [gifLoadingMore, setGifLoadingMore] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const [gifError, setGifError] = useState("");
  const [gifNextPos, setGifNextPos] = useState("");
  const [gifHasMore, setGifHasMore] = useState(true);
  const gifRef = useRef(null);
  const gifGridRef = useRef(null);
  const gifInputRef = useRef(null);
  const gifRequestSeqRef = useRef(0);

  /* Anchor / bookmark popover */
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [anchorId, setAnchorId] = useState("");
  const anchorRef = useRef(null);
  const anchorInputRef = useRef(null);

  /* Math / formula popover */
  const [mathOpen, setMathOpen] = useState(false);
  const [mathFormula, setMathFormula] = useState("");
  const [mathType, setMathType] = useState("inline"); // "inline" | "block"
  const mathRef = useRef(null);
  const mathInputRef = useRef(null);

  /* Find & Replace panel */
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findStats, setFindStats] = useState({ total: 0, current: 0 });
  const findRef = useRef(null);
  const findQueryRef = useRef(null);
  const findMatchesRef = useRef([]); // array of Range objects

  /* Labeled divider popover */
  const [dividerOpen, setDividerOpen] = useState(false);
  const [dividerLabel, setDividerLabel] = useState("");
  const dividerRef = useRef(null);
  const dividerInputRef = useRef(null);

  /* Table of contents popover */
  const [tocOpen, setTocOpen] = useState(false);
  const [tocTitle, setTocTitle] = useState("Table of Contents");
  const tocRef = useRef(null);
  const tocInputRef = useRef(null);

  /* Fullscreen mode */
  const [fullscreen, setFullscreen] = useState(false);

  /* Word count popover */
  const [wordCountOpen, setWordCountOpen] = useState(false);
  const wordCountRef = useRef(null);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);


  const CODE_LANGUAGES = [
    { id: "plaintext", label: "Plain Text", badge: "TXT", tone: "neutral" },
    { id: "javascript", label: "JavaScript", badge: "JS", tone: "yellow" },
    { id: "html", label: "HTML", badge: "H", tone: "orange" },
    { id: "css", label: "CSS", badge: "5", tone: "blue" },
    { id: "json", label: "JSON", badge: "{}", tone: "green" },
    { id: "python", label: "Python", badge: "PY", tone: "python" },
    { id: "java", label: "Java", badge: "J", tone: "java" },
    { id: "php", label: "PHP", badge: "PHP", tone: "violet" },
    { id: "go", label: "Go", badge: "GO", tone: "cyan" },
    { id: "ruby", label: "Ruby", badge: "R", tone: "ruby" },
    { id: "typescript", label: "TypeScript", badge: "TS", tone: "ts" },
  ];

  /* Alignment dropdown */
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  const alignMenuRef = useRef(null);

  /* Insert-link popup */
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkOptionsOpen, setLinkOptionsOpen] = useState(false);
  const linkPopoverRef = useRef(null);
  const linkUrlInputRef = useRef(null);
  const [linkDraft, setLinkDraft] = useState({
    url: "",
    text: "",
    openInNewTab: true,
    nofollow: false,
    noopener: true,
    title: "",
  });

  /* WYSIWYG editor refs */
  const contentEditableRef = useRef(null);
  const savedRangeRef      = useRef(null);
  const contentInitRef     = useRef(false);
  const editorUndoStackRef = useRef([]);
  const editorRedoStackRef = useRef([]);
  const editorHistoryRestoringRef = useRef(false);

  /* Image resize / alignment */
  const [selectedImg, setSelectedImg]     = useState(null);
  const [imgOverlayPos, setImgOverlayPos] = useState(null); // {top,left,width,height} fixed coords

  const clearSelectedImageOverlay = useCallback(() => {
    setSelectedImg(null);
    setImgOverlayPos(null);
  }, []);

  const syncSelectedImageOverlay = useCallback(() => {
    const editorEl = contentEditableRef.current;
    if (!editorEl || !selectedImg) return;

    const imageDetached = !selectedImg.isConnected || !editorEl.contains(selectedImg);
    const imageMissingSource = !selectedImg.getAttribute("src");

    if (imageDetached || imageMissingSource) {
      clearSelectedImageOverlay();
      return;
    }

    const rect = selectedImg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      clearSelectedImageOverlay();
      return;
    }

    setImgOverlayPos((prev) => {
      if (
        prev &&
        prev.top === rect.top &&
        prev.left === rect.left &&
        prev.width === rect.width &&
        prev.height === rect.height
      ) {
        return prev;
      }
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    });
  }, [clearSelectedImageOverlay, selectedImg]);

  /* Font color */
  const [fontColor, setFontColor] = useState("#000000");
  const colorPanelRef  = useRef(null);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const [colorTab, setColorTab] = useState("default");
  const [pickerHue, setPickerHue] = useState(220);
  const [pickerSat, setPickerSat] = useState(100);
  const [pickerVal, setPickerVal] = useState(100);
  const [pickerHexInput, setPickerHexInput] = useState("#000000");
  const satValRef = useRef(null);
  const hueRef = useRef(null);

  const COLOR_PALETTE = [
    // Row 1 — blacks / grays
    "#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#ffffff",
    // Row 2 — reds / pinks
    "#ff0000","#ff4444","#ff6b6b","#ff8c94","#ffb3ba","#ff6fab","#e91e8c","#c2185b",
    // Row 3 — oranges / yellows
    "#ff6600","#ff9800","#ffb300","#ffd600","#ffee58","#fff176","#f9a825","#e65100",
    // Row 4 — greens
    "#00c853","#43a047","#66bb6a","#a5d6a7","#1b5e20","#33691e","#558b2f","#7cb342",
    // Row 5 — blues / cyans
    "#0d47a1","#1565c0","#1976d2","#42a5f5","#90caf9","#00bcd4","#00acc1","#0097a7",
    // Row 6 — purples / violets
    "#4a148c","#6a1b9a","#8e24aa","#ab47bc","#ce93d8","#7c4dff","#651fff","#d500f9",
    // Row 7 — browns
    "#3e2723","#4e342e","#6d4c41","#8d6e63","#a1887f","#bcaaa4","#795548","#5d4037",
  ];

  function syncPickerFromHex(hex) {
    const hsv = hexToHsv(hex);
    setPickerHue(hsv.h);
    setPickerSat(hsv.s);
    setPickerVal(hsv.v);
    setPickerHexInput(hex.toUpperCase());
  }

  function commitPicker(nextH, nextS, nextV) {
    const hex = hsvToHex(nextH, nextS, nextV).toUpperCase();
    setPickerHue(nextH);
    setPickerSat(nextS);
    setPickerVal(nextV);
    setPickerHexInput(hex);
    setFontColor(hex);
  }

  function updateSatValFromPointer(clientX, clientY) {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    const nextS = (x / rect.width) * 100;
    const nextV = 100 - (y / rect.height) * 100;
    commitPicker(pickerHue, nextS, nextV);
  }

  function updateHueFromPointer(clientY) {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const y = clamp(clientY - rect.top, 0, rect.height);
    const nextH = (y / rect.height) * 360;
    commitPicker(nextH, pickerSat, pickerVal);
  }

  /* Close color panel on outside click */
  useEffect(() => {
    if (!colorPanelOpen) return;
    const handle = (e) => {
      if (colorPanelRef.current && !colorPanelRef.current.contains(e.target)) {
        setColorPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [colorPanelOpen]);

  useEffect(() => {
    if (colorPanelOpen) syncPickerFromHex(fontColor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorPanelOpen]);

  /* ── Close block-type menu on outside click ── */
  useEffect(() => {
    if (!blockMenuOpen) return;
    const handle = (e) => {
      if (blockMenuRef.current && !blockMenuRef.current.contains(e.target)) {
        setBlockMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [blockMenuOpen]);

  /* ── Close table picker on outside click ── */
  useEffect(() => {
    if (!tablePickerOpen) return;
    const handle = (e) => {
      if (tablePickerRef.current && !tablePickerRef.current.contains(e.target))
        setTablePickerOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [tablePickerOpen]);

  useEffect(() => {
    if (!techMenuOpen) return;
    const handle = (e) => {
      if (techMenuRef.current && !techMenuRef.current.contains(e.target)) {
        setTechMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [techMenuOpen]);

  /* ── Close alignment menu on outside click ── */
  useEffect(() => {
    if (!alignMenuOpen) return;
    const handle = (e) => {
      if (alignMenuRef.current && !alignMenuRef.current.contains(e.target)) {
        setAlignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [alignMenuOpen]);

  /* ── Close link popup on outside click / escape ── */
  useEffect(() => {
    if (!linkPopoverOpen) return;
    const handleMouseDown = (e) => {
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target)) {
        setLinkPopoverOpen(false);
        setLinkOptionsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setLinkPopoverOpen(false);
        setLinkOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [linkPopoverOpen]);

  useEffect(() => {
    if (!linkPopoverOpen) return;
    const t = setTimeout(() => linkUrlInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [linkPopoverOpen]);

  /* ── Close embed popover on outside click ── */
  useEffect(() => {
    if (!embedOpen) return;
    const handle = (e) => {
      if (embedRef.current && !embedRef.current.contains(e.target)) setEmbedOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [embedOpen]);

  useEffect(() => {
    if (!embedOpen) return;
    const t = setTimeout(() => embedInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [embedOpen]);

  /* ── Close special chars picker on outside click ── */
  useEffect(() => {
    if (!charsOpen) return;
    const handle = (e) => {
      if (charsRef.current && !charsRef.current.contains(e.target)) setCharsOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [charsOpen]);

  /* ── Close emoji picker on outside click ── */
  useEffect(() => {
    if (!emojiOpen) return;
    const handle = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [emojiOpen]);

  /* ── Close GIF picker on outside click ── */
  useEffect(() => {
    if (!gifOpen) return;
    const handle = (e) => {
      if (gifRef.current && !gifRef.current.contains(e.target)) setGifOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [gifOpen]);

  useEffect(() => {
    if (!gifOpen) return;
    const t = setTimeout(() => gifInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [gifOpen]);

  async function fetchGifPage({ query, pos = "", replace = false, requestId, signal } = {}) {
    const trimmedQuery = (query || "").trim();
    const isInitialLoad = replace || !pos;

    if (isInitialLoad) {
      setGifLoading(true);
      if (replace) {
        setGifResults([]);
        setGifNextPos("");
        setGifHasMore(true);
      }
    } else {
      setGifLoadingMore(true);
    }
    setGifError("");

    try {
      const endpointBase = trimmedQuery
        ? "https://g.tenor.com/v1/search"
        : "https://g.tenor.com/v1/trending";
      const params = new URLSearchParams({
        key: "LIVDSRZULELA",
        limit: String(GIF_PAGE_SIZE),
        media_filter: "minimal",
        contentfilter: "medium",
      });
      if (trimmedQuery) params.set("q", trimmedQuery);
      if (pos) params.set("pos", pos);

      const response = await fetch(`${endpointBase}?${params.toString()}`, { signal });
      if (!response.ok) throw new Error(`GIF search failed with ${response.status}`);
      const data = await response.json();
      if (typeof requestId === "number" && requestId !== gifRequestSeqRef.current) return;

      const results = Array.isArray(data?.results)
        ? data.results.map(normalizeTenorGif).filter((item) => item.previewUrl && item.fullUrl)
        : [];
      const nextPos = data?.next || data?.pos || "";

      setGifNextPos(nextPos);
      setGifHasMore(Boolean(nextPos) && results.length > 0);
      setGifResults((prev) => {
        if (replace) return results;
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...results.filter((item) => !seen.has(item.id))];
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (typeof requestId === "number" && requestId !== gifRequestSeqRef.current) return;
      if (replace) setGifResults([]);
      setGifHasMore(false);
      setGifError("GIF search is unavailable right now.");
    } finally {
      if (typeof requestId === "number" && requestId !== gifRequestSeqRef.current) return;
      setGifLoading(false);
      setGifLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!gifOpen) return;

    const query = gifSearch.trim();
    gifRequestSeqRef.current += 1;
    const requestId = gifRequestSeqRef.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      await fetchGifPage({ query, replace: true, requestId, signal: controller.signal });
    }, query ? 250 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [gifOpen, gifSearch]);

  function handleGifGridScroll(e) {
    const el = e.currentTarget;
    if (!gifOpen || gifLoading || gifLoadingMore || !gifHasMore || !gifNextPos) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining > 160) return;
    fetchGifPage({ query: gifSearch.trim(), pos: gifNextPos, requestId: gifRequestSeqRef.current });
  }

  /* ── Close anchor popover on outside click ── */
  useEffect(() => {
    if (!anchorOpen) return;
    const handle = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) setAnchorOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [anchorOpen]);

  useEffect(() => {
    if (!anchorOpen) return;
    const t = setTimeout(() => anchorInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [anchorOpen]);

  /* ── Close math popover on outside click ── */
  useEffect(() => {
    if (!mathOpen) return;
    const handle = (e) => {
      if (mathRef.current && !mathRef.current.contains(e.target)) setMathOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [mathOpen]);

  useEffect(() => {
    if (!mathOpen) return;
    const t = setTimeout(() => mathInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [mathOpen]);

  /* ── Close divider popover on outside click ── */
  useEffect(() => {
    if (!dividerOpen) return;
    const handle = (e) => {
      if (dividerRef.current && !dividerRef.current.contains(e.target)) setDividerOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dividerOpen]);

  useEffect(() => {
    if (!dividerOpen) return;
    const t = setTimeout(() => dividerInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [dividerOpen]);

  /* ── Close TOC popover on outside click ── */
  useEffect(() => {
    if (!tocOpen) return;
    const handle = (e) => {
      if (tocRef.current && !tocRef.current.contains(e.target)) setTocOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [tocOpen]);

  useEffect(() => {
    if (!tocOpen) return;
    const t = setTimeout(() => tocInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [tocOpen]);

  /* ── Close word-count popover on outside click ── */
  useEffect(() => {
    if (!wordCountOpen) return;
    const handle = (e) => {
      if (wordCountRef.current && !wordCountRef.current.contains(e.target)) setWordCountOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [wordCountOpen]);

  /* ── Close find panel on Escape ── */
  useEffect(() => {
    if (!findOpen) return;
    const handle = (e) => {
      if (e.key === "Escape") {
        clearFindHighlights();
        setFindOpen(false);
        setFindStats({ total: 0, current: 0 });
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [findOpen]);

  /* ── Fullscreen: restore on Escape ── */
  useEffect(() => {
    if (!fullscreen) return;
    const handle = (e) => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [fullscreen]);

  /* ── Keep formRef current on every render so triggerAutoSave reads fresh values ── */
  formRef.current = form;

  /* ── Load post ── */
  useEffect(() => {
    if (!isEditing) return;
    getBlogById(id)
      .then((data) => {
        if (!data) { setError("Post not found."); return; }
        const computedSlug = slugify(data.title || "");
        const loadedSlug   = data.slug || computedSlug || "";
        // If the stored slug was manually set to something different from the
        // title-derived slug, lock it so title changes don't overwrite it.
        if (loadedSlug && loadedSlug !== computedSlug) {
          slugCustomizedRef.current = true;
        }
        setForm({
          title:         data.title || "",
          subtitle:      data.subtitle || "",
          image:         data.image || "",
          imageAlt:      data.imageAlt || "",
          tags:          data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          content:       data.content || "",
          published:     Boolean(data.published),
          scheduledAt:   toDateTimeLocalValue(data.scheduledAt),
          slug:          loadedSlug,
          allowComments: data.allowComments !== false,
          featured:      Boolean(data.featured),
          categoryIds:   Array.isArray(data.categoryIds) ? data.categoryIds : [],
          excerpt:       data.excerpt || "",
          metaTitle:     data.metaTitle || "",
          metaDescription: data.metaDescription || "",
          canonicalUrl:  data.canonicalUrl || "",
          difficulty:    data.difficulty || "intermediate",
          audience:      data.audience || "",
          prerequisites: data.prerequisites || "",
          repoUrl:       data.repoUrl || "",
          demoUrl:       data.demoUrl || "",
          series:        data.series || "",
        });
        initialPublishedRef.current = Boolean(data.published);
      })
      .catch(() => setError("Failed to load post."))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  /* ── Init contentEditable — attach input listener once on mount ──
   *  Seeding innerHTML is intentionally separated into the effect below
   *  so that edit-mode content (loaded async) is available when we seed.
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = contentEditableRef.current;
    if (!el) return;
    contentInitRef.current = true;
    // Ensure Enter creates <p> elements, not <div> (Chrome default)
    document.execCommand("defaultParagraphSeparator", false, "p");
    let timer;
    const handleBeforeInputHistory = (event) => {
      if (editorHistoryRestoringRef.current) return;
      if (!event.inputType || event.inputType === "historyUndo" || event.inputType === "historyRedo") return;
      if (!el.contains(event.target)) return;
      pushEditorHistorySnapshot();
    };
    const handleInput = () => {
      if (editorHistoryRestoringRef.current) return;
      syncApiMethodBadges(el);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setForm(p => ({ ...p, content: el.innerHTML }));
      }, 800);
      if (editorSettings.autosave) triggerAutoSave();
    };
    el.addEventListener("beforeinput", handleBeforeInputHistory, true);
    el.addEventListener("input", handleInput);
    return () => {
      el.removeEventListener("beforeinput", handleBeforeInputHistory, true);
      el.removeEventListener("input", handleInput);
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // re-runs when editor mounts (edit mode renders loading spinner first, so editor div is absent on initial mount)

  /* ── Seed editor content once data is ready ──
   *  For new posts: loading=false from the start → seeds immediately.
   *  For edit mode: loading flips false after fetch → seeds with real content.
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (loading) return;
    const el = contentEditableRef.current;
    if (!el) return;
    el.innerHTML = normalizeTechnicalBlocksHtml(normalizeCodeBlocksHtml(form.content || ""));
    editorUndoStackRef.current = [];
    editorRedoStackRef.current = [];
    el.querySelectorAll(".awp-codeblock").forEach((block) => {
      const codeNode = block.querySelector(".awp-codeblock-code");
      if (!codeNode) return;
      const language = block.getAttribute("data-code-language") || "plaintext";
      const codeText = codeNode.textContent || "";
      codeNode.innerHTML = renderHighlightedCodeWithLines(codeText, language);
      codeNode.dataset.raw = codeText;
    });
    // Auto-focus the editor and place cursor at the end
    el.focus();
    if (el.childNodes.length > 0) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false); // collapse to end
      sel.removeAllRanges();
      sel.addRange(range);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // re-runs only when loading state changes

  /* ── Sync block-type dropdown with cursor position ── */
  useEffect(() => {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!editorEl.contains(range.commonAncestorContainer)) return;

      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

      while (node && node !== editorEl) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const t = node.tagName.toLowerCase();
          const match = BLOCK_ITEMS.find((b) => b.tag === t);
          if (match) {
            setSelectedBlock((prev) => (prev.tag !== match.tag ? match : prev));
            return;
          }
        }
        node = node.parentElement;
      }
      // Cursor is at top level of editor — default to Paragraph
      setSelectedBlock((prev) => (prev.tag !== "p" ? BLOCK_ITEMS[0] : prev));
    }

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [loading]);

  /* ── Image click-to-select / deselect ── */
  useEffect(() => {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    const onImgClick = (e) => {
      if (e.target.tagName === "IMG" && editorEl.contains(e.target)) {
        const r = e.target.getBoundingClientRect();
        setSelectedImg(e.target);
        setImgOverlayPos({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };

    const onDocClick = (e) => {
      if (!e.target.closest?.(".aimg-overlay") && e.target.tagName !== "IMG") {
        clearSelectedImageOverlay();
      }
    };

    const onScroll = () => {
      clearSelectedImageOverlay();
    };

    editorEl.addEventListener("click", onImgClick);
    document.addEventListener("click", onDocClick);
    editorEl.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return () => {
      editorEl.removeEventListener("click", onImgClick);
      document.removeEventListener("click", onDocClick);
      editorEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [clearSelectedImageOverlay, loading]);

  useEffect(() => {
    const editorEl = contentEditableRef.current;
    if (!editorEl || !selectedImg) return;

    let rafId = 0;
    const runSync = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        syncSelectedImageOverlay();
      });
    };

    const observer = new MutationObserver(runSync);
    observer.observe(editorEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "class", "width", "height"],
    });

    document.addEventListener("selectionchange", runSync);
    document.addEventListener("input", runSync, true);
    window.addEventListener("resize", runSync);
    window.addEventListener("scroll", runSync, true);
    runSync();

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      document.removeEventListener("selectionchange", runSync);
      document.removeEventListener("input", runSync, true);
      window.removeEventListener("resize", runSync);
      window.removeEventListener("scroll", runSync, true);
    };
  }, [selectedImg, syncSelectedImageOverlay]);

  useEffect(() => {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    const closeAllMenus = () => {
      editorEl.querySelectorAll(".awp-codeblock-lang-wrap.is-open, .bp-codeblock-lang-wrap.is-open").forEach((node) => {
        node.classList.remove("is-open");
      });
    };

    const syncLanguageSelection = (block, languageId) => {
      block.querySelectorAll(".awp-codeblock-lang-option, .bp-codeblock-lang-option").forEach((option) => {
        option.classList.toggle("is-selected", option.getAttribute("data-code-lang") === languageId);
      });
    };

    const highlightCodeBlock = (block, preserveCaret = false) => {
      const codeNode = block.querySelector(".awp-codeblock-code, .bp-codeblock-code");
      if (!codeNode) return;
      const language = block.getAttribute("data-code-language") || "plaintext";
      const codeText = getCodeTextWithLineBreaks(codeNode);
      const caretOffset = preserveCaret ? getCaretCharacterOffsetWithin(codeNode) : 0;
      codeNode.innerHTML = renderHighlightedCodeWithLines(codeText, language);
      codeNode.dataset.raw = codeText;
      if (preserveCaret) setCaretPosition(codeNode, caretOffset);
    };

    const highlightAllCodeBlocks = () => {
      editorEl.querySelectorAll(".awp-codeblock").forEach((block) => {
        highlightCodeBlock(block, false);
      });
    };

    const getTargetElement = (target) => {
      if (target instanceof Element) return target;
      if (target && target.parentElement) return target.parentElement;
      return null;
    };

    const getFocusedCodeNode = (targetEl) => {
      const fromTarget = targetEl?.closest?.(".awp-codeblock-code, .bp-codeblock-code");
      if (fromTarget && editorEl.contains(fromTarget)) return fromTarget;
      const sel = window.getSelection();
      const anchor = sel?.anchorNode;
      const anchorEl = anchor instanceof Element ? anchor : anchor?.parentElement;
      const fromSelection = anchorEl?.closest?.(".awp-codeblock-code, .bp-codeblock-code");
      if (fromSelection && editorEl.contains(fromSelection)) return fromSelection;
      return null;
    };

    const insertTextInCodeNode = (codeNode, insertedText) => {
      const currentText = getCodeTextWithLineBreaks(codeNode, true);
      const { start, end } = getSelectionCharacterOffsetsWithin(codeNode);
      const safeStart = Math.max(0, Math.min(start, currentText.length));
      const safeEnd = Math.max(safeStart, Math.min(end, currentText.length));
      const text = String(insertedText || "");
      const nextText = `${currentText.slice(0, safeStart)}${text}${currentText.slice(safeEnd)}`;
      const block = codeNode.closest(".awp-codeblock, .bp-codeblock");
      if (!block) return;
      const language = block.getAttribute("data-code-language") || "plaintext";
      pushEditorHistorySnapshot();
      codeNode.innerHTML = renderHighlightedCodeWithLines(nextText, language);
      codeNode.dataset.raw = nextText;
      setCaretPosition(codeNode, safeStart + text.length);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
    };

    const insertNewLineInCodeNode = (codeNode) => {
      insertTextInCodeNode(codeNode, "\n");
    };

    let detailsAddLock = 0;
    const addDetailsSection = (detailsAddBtn) => {
      const now = Date.now();
      if (now < detailsAddLock) return false;
      detailsAddLock = now + 250;
      const block = detailsAddBtn.closest('.awp-technical-block[data-technical-type="details"]');
      if (!block) return false;
      pushEditorHistorySnapshot();
      const section = document.createElement("details");
      section.className = "awp-details";
      section.setAttribute("open", "");
      section.innerHTML = [
        "<summary>Additional detail</summary>",
        "<p>Add supporting context, edge cases, or implementation notes here.</p>",
      ].join("");
      block.insertBefore(section, detailsAddBtn);
      const summary = section.querySelector("summary");
      if (summary) setCaretPosition(summary, summary.textContent.length);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      return true;
    };

    let referencesAddLock = 0;
    const addReferenceItem = (referencesAddBtn) => {
      const now = Date.now();
      if (now < referencesAddLock) return false;
      referencesAddLock = now + 250;
      const block = referencesAddBtn.closest(".awp-references");
      if (!block) return false;
      pushEditorHistorySnapshot();
      let list = block.querySelector("ol");
      if (!list) {
        list = document.createElement("ol");
        const title = block.querySelector("strong");
        title?.insertAdjacentElement("afterend", list);
      }
      const item = document.createElement("li");
      item.innerHTML = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Reference title</a>';
      list.appendChild(item);
      const link = item.querySelector("a");
      if (link) setCaretPosition(link, link.textContent.length);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      return true;
    };

    let faqAddLock = 0;
    const addFaqItem = (faqAddBtn) => {
      const now = Date.now();
      if (now < faqAddLock) return false;
      faqAddLock = now + 250;
      const block = faqAddBtn.closest(".awp-faq-block");
      if (!block) return false;
      pushEditorHistorySnapshot();
      const item = document.createElement("details");
      item.setAttribute("open", "");
      item.innerHTML = [
        "<summary>New question?</summary>",
        "<p>Add a clear answer, caveat, or example here.</p>",
      ].join("");
      block.insertBefore(item, faqAddBtn);
      const summary = item.querySelector("summary");
      if (summary) setCaretPosition(summary, summary.textContent.length);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      return true;
    };

    const addTableRow = (addBtn, config) => {
      const now = Date.now();
      if (now < config.lock.value) return false;
      config.lock.value = now + 250;
      const block = addBtn.closest(config.blockSelector);
      if (!block) return false;
      pushEditorHistorySnapshot();
      let table = block.querySelector("table");
      if (!table) {
        table = document.createElement("table");
        table.className = "awp-table";
        table.innerHTML = config.emptyTableHtml;
        const title = block.querySelector("strong");
        title?.insertAdjacentElement("afterend", table);
      }
      const tbody = table.querySelector("tbody") || table.appendChild(document.createElement("tbody"));
      const row = document.createElement("tr");
      row.innerHTML = config.rowHtml;
      tbody.appendChild(row);
      const firstCell = row.querySelector("td");
      if (firstCell) setCaretPosition(firstCell, firstCell.textContent.length);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      return true;
    };
    const troubleshootingLock = { value: 0 };
    const glossaryLock = { value: 0 };
    const benchmarkLock = { value: 0 };
    const environmentLock = { value: 0 };
    const testingLock = { value: 0 };
    const prerequisitesLock = { value: 0 };
    const stepsLock = { value: 0 };
    const addTroubleshootingRow = (troubleshootingAddBtn) => addTableRow(troubleshootingAddBtn, {
      lock: troubleshootingLock,
      blockSelector: ".awp-troubleshooting",
      emptyTableHtml: "<tbody><tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr></tbody>",
      rowHtml: "<td>New symptom</td><td>Likely cause</td><td>Action to resolve it</td>",
    });
    const addGlossaryRow = (glossaryAddBtn) => addTableRow(glossaryAddBtn, {
      lock: glossaryLock,
      blockSelector: ".awp-glossary",
      emptyTableHtml: "<tbody><tr><th>Term</th><th>Meaning</th></tr></tbody>",
      rowHtml: "<td>New term</td><td>Short meaning in plain language.</td>",
    });
    const addBenchmarkRow = (benchmarkAddBtn) => addTableRow(benchmarkAddBtn, {
      lock: benchmarkLock,
      blockSelector: ".awp-benchmark",
      emptyTableHtml: "<tbody><tr><th>Scenario</th><th>Before</th><th>After</th><th>Notes</th></tr></tbody>",
      rowHtml: "<td>New scenario</td><td>Before value</td><td>After value</td><td>Measurement notes</td>",
    });
    const addEnvironmentRow = (environmentAddBtn) => addTableRow(environmentAddBtn, {
      lock: environmentLock,
      blockSelector: ".awp-environment",
      emptyTableHtml: "<tbody><tr><th>Tool</th><th>Version</th><th>Notes</th></tr></tbody>",
      rowHtml: "<td>Tool name</td><td>Version</td><td>Why it matters</td>",
    });
    const addTestingRow = (testingAddBtn) => addTableRow(testingAddBtn, {
      lock: testingLock,
      blockSelector: ".awp-testing",
      emptyTableHtml: "<tbody><tr><th>Case</th><th>Command</th><th>Expected result</th></tr></tbody>",
      rowHtml: "<td>New test case</td><td><code>npm test</code></td><td>Expected behavior</td>",
    });
    const addListItem = (addBtn, config) => {
      const now = Date.now();
      if (now < config.lock.value) return false;
      config.lock.value = now + 250;
      const block = addBtn.closest(config.blockSelector);
      const list = block?.querySelector(config.listSelector);
      if (!list) return false;
      pushEditorHistorySnapshot();
      const item = document.createElement("li");
      item.innerHTML = config.itemHtml;
      list.appendChild(item);
      setCaretPosition(item, item.textContent.length);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      return true;
    };
    const addPrerequisiteItem = (addBtn) => addListItem(addBtn, {
      lock: prerequisitesLock,
      blockSelector: ".awp-prerequisites",
      listSelector: "ul",
      itemHtml: "New prerequisite",
    });
    const addStepItem = (addBtn) => addListItem(addBtn, {
      lock: stepsLock,
      blockSelector: ".awp-steps",
      listSelector: "ol",
      itemHtml: "Describe the next implementation step.",
    });

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

    const resolveAction = (actionEl) => {
      const explicit = actionEl.getAttribute("data-code-action");
      if (explicit) return explicit;
      if (actionEl.classList.contains("awp-codeblock-lang-btn") || actionEl.classList.contains("bp-codeblock-lang-btn")) return "toggle-lang";
      if (actionEl.classList.contains("awp-codeblock-lang-option") || actionEl.classList.contains("bp-codeblock-lang-option")) return "select-lang";
      if (actionEl.classList.contains("awp-codeblock-copy") || actionEl.classList.contains("bp-codeblock-copy")) return "copy";
      if (actionEl.classList.contains("awp-codeblock-remove") || actionEl.classList.contains("bp-codeblock-close")) return "remove";
      return "";
    };

    const runCodeAction = async (actionEl, event) => {
      const block = actionEl.closest(".awp-codeblock, .bp-codeblock");
      if (!block) return;

      const action = resolveAction(actionEl);
      if (action === "toggle-lang") {
        event.preventDefault();
        event.stopPropagation();
        const wrap = actionEl.closest(".awp-codeblock-lang-wrap, .bp-codeblock-lang-wrap");
        if (!wrap) return;
        const willOpen = !wrap.classList.contains("is-open");
        closeAllMenus();
        if (willOpen) {
          syncLanguageSelection(block, block.getAttribute("data-code-language") || "plaintext");
          wrap.classList.add("is-open");
          const searchInput = wrap.querySelector(".awp-codeblock-lang-search-input, .bp-codeblock-lang-search-input");
          if (searchInput) {
            searchInput.value = "";
            wrap.querySelectorAll(".awp-codeblock-lang-option, .bp-codeblock-lang-option").forEach((option) => {
              option.classList.remove("is-filtered-out");
            });
            setTimeout(() => searchInput.focus(), 0);
          }
        }
        return;
      }

      if (action === "select-lang") {
        event.preventDefault();
        event.stopPropagation();
        const nextLang = actionEl.getAttribute("data-code-lang") || toLangId(actionEl.textContent?.trim());
        const nextLabel = actionEl.getAttribute("data-code-label") || actionEl.textContent?.trim() || "Plain Text";
        pushEditorHistorySnapshot();
        block.setAttribute("data-code-language", nextLang);
        const label = block.querySelector(".awp-codeblock-lang-label, .bp-codeblock-lang-label, .bp-codeblock-lang, .bp-codeblock-lang-btn");
        if (label) label.textContent = nextLabel;
        syncLanguageSelection(block, nextLang);
        highlightCodeBlock(block, false);
        closeAllMenus();
        return;
      }

      if (action === "copy") {
        event.preventDefault();
        event.stopPropagation();
        const codeNode = block.querySelector(".awp-codeblock-code, .bp-codeblock-code");
        const text = codeNode?.textContent || "";
        try {
          await copyWithFallback(text);
          toast?.addToast("Code copied.", "success");
        } catch {
          toast?.addToast("Copy failed.", "error");
        }
        return;
      }

      if (action === "remove") {
        event.preventDefault();
        event.stopPropagation();
        pushEditorHistorySnapshot();
        block.remove();
        setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      }
    };

    const handleEditorMouseDown = async (event) => {
      const targetEl = getTargetElement(event.target);
      if (!targetEl) return;
      const detailsAddBtn = targetEl.closest(".awp-details-add");
      if (detailsAddBtn && editorEl.contains(detailsAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addDetailsSection(detailsAddBtn);
        return;
      }
      const referencesAddBtn = targetEl.closest(".awp-references-add");
      if (referencesAddBtn && editorEl.contains(referencesAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addReferenceItem(referencesAddBtn);
        return;
      }
      const faqAddBtn = targetEl.closest(".awp-faq-add");
      if (faqAddBtn && editorEl.contains(faqAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addFaqItem(faqAddBtn);
        return;
      }
      const troubleshootingAddBtn = targetEl.closest(".awp-troubleshooting-add");
      if (troubleshootingAddBtn && editorEl.contains(troubleshootingAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addTroubleshootingRow(troubleshootingAddBtn);
        return;
      }
      const glossaryAddBtn = targetEl.closest(".awp-glossary-add");
      if (glossaryAddBtn && editorEl.contains(glossaryAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addGlossaryRow(glossaryAddBtn);
        return;
      }
      const benchmarkAddBtn = targetEl.closest(".awp-benchmark-add");
      if (benchmarkAddBtn && editorEl.contains(benchmarkAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addBenchmarkRow(benchmarkAddBtn);
        return;
      }
      const environmentAddBtn = targetEl.closest(".awp-environment-add");
      if (environmentAddBtn && editorEl.contains(environmentAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addEnvironmentRow(environmentAddBtn);
        return;
      }
      const testingAddBtn = targetEl.closest(".awp-testing-add");
      if (testingAddBtn && editorEl.contains(testingAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addTestingRow(testingAddBtn);
        return;
      }
      const prerequisitesAddBtn = targetEl.closest(".awp-prerequisites-add");
      if (prerequisitesAddBtn && editorEl.contains(prerequisitesAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addPrerequisiteItem(prerequisitesAddBtn);
        return;
      }
      const stepsAddBtn = targetEl.closest(".awp-steps-add");
      if (stepsAddBtn && editorEl.contains(stepsAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addStepItem(stepsAddBtn);
        return;
      }
      const checklistInput = targetEl.closest(".awp-checklist input[type='checkbox']");
      if (checklistInput && editorEl.contains(checklistInput)) {
        checklistInput.removeAttribute("disabled");
        checklistInput.setAttribute("contenteditable", "false");
        return;
      }
      const technicalRemoveBtn = targetEl.closest(".awp-technical-remove");
      if (technicalRemoveBtn && editorEl.contains(technicalRemoveBtn)) {
        event.preventDefault();
        event.stopPropagation();
        const block = technicalRemoveBtn.closest(".awp-technical-block");
        const after = block?.nextElementSibling;
        pushEditorHistorySnapshot();
        block?.remove();
        if (after?.tagName === "P" && !after.textContent.trim()) after.remove();
        setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
        return;
      }
      const terminalRemoveBtn = targetEl.closest(".awp-terminal-remove");
      if (terminalRemoveBtn && editorEl.contains(terminalRemoveBtn)) {
        event.preventDefault();
        event.stopPropagation();
        const terminal = terminalRemoveBtn.closest(".awp-terminal");
        const after = terminal?.nextElementSibling;
        pushEditorHistorySnapshot();
        terminal?.remove();
        if (after?.tagName === "P" && !after.textContent.trim()) after.remove();
        setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
        return;
      }
      const terminalCopyBtn = targetEl.closest(".awp-terminal-copy");
      if (terminalCopyBtn && editorEl.contains(terminalCopyBtn)) {
        event.preventDefault();
        event.stopPropagation();
        const terminal = terminalCopyBtn.closest(".awp-terminal");
        const text = terminal?.querySelector("pre")?.textContent || "";
        if (!text.trim()) return;
        try {
          await copyWithFallback(text);
          const old = terminalCopyBtn.textContent;
          terminalCopyBtn.textContent = "Copied";
          setTimeout(() => {
            terminalCopyBtn.innerHTML = '<i class="far fa-copy" aria-hidden="true"></i> Copy';
          }, 1200);
          if (!old) terminalCopyBtn.innerHTML = '<i class="far fa-copy" aria-hidden="true"></i> Copy';
        } catch {
          toast?.addToast("Copy failed.", "error");
        }
        return;
      }
      const videoRemoveBtn = targetEl.closest("[data-video-remove]");
      if (videoRemoveBtn && editorEl.contains(videoRemoveBtn)) {
        event.preventDefault();
        event.stopPropagation();
        const wrap = videoRemoveBtn.closest(".awp-video-wrap");
        pushEditorHistorySnapshot();
        wrap?.remove();
        setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
        return;
      }
      const tocRemoveBtn = targetEl.closest("[data-toc-remove]");
      if (tocRemoveBtn && editorEl.contains(tocRemoveBtn)) {
        event.preventDefault();
        event.stopPropagation();
        const nav = tocRemoveBtn.closest(".awp-toc");
        pushEditorHistorySnapshot();
        nav?.remove();
        setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
        return;
      }
      if (targetEl.closest(".awp-codeblock-lang-search, .bp-codeblock-lang-search")) return;
      const actionEl = targetEl.closest("[data-code-action], .awp-codeblock-lang-btn, .awp-codeblock-lang-option, .awp-codeblock-copy, .awp-codeblock-remove, .bp-codeblock-lang-btn, .bp-codeblock-lang-option, .bp-codeblock-copy, .bp-codeblock-close");
      if (!actionEl || !editorEl.contains(actionEl)) {
        // Clicked inside the editor but not on a code-block action — close any open language dropdown.
        closeAllMenus();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      await runCodeAction(actionEl, event);
    };

    let checklistAddLock = 0;
    const handleEditorClick = (event) => {
      const targetEl = getTargetElement(event.target);
      if (!targetEl) return;

      // Click on anchor badge → remove it
      const anchorBadge = targetEl.closest(".awp-anchor");
      if (anchorBadge && editorEl.contains(anchorBadge)) {
        event.preventDefault();
        event.stopPropagation();
        pushEditorHistorySnapshot();
        anchorBadge.remove();
        setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
        return;
      }

      const checklistAddBtn = targetEl.closest(".awp-checklist-add");
      if (checklistAddBtn && editorEl.contains(checklistAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        if (now < checklistAddLock) return;
        checklistAddLock = now + 250;

        const list = checklistAddBtn.previousElementSibling?.classList?.contains("awp-checklist")
          ? checklistAddBtn.previousElementSibling
          : checklistAddBtn.closest(".awp-technical-block")?.querySelector(".awp-checklist");
        if (!list) return;
        const item = document.createElement("li");
        item.innerHTML = '<input type="checkbox" contenteditable="false"> New checklist item';
        pushEditorHistorySnapshot();
        list.appendChild(item);
        setCaretPosition(item, item.textContent.length);
        setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
        return;
      }

      const detailsAddBtn = targetEl.closest(".awp-details-add");
      if (detailsAddBtn && editorEl.contains(detailsAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        const block = detailsAddBtn.closest('.awp-technical-block[data-technical-type="details"]');
        if (!block) return;
        addDetailsSection(detailsAddBtn);
        return;
      }

      const referencesAddBtn = targetEl.closest(".awp-references-add");
      if (referencesAddBtn && editorEl.contains(referencesAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addReferenceItem(referencesAddBtn);
        return;
      }

      const faqAddBtn = targetEl.closest(".awp-faq-add");
      if (faqAddBtn && editorEl.contains(faqAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addFaqItem(faqAddBtn);
        return;
      }

      const troubleshootingAddBtn = targetEl.closest(".awp-troubleshooting-add");
      if (troubleshootingAddBtn && editorEl.contains(troubleshootingAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addTroubleshootingRow(troubleshootingAddBtn);
        return;
      }

      const glossaryAddBtn = targetEl.closest(".awp-glossary-add");
      if (glossaryAddBtn && editorEl.contains(glossaryAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addGlossaryRow(glossaryAddBtn);
        return;
      }

      const benchmarkAddBtn = targetEl.closest(".awp-benchmark-add");
      if (benchmarkAddBtn && editorEl.contains(benchmarkAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addBenchmarkRow(benchmarkAddBtn);
        return;
      }

      const environmentAddBtn = targetEl.closest(".awp-environment-add");
      if (environmentAddBtn && editorEl.contains(environmentAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addEnvironmentRow(environmentAddBtn);
        return;
      }

      const testingAddBtn = targetEl.closest(".awp-testing-add");
      if (testingAddBtn && editorEl.contains(testingAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addTestingRow(testingAddBtn);
        return;
      }

      const prerequisitesAddBtn = targetEl.closest(".awp-prerequisites-add");
      if (prerequisitesAddBtn && editorEl.contains(prerequisitesAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addPrerequisiteItem(prerequisitesAddBtn);
        return;
      }

      const stepsAddBtn = targetEl.closest(".awp-steps-add");
      if (stepsAddBtn && editorEl.contains(stepsAddBtn)) {
        event.preventDefault();
        event.stopPropagation();
        addStepItem(stepsAddBtn);
        return;
      }

      const checklistInput = targetEl.closest(".awp-checklist input[type='checkbox']");
      if (checklistInput && editorEl.contains(checklistInput)) {
        pushEditorHistorySnapshot();
        checklistInput.removeAttribute("disabled");
        checklistInput.setAttribute("contenteditable", "false");
        setTimeout(() => {
          setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
          if (editorSettings.autosave) triggerAutoSave();
        }, 0);
      }
    };

    const handleDocumentKeyDown = async (event) => {
      const targetEl = getTargetElement(event.target);

      if ((event.metaKey || event.ctrlKey) && targetEl && editorEl.contains(targetEl)) {
        const key = event.key.toLowerCase();
        const wantsUndo = key === "z" && !event.shiftKey;
        const wantsRedo = key === "y" || (key === "z" && event.shiftKey);
        if (wantsUndo && undoEditorHistorySnapshot()) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (wantsRedo && redoEditorHistorySnapshot()) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      if (event.key === "Escape") {
        const hasOpen = editorEl.querySelectorAll(".awp-codeblock-lang-wrap.is-open, .bp-codeblock-lang-wrap.is-open").length > 0;
        if (hasOpen) {
          event.stopPropagation();
          closeAllMenus();
          return;
        }
      }

      if (event.key === "Enter") {
        const codeNode = getFocusedCodeNode(targetEl);
        if (codeNode) {
          event.preventDefault();
          event.stopPropagation();
          insertNewLineInCodeNode(codeNode);
          return;
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        if (targetEl?.matches("input, textarea")) return;

        const codeNode = getFocusedCodeNode(targetEl);
        if (codeNode) {
          // Inside code block: select code text only.
          event.preventDefault();
          event.stopPropagation();
          const range = document.createRange();
          range.selectNodeContents(codeNode);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          return;
        }

        // Outside code block: allow browser/editor default select-all.
      }

      if (!(["Enter", " "].includes(event.key))) return;
      if (!targetEl) return;
      if (targetEl.closest(".awp-codeblock-lang-search, .bp-codeblock-lang-search")) return;
      const actionEl = targetEl.closest("[data-code-action], .awp-codeblock-lang-btn, .awp-codeblock-lang-option, .awp-codeblock-copy, .awp-codeblock-remove, .bp-codeblock-lang-btn, .bp-codeblock-lang-option, .bp-codeblock-copy, .bp-codeblock-close");
      if (!actionEl || !editorEl.contains(actionEl)) return;
      await runCodeAction(actionEl, event);
    };

    const handleDocumentInput = (event) => {
      const targetEl = getTargetElement(event.target);
      if (!targetEl || !targetEl.matches(".awp-codeblock-lang-search-input, .bp-codeblock-lang-search-input")) return;
      const wrap = targetEl.closest(".awp-codeblock-lang-wrap, .bp-codeblock-lang-wrap");
      if (!wrap) return;
      const query = targetEl.value.trim().toLowerCase();
      wrap.querySelectorAll(".awp-codeblock-lang-option, .bp-codeblock-lang-option").forEach((option) => {
        const label = (option.getAttribute("data-code-label") || option.textContent || "").toLowerCase();
        option.classList.toggle("is-filtered-out", query.length > 0 && !label.includes(query));
      });
    };

    const handleDocumentPaste = (event) => {
      const targetEl = getTargetElement(event.target);
      const codeNode = getFocusedCodeNode(targetEl);
      if (!codeNode) return;

      const pasted = event.clipboardData?.getData("text/plain")
        || window.clipboardData?.getData("Text")
        || "";
      event.preventDefault();
      event.stopPropagation();
      insertTextInCodeNode(codeNode, pasted.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
    };

    const handleDocumentKeyUp = (event) => {
      if (event.key !== "Enter") return;
      const targetEl = getTargetElement(event.target);
      const codeNode = getFocusedCodeNode(targetEl);
      if (!codeNode) return;
      const block = codeNode.closest(".awp-codeblock, .bp-codeblock");
      if (!block) return;
      highlightCodeBlock(block, true);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
    };

    const handleBeforeInput = (event) => {
      const nativeEvent = event;
      if (!nativeEvent || !["insertParagraph", "insertLineBreak"].includes(nativeEvent.inputType)) return;
      const targetEl = getTargetElement(event.target);
      const codeNode = getFocusedCodeNode(targetEl);
      if (!codeNode) return;
      event.preventDefault();
      event.stopPropagation();
      insertNewLineInCodeNode(codeNode);
    };

    const handleCodeInput = (event) => {
      const targetEl = getTargetElement(event.target);
      if (!targetEl) return;
      const codeNode = targetEl.closest(".awp-codeblock-code, .bp-codeblock-code");
      if (!codeNode || !editorEl.contains(codeNode)) return;
      const block = codeNode.closest(".awp-codeblock, .bp-codeblock");
      if (!block) return;
      highlightCodeBlock(block, true);
    };

    const handleDocMouseDown = (event) => {
      const targetEl = getTargetElement(event.target);
      if (!targetEl) return;
      if (!editorEl.contains(targetEl)) closeAllMenus();
    };

    editorEl.addEventListener("mousedown", handleEditorMouseDown, true);
    editorEl.addEventListener("click", handleEditorClick, true);
    document.addEventListener("keydown", handleDocumentKeyDown, true);
    document.addEventListener("keyup", handleDocumentKeyUp, true);
    document.addEventListener("input", handleDocumentInput, true);
    document.addEventListener("paste", handleDocumentPaste, true);
    document.addEventListener("beforeinput", handleBeforeInput, true);
    editorEl.addEventListener("input", handleCodeInput, true);
    document.addEventListener("mousedown", handleDocMouseDown);
    highlightAllCodeBlocks();
    return () => {
      editorEl.removeEventListener("mousedown", handleEditorMouseDown, true);
      editorEl.removeEventListener("click", handleEditorClick, true);
      document.removeEventListener("keydown", handleDocumentKeyDown, true);
      document.removeEventListener("keyup", handleDocumentKeyUp, true);
      document.removeEventListener("input", handleDocumentInput, true);
      document.removeEventListener("paste", handleDocumentPaste, true);
      document.removeEventListener("beforeinput", handleBeforeInput, true);
      editorEl.removeEventListener("input", handleCodeInput, true);
      document.removeEventListener("mousedown", handleDocMouseDown);
    };
  }, [toast, loading]); // loading added: editor div absent on initial mount in edit mode, must re-run once it appears

  /* ── Cover image upload ── */
  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.includes(file.type)) {
      toast?.addToast("Only JPEG, PNG, WebP, GIF, or AVIF images are allowed.", "error");
      return;
    }
    if (file.size > maxUploadBytes) {
      toast?.addToast(`Image must be under ${maxUploadSizeMb} MB.`, "error");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const url = await uploadCoverImage(
        file,
        (pct) => setUploadPct(Math.round(pct)),
        form.image
      );
      setForm((prev) => ({ ...prev, image: url }));
      toast?.addToast("Cover image uploaded!", "success");
    } catch {
      toast?.addToast("Upload failed. Check Firebase Storage rules.", "error");
    } finally {
      setUploading(false);
      setUploadPct(0);
      // Reset input so same file can be re-selected
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  /* ── WYSIWYG helpers ── */
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    if (!savedRangeRef.current) return;
    contentEditableRef.current?.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRangeRef.current);
  }

  function placeCaretAtEditorEnd(editorEl) {
    if (!editorEl) return;
    editorEl.focus();
    const range = document.createRange();
    const target = editorEl.lastChild || editorEl;
    if (target.nodeType === Node.TEXT_NODE) {
      range.setStart(target, target.textContent.length);
    } else {
      range.selectNodeContents(target);
      range.collapse(false);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function pushEditorHistorySnapshot() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    const html = editorEl.innerHTML || "";
    const stack = editorUndoStackRef.current;
    if (stack[stack.length - 1] === html) return;
    stack.push(html);
    if (stack.length > 60) stack.shift();
    editorRedoStackRef.current = [];
  }

  function restoreEditorHistorySnapshot(html) {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    editorHistoryRestoringRef.current = true;
    editorEl.innerHTML = html || "";
    setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
    placeCaretAtEditorEnd(editorEl);
    setTimeout(() => {
      editorHistoryRestoringRef.current = false;
    }, 0);
  }

  function undoEditorHistorySnapshot() {
    const editorEl = contentEditableRef.current;
    const stack = editorUndoStackRef.current;
    if (!editorEl || stack.length === 0) return false;
    const current = editorEl.innerHTML || "";
    const previous = stack.pop();
    editorRedoStackRef.current.push(current);
    restoreEditorHistorySnapshot(previous);
    return true;
  }

  function redoEditorHistorySnapshot() {
    const editorEl = contentEditableRef.current;
    const stack = editorRedoStackRef.current;
    if (!editorEl || stack.length === 0) return false;
    const current = editorEl.innerHTML || "";
    const next = stack.pop();
    editorUndoStackRef.current.push(current);
    restoreEditorHistorySnapshot(next);
    return true;
  }

  /* ── Image resize ── */
  function startImgResize(e, dir) {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;
    const img = selectedImg;
    const startW = img.offsetWidth  || img.naturalWidth  || 200;
    const startH = img.offsetHeight || img.naturalHeight || 150;
    const aspectRatio = startW / (startH || 1);
    pushEditorHistorySnapshot();

    const onMove = (ev) => {
      const dx = ev.clientX - e.clientX;
      const dy = ev.clientY - e.clientY;
      let newW = startW;
      let newH = startH;

      if (dir.includes("e")) newW = Math.max(60, startW + dx);
      if (dir.includes("w")) newW = Math.max(60, startW - dx);
      if (dir.includes("s")) newH = Math.max(40, startH + dy);
      if (dir.includes("n")) newH = Math.max(40, startH - dy);

      // Corner handles: maintain aspect ratio
      if (dir.length === 2) {
        newH = Math.round(newW / aspectRatio);
      }

      img.style.width  = `${newW}px`;
      img.style.height = (dir.length === 2 || dir === "n" || dir === "s") ? `${newH}px` : "";

      const r = img.getBoundingClientRect();
      setImgOverlayPos({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (contentEditableRef.current) {
        setForm(p => ({ ...p, content: contentEditableRef.current.innerHTML }));
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /* ── Image alignment ── */
  function applyImgAlignment(align) {
    if (!selectedImg) return;
    const img = selectedImg;
    pushEditorHistorySnapshot();
    img.style.float = "none";
    img.style.margin = "";
    img.style.display = "block";

    if (align === "left") {
      img.style.float   = "left";
      img.style.display = "inline-block";
      img.style.margin  = "4px 16px 8px 0";
    } else if (align === "center") {
      img.style.margin = "8px auto";
    } else if (align === "right") {
      img.style.float   = "right";
      img.style.display = "inline-block";
      img.style.margin  = "4px 0 8px 16px";
    } else if (align === "full") {
      img.style.width  = "100%";
      img.style.height = "";
      img.style.margin = "8px 0";
    }

    setTimeout(() => {
      const r = img.getBoundingClientRect();
      setImgOverlayPos({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 0);
    setForm(p => ({ ...p, content: contentEditableRef.current?.innerHTML || "" }));
  }

  function execCmd(cmd, value = null) {
    if (cmd === "undo" && undoEditorHistorySnapshot()) return;
    if (cmd === "redo" && redoEditorHistorySnapshot()) return;
    if (cmd !== "undo" && cmd !== "redo") pushEditorHistorySnapshot();
    document.execCommand(cmd, false, value);
    setForm(p => ({ ...p, content: contentEditableRef.current?.innerHTML || "" }));
  }

  /* Wraps the current selection in <span style="color: hex"> so the output is
     consistent across all browsers and DOMPurify never needs to handle <font>. */
  function applyFontColor(color) {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return; // nothing selected — do nothing

    pushEditorHistorySnapshot();

    try {
      const span = document.createElement("span");
      span.style.color = color;
      // surroundContents fails if the selection partially overlaps an element.
      // In that case, extract → wrap → reinsert.
      try {
        range.surroundContents(span);
      } catch {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
    } catch {
      // Last-resort fallback
      document.execCommand("foreColor", false, color);
    }
    setForm(p => ({ ...p, content: contentEditableRef.current?.innerHTML || "" }));
  }

  function execBlock(newTag) {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    // Restore saved selection; if none, just focus the editor
    if (savedRangeRef.current) {
      restoreSelection();
    } else {
      editorEl.focus();
    }

    const sel = window.getSelection();
    if (!sel) return;

    // If no range exists yet, place cursor at end of editor
    if (sel.rangeCount === 0) {
      const r = document.createRange();
      r.selectNodeContents(editorEl);
      r.collapse(false);
      sel.addRange(r);
    }

    const range = sel.getRangeAt(0);

    // Walk up from the cursor to find the nearest block-level direct child of the editor
    let blockEl = range.commonAncestorContainer;
    if (blockEl.nodeType === Node.TEXT_NODE) blockEl = blockEl.parentElement;

    while (blockEl && blockEl.parentElement !== editorEl) {
      blockEl = blockEl.parentElement;
    }

    // Skip code blocks entirely — they manage their own structure
    if (
      !blockEl ||
      blockEl === editorEl ||
      blockEl.classList?.contains("awp-codeblock") ||
      blockEl.classList?.contains("bp-codeblock")
    ) {
      // Fallback for deeply nested or unsupported nodes
      pushEditorHistorySnapshot();
      document.execCommand("formatBlock", false, `<${newTag}>`);
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      return;
    }

    const currentTag = blockEl.tagName.toLowerCase();

    // Toggle: selecting the same heading reverts to paragraph
    const targetTag = currentTag === newTag && newTag !== "p" ? "p" : newTag;

    if (currentTag === targetTag) {
      // Nothing to change
      setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
      return;
    }

    pushEditorHistorySnapshot();

    // Replace the block element with the new tag, preserving innerHTML
    const newEl = document.createElement(targetTag);
    newEl.innerHTML = blockEl.innerHTML;

    // Preserve class attribute (e.g. custom styling)
    if (blockEl.className) newEl.className = blockEl.className;

    blockEl.parentNode.replaceChild(newEl, blockEl);

    // Update the dropdown immediately (before selectionchange fires)
    const match = BLOCK_ITEMS.find((b) => b.tag === targetTag);
    if (match) setSelectedBlock(match);

    // Restore cursor inside the new element
    try {
      const newRange = document.createRange();
      const target = newEl.firstChild || newEl;
      newRange.setStart(target, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch (_) { /* ignore range errors on empty elements */ }

    setForm((p) => ({ ...p, content: editorEl.innerHTML || "" }));
  }

  /* ── Helper: wrap selected text in an inline element, or unwrap if cursor is already inside one.
   *   Uses Range API directly — avoids deprecated execCommand("insertHTML").
   *   tagName    : "code" | "kbd" | "mark" etc.
   *   className  : CSS class to add (e.g. "awp-inline-code")
   *   skipSelector: selector for ancestors where wrapping should be skipped (e.g. code-blocks)
   * ── */
  function toggleInlineWrapper(tagName, className, skipSelector = "") {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    restoreSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return;

    // Walk up from the anchor node to find an existing wrapper of this type
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const existing = node.closest?.(tagName);

    // If we found a wrapper AND it isn't inside a skip-selector ancestor → unwrap
    if (existing && editorEl.contains(existing) && (!skipSelector || !existing.closest(skipSelector))) {
      pushEditorHistorySnapshot();
      const parent = existing.parentNode;
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      parent.normalize();
    } else if (!range.collapsed) {
      pushEditorHistorySnapshot();
      // Wrap the selected text
      const el = document.createElement(tagName);
      if (className) el.className = className;
      try {
        // surroundContents works cleanly when selection stays within one block
        range.surroundContents(el);
      } catch {
        // Selection spans multiple block-level nodes → extract + re-insert
        const frag = range.extractContents();
        el.appendChild(frag);
        range.insertNode(el);
      }
      // Place caret after the newly wrapped element
      const after = document.createRange();
      after.setStartAfter(el);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }

    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
  }

  /* ── Inline code toggle ── */
  function toggleInlineCode() {
    toggleInlineWrapper("code", "awp-inline-code", ".awp-codeblock, .bp-codeblock");
  }

  /* ── Keyboard key toggle ── */
  function toggleKbd() {
    toggleInlineWrapper("kbd", "awp-kbd");
  }

  /* ── Highlight / mark toggle ── */
  function toggleHighlight() {
    toggleInlineWrapper("mark", "awp-mark");
  }

  /* ── Helper: find the direct-child block of editorEl that contains the caret ── */
  function getCaretBlock(editorEl) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node.parentElement !== editorEl) node = node.parentElement;
    return (node && node !== editorEl) ? node : null;
  }

  /* ── Horizontal rule ── */
  function insertHR() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    restoreSelection();
    pushEditorHistorySnapshot();

    const hr = document.createElement("hr");
    hr.className = "awp-hr";
    const after = document.createElement("p");
    after.innerHTML = "<br>";

    const block = getCaretBlock(editorEl);
    if (block) {
      block.after(hr);
      hr.after(after);
    } else {
      editorEl.appendChild(hr);
      editorEl.appendChild(after);
    }

    // Place caret in the paragraph after the rule
    const sel = window.getSelection();
    const r = document.createRange();
    r.setStart(after, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);

    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
  }

  /* ── Table insert ── */
  function insertTable(rows, cols) {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    restoreSelection();
    pushEditorHistorySnapshot();

    // Build table DOM
    const table = document.createElement("table");
    table.className = "awp-table";
    const tbody = document.createElement("tbody");
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(r === 0 ? "th" : "td");
        cell.innerHTML = "<br>";
        tr.appendChild(cell);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const after = document.createElement("p");
    after.innerHTML = "<br>";

    const block = getCaretBlock(editorEl);
    if (block) {
      block.after(table);
      table.after(after);
    } else {
      editorEl.appendChild(table);
      editorEl.appendChild(after);
    }

    // Place caret in the first cell
    const firstCell = table.querySelector("th, td");
    if (firstCell) {
      const sel = window.getSelection();
      const r = document.createRange();
      r.setStart(firstCell, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }

    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
    setTablePickerOpen(false);
    setTableHover({ rows: 0, cols: 0 });
  }

  /* ── Force line break (Shift+Enter equivalent) ── */
  function insertLineBreak() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return;
    pushEditorHistorySnapshot();
    range.deleteContents();
    const br = document.createElement("br");
    range.insertNode(br);
    const r = document.createRange();
    r.setStartAfter(br);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
  }

  /* ── Special character insert ── */
  function insertSpecialChar(char) {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    const sel = window.getSelection();
    let range = null;
    if (sel && sel.rangeCount > 0) {
      const activeRange = sel.getRangeAt(0);
      if (editorEl.contains(activeRange.commonAncestorContainer)) {
        range = activeRange;
      }
    }
    if (!range && savedRangeRef.current && editorEl.contains(savedRangeRef.current.commonAncestorContainer)) {
      range = savedRangeRef.current.cloneRange();
      editorEl.focus();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    if (!range) {
      editorEl.focus();
      range = document.createRange();
      range.selectNodeContents(editorEl);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    if (!editorEl.contains(range.commonAncestorContainer)) return;

    pushEditorHistorySnapshot();
    range.deleteContents();
    const textNode = document.createTextNode(char);
    range.insertNode(textNode);
    const r = document.createRange();
    r.setStartAfter(textNode);
    r.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
    setCharsOpen(false);
  }

  /* ── Video embed (YouTube / Vimeo) ── */
  function extractVideoEmbedSrc(rawUrl) {
    const url = (rawUrl || "").trim();
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (/^https?:\/\/(www\.)?(youtube\.com\/embed|player\.vimeo\.com\/video)/.test(url)) return url;
    return null;
  }

  function insertVideoEmbed() {
    const src = extractVideoEmbedSrc(embedUrl);
    if (!src) {
      toast?.addToast("Please enter a valid YouTube or Vimeo URL.", "error");
      return;
    }
    restoreSelection();
    const html = [
      '<div class="awp-video-wrap" contenteditable="false">',
      `<iframe class="awp-video-iframe" src="${escapeHtml(src)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`,
      '<button type="button" class="awp-video-remove" data-video-remove="true" aria-label="Remove video">×</button>',
      '</div><p><br></p>',
    ].join("");
    execInsertHtml(html);
    setEmbedOpen(false);
    setEmbedUrl("");
  }

  /* ── Anchor / bookmark ── */
  function insertAnchorMark() {
    const id = anchorId.trim().replace(/\s+/g, "-").toLowerCase();
    if (!id) {
      toast?.addToast("Please enter an anchor ID.", "error");
      return;
    }
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    const a = document.createElement("a");
    a.id = id;
    a.className = "awp-anchor";
    a.setAttribute("aria-hidden", "true");
    a.setAttribute("data-anchor", id);

    // Use savedRangeRef directly — avoids the focus() call in restoreSelection()
    // which can reset the browser selection before we read it back
    const saved = savedRangeRef.current;
    pushEditorHistorySnapshot();
    if (saved && editorEl.contains(saved.commonAncestorContainer)) {
      const insertRange = saved.cloneRange();
      insertRange.collapse(true); // insert at caret start, never delete text
      insertRange.insertNode(a);
    } else {
      // Fallback: append to end of editor
      const lastChild = editorEl.lastElementChild || editorEl;
      if (lastChild.after) {
        lastChild.after(a);
      } else {
        editorEl.appendChild(a);
      }
    }

    // Restore focus + place caret after the anchor
    editorEl.focus();
    const sel = window.getSelection();
    const r = document.createRange();
    r.setStartAfter(a);
    r.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(r);

    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
    setAnchorOpen(false);
    setAnchorId("");
  }

  /* ── Math / formula ── */
  function insertMath() {
    const formula = mathFormula.trim();
    if (!formula) { toast?.addToast("Please enter a formula.", "error"); return; }
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    if (mathType === "inline") {
      const saved = savedRangeRef.current;
      const span = document.createElement("span");
      span.className = "awp-math-inline";
      span.setAttribute("data-formula", formula);
      span.setAttribute("contenteditable", "false");
      span.textContent = formula;
      pushEditorHistorySnapshot();
      if (saved && editorEl.contains(saved.commonAncestorContainer)) {
        const r = saved.cloneRange();
        r.collapse(true);
        r.insertNode(span);
      } else {
        editorEl.appendChild(span);
      }
      editorEl.focus();
      const sel = window.getSelection();
      const r2 = document.createRange();
      r2.setStartAfter(span);
      r2.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(r2);
    } else {
      restoreSelection();
      execInsertHtml(
        `<div class="awp-math-block" data-formula="${escapeHtml(formula)}" contenteditable="false">` +
        `<span class="awp-math-block-label">math</span>` +
        `<span class="awp-math-block-formula">${escapeHtml(formula)}</span>` +
        `</div><p><br></p>`
      );
    }
    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
    setMathOpen(false);
    setMathFormula("");
  }

  /* ── Footnote ── */
  function insertFootnote() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    // Count existing footnote refs to get next number
    const existing = editorEl.querySelectorAll(".awp-fn-ref");
    const num = existing.length + 1;
    const saved = savedRangeRef.current;
    const sup = document.createElement("sup");
    sup.className = "awp-fn-ref";
    sup.setAttribute("data-fn", String(num));
    sup.setAttribute("contenteditable", "false");
    sup.textContent = `[${num}]`;
    pushEditorHistorySnapshot();
    if (saved && editorEl.contains(saved.commonAncestorContainer)) {
      const r = saved.cloneRange();
      r.collapse(true);
      r.insertNode(sup);
    } else {
      editorEl.appendChild(sup);
    }
    editorEl.focus();
    const sel = window.getSelection();
    const r2 = document.createRange();
    r2.setStartAfter(sup);
    r2.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(r2);
    // Find or create footnotes section at bottom
    let fnBlock = editorEl.querySelector(".awp-footnotes");
    if (!fnBlock) {
      fnBlock = document.createElement("div");
      fnBlock.className = "awp-footnotes";
      fnBlock.innerHTML = "<strong>Footnotes</strong><ol class=\"awp-fn-list\"></ol>";
      editorEl.appendChild(fnBlock);
    }
    const list = fnBlock.querySelector(".awp-fn-list") || fnBlock.appendChild(document.createElement("ol"));
    const li = document.createElement("li");
    li.id = `fn-${num}`;
    li.className = "awp-fn-item";
    li.innerHTML = `<span class="awp-fn-num">${num}.</span> Add footnote text here.`;
    list.appendChild(li);
    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
    toast?.addToast(`Footnote [${num}] inserted.`, "success");
  }

  /* ── Labeled divider ── */
  function insertLabeledDivider() {
    const label = dividerLabel.trim();
    restoreSelection();
    const html = label
      ? `<div class="awp-divider-label"><span>${escapeHtml(label)}</span></div><p><br></p>`
      : `<div class="awp-divider-label"></div><p><br></p>`;
    execInsertHtml(html);
    setDividerOpen(false);
    setDividerLabel("");
  }

  function insertGifIntoEditor(gif) {
    const safeUrl = escapeHtml(gif?.fullUrl || "");
    const altText = escapeHtml(gif?.title || "GIF");
    if (!safeUrl) {
      toast?.addToast("Unable to insert this GIF.", "error");
      return;
    }
    restoreSelection();
    contentEditableRef.current?.focus();
    pushEditorHistorySnapshot();
    document.execCommand(
      "insertHTML",
      false,
      `<img src="${safeUrl}" alt="${altText}" style="max-width:100%;border-radius:4px;margin:8px 0;display:block;" loading="lazy" />`
    );
    setForm((p) => ({ ...p, content: contentEditableRef.current?.innerHTML || "" }));
    savedRangeRef.current = null;
    setGifOpen(false);
    setGifSearch("");
    setGifResults([]);
    toast?.addToast("GIF inserted!", "success");
  }

  /* ── Auto Table of Contents ── */
  function getTOCHeadings(editorEl = contentEditableRef.current) {
    if (!editorEl) return [];
    return Array.from(editorEl.querySelectorAll("h1, h2, h3, h4"))
      .filter((heading) => !heading.closest(".awp-toc"))
      .filter((heading) => getTOCHeadingText(heading));
  }

  function insertTOC() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    const headings = getTOCHeadings(editorEl);

    if (headings.length === 0) {
      toast?.addToast("No headings found to build a table of contents.", "error");
      return;
    }

    const usedIds = new Set();
    headings.forEach((heading, index) => {
      const base = slugify(getTOCHeadingText(heading)) || `section-${index + 1}`;
      const current = heading.id?.trim();
      let nextId = current || base;
      let suffix = 2;
      while (usedIds.has(nextId)) {
        nextId = `${base}-${suffix}`;
        suffix += 1;
      }
      heading.id = nextId;
      usedIds.add(nextId);
    });

    pushEditorHistorySnapshot();

    editorEl.querySelectorAll(".awp-toc").forEach((toc) => toc.remove());

    const nav = document.createElement("nav");
    nav.className = "awp-toc";
    nav.setAttribute("contenteditable", "false");

    const title = document.createElement("strong");
    title.className = "awp-toc-title";
    title.textContent = tocTitle.trim() || "Table of Contents";
    nav.appendChild(title);

    const list = document.createElement("ol");
    list.className = "awp-toc-list";
    headings.forEach((heading) => {
      const item = document.createElement("li");
      item.className = `awp-toc-item awp-toc-${heading.tagName.toLowerCase()}`;
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = getTOCHeadingText(heading);
      item.appendChild(link);
      list.appendChild(item);
    });
    nav.appendChild(list);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "awp-toc-remove";
    removeBtn.dataset.tocRemove = "true";
    removeBtn.setAttribute("aria-label", "Remove TOC");
    removeBtn.textContent = "x";
    nav.appendChild(removeBtn);

    const after = document.createElement("p");
    after.innerHTML = "<br>";

    restoreSelection();
    const block = getCaretBlock(editorEl);
    if (block) {
      block.after(nav);
    } else {
      editorEl.insertBefore(nav, headings[0] || editorEl.firstChild);
    }
    nav.after(after);

    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(after, 0);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
    setTocOpen(false);
    toast?.addToast("Table of contents inserted.", "success");
  }

  function getTOCHeadingText(heading) {
    const clone = heading.cloneNode(true);
    clone.querySelectorAll(".awp-anchor, button, [contenteditable='false']").forEach((el) => el.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  /* ── Find & Replace helpers ── */
  function clearFindHighlights() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    editorEl.querySelectorAll(".awp-find-hl").forEach((m) => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
    findMatchesRef.current = [];
  }

  function runFind(query) {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return 0;
    clearFindHighlights();
    if (!query) { setFindStats({ total: 0, current: 0 }); return 0; }
    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        // Skip nodes inside non-editable UI buttons
        if (node.parentElement?.closest("[contenteditable='false']")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const ranges = [];
    const lower = query.toLowerCase();
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      let idx = 0;
      while ((idx = text.toLowerCase().indexOf(lower, idx)) !== -1) {
        const r = document.createRange();
        r.setStart(node, idx);
        r.setEnd(node, idx + query.length);
        ranges.push(r);
        idx += query.length;
      }
    }
    // Wrap each match — iterate in reverse to preserve offsets
    for (let i = ranges.length - 1; i >= 0; i--) {
      const mark = document.createElement("mark");
      mark.className = "awp-find-hl";
      mark.setAttribute("data-find-idx", String(i));
      try { ranges[i].surroundContents(mark); } catch { /* skip cross-node matches */ }
    }
    findMatchesRef.current = Array.from(editorEl.querySelectorAll(".awp-find-hl"));
    setFindStats({ total: findMatchesRef.current.length, current: findMatchesRef.current.length > 0 ? 1 : 0 });
    scrollToFindMatch(0);
    return findMatchesRef.current.length;
  }

  function scrollToFindMatch(idx) {
    const matches = findMatchesRef.current;
    if (!matches.length) return;
    matches.forEach((m, i) => m.classList.toggle("awp-find-hl--active", i === idx));
    matches[idx]?.scrollIntoView({ block: "nearest" });
  }

  function findNav(dir) {
    const matches = findMatchesRef.current;
    if (!matches.length) return;
    const next = (findStats.current - 1 + dir + matches.length) % matches.length;
    setFindStats(s => ({ ...s, current: next + 1 }));
    scrollToFindMatch(next);
  }

  function performReplace() {
    const matches = findMatchesRef.current;
    if (!matches.length) return;
    const idx = Math.max(0, findStats.current - 1);
    const target = matches[idx];
    if (!target) return;
    pushEditorHistorySnapshot();
    target.replaceWith(document.createTextNode(replaceQuery));
    setForm(p => ({ ...p, content: contentEditableRef.current?.innerHTML || "" }));
    runFind(findQuery);
  }

  function performReplaceAll() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    pushEditorHistorySnapshot();
    editorEl.querySelectorAll(".awp-find-hl").forEach((m) => {
      const txt = document.createTextNode(replaceQuery);
      m.replaceWith(txt);
    });
    findMatchesRef.current = [];
    setFindStats({ total: 0, current: 0 });
    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
    toast?.addToast("All occurrences replaced.", "success");
  }

  /* ── Clear block formatting ── */
  function clearBlockFormatting() {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    pushEditorHistorySnapshot();
    // Remove inline formats first
    document.execCommand("removeFormat", false, null);
    // Strip class/style from the containing block
    const block = getCaretBlock(editorEl);
    if (block) {
      block.removeAttribute("class");
      block.removeAttribute("style");
    }
    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
  }

  /* ── Toggle fullscreen ── */
  function toggleFullscreen() {
    setFullscreen(f => !f);
  }

  function normalizeLinkUrl(rawUrl) {
    const trimmed = String(rawUrl || "").trim();
    if (!trimmed) return "";
    if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function extractAnchorFromRange(range) {
    if (!range) return null;
    const startEl = range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer?.parentElement;
    const endEl = range.endContainer instanceof Element
      ? range.endContainer
      : range.endContainer?.parentElement;
    return startEl?.closest("a") || endEl?.closest("a") || null;
  }

  function openLinkPopover() {
    const selectedText = savedRangeRef.current?.toString()?.trim() || "";
    const existingAnchor = extractAnchorFromRange(savedRangeRef.current);
    const existingRel = existingAnchor?.getAttribute("rel") || "";
    const relTokens = existingRel.split(/\s+/).filter(Boolean);
    setLinkDraft({
      url: existingAnchor?.getAttribute("href") || "",
      text: selectedText || existingAnchor?.textContent || "",
      openInNewTab: existingAnchor
        ? existingAnchor.getAttribute("target") === "_blank"
        : true,
      nofollow: relTokens.includes("nofollow"),
      noopener: existingAnchor
        ? (relTokens.includes("noopener") || relTokens.includes("noreferrer"))
        : true,
      title: existingAnchor?.getAttribute("title") || "",
    });
    setLinkOptionsOpen(false);
    setLinkPopoverOpen(true);
  }

  function insertLinkFromDraft() {
    const finalUrl = normalizeLinkUrl(linkDraft.url);
    if (!finalUrl) {
      toast?.addToast("Please enter a valid URL.", "error");
      return;
    }

    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const linkNode = document.createElement("a");
    linkNode.setAttribute("href", finalUrl);
    if (linkDraft.openInNewTab) {
      linkNode.setAttribute("target", "_blank");
    }
    const relTokens = [];
    if (linkDraft.nofollow) relTokens.push("nofollow");
    if (linkDraft.noopener || linkDraft.openInNewTab) relTokens.push("noopener");
    if (linkDraft.openInNewTab) relTokens.push("noreferrer");
    const rel = Array.from(new Set(relTokens)).join(" ");
    if (rel) linkNode.setAttribute("rel", rel);
    const title = linkDraft.title.trim();
    if (title) linkNode.setAttribute("title", title);

    const selectedText = range.toString();
    const customText = linkDraft.text.trim();
    const finalText = customText || selectedText || finalUrl;

    pushEditorHistorySnapshot();

    try {
      if (range.collapsed || customText) {
        linkNode.textContent = finalText;
        range.deleteContents();
        range.insertNode(linkNode);
      } else {
        range.surroundContents(linkNode);
      }
    } catch {
      linkNode.textContent = finalText;
      const fragment = range.extractContents();
      if (!customText && fragment.textContent?.trim()) {
        linkNode.textContent = fragment.textContent;
      }
      range.insertNode(linkNode);
    }

    range.setStartAfter(linkNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    setLinkPopoverOpen(false);
    setLinkOptionsOpen(false);
    savedRangeRef.current = null;
    setForm(p => ({ ...p, content: contentEditableRef.current?.innerHTML || "" }));
  }

  function execInsertHtml(html) {
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;

    // Parse the HTML string into actual DOM nodes via a detached template
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const nodes = Array.from(tpl.content.childNodes);
    if (nodes.length === 0) return;

    pushEditorHistorySnapshot();

    // Find the direct-child block of the editor that currently contains the caret,
    // then insert all nodes after it so block-level content never lands inside <p>.
    const block = getCaretBlock(editorEl);
    let ref = block || null;

    for (const node of nodes) {
      if (ref) {
        ref.after(node);
      } else {
        editorEl.appendChild(node);
      }
      ref = node;
    }

    // Move caret into the last inserted node (or after it)
    const last = nodes[nodes.length - 1];
    if (last) {
      const sel = window.getSelection();
      const r = document.createRange();
      // If last node is a <p><br></p> paragraph, position cursor inside it
      if (last.nodeName === "P") {
        r.setStart(last, 0);
      } else {
        r.setStartAfter(last);
      }
      r.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }

    setForm(p => ({ ...p, content: editorEl.innerHTML || "" }));
  }

  function withTechnicalRemove(type, html) {
    return [
      `<div class="awp-technical-block" data-technical-type="${escapeHtml(type)}">`,
      '<button type="button" class="awp-technical-remove" data-technical-remove="true" contenteditable="false" aria-label="Remove technical block">×</button>',
      html,
      '</div><p><br></p>',
    ].join("");
  }

  function insertTechnicalBlock(type) {
    const templates = {
      summary: [
        '<div class="awp-summary">',
        '<strong>TL;DR</strong>',
        '<ul>',
        '<li>State the result or main idea in one sentence.</li>',
        '<li>Call out the most important implementation detail.</li>',
        '<li>Mention the trade-off, limitation, or next step.</li>',
        '</ul>',
        '</div>',
      ].join(""),
      prerequisites: [
        '<div class="awp-prerequisites">',
        '<strong>Prerequisites</strong>',
        '<ul>',
        '<li>Required language/runtime version</li>',
        '<li>Required account, API key, package, or service</li>',
        '<li>Baseline knowledge the reader should already have</li>',
        '</ul>',
        '<button type="button" class="awp-prerequisites-add" data-prerequisites-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add item</button>',
        '</div>',
      ].join(""),
      environment: [
        '<div class="awp-environment">',
        '<strong>Environment</strong>',
        '<table class="awp-table"><tbody>',
        '<tr><th>Tool</th><th>Version</th><th>Notes</th></tr>',
        '<tr><td>Node.js</td><td>20.x</td><td>Use the same major version locally and in CI.</td></tr>',
        '</tbody></table>',
        '<button type="button" class="awp-environment-add" data-environment-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add row</button>',
        '</div>',
      ].join(""),
      filetree: [
        '<div class="awp-filetree">',
        '<strong>Project structure</strong>',
        '<pre><code>src/\n  components/\n  pages/\n  services/\npackage.json</code></pre>',
        '</div>',
      ].join(""),
      steps: [
        '<div class="awp-steps">',
        '<strong>Implementation steps</strong>',
        '<ol>',
        '<li>Set up the required dependency or configuration.</li>',
        '<li>Implement the smallest working path.</li>',
        '<li>Add validation, error handling, and tests.</li>',
        '</ol>',
        '<button type="button" class="awp-steps-add" data-steps-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add step</button>',
        '</div>',
      ].join(""),
      callout: [
        '<div class="awp-callout awp-callout--info">',
        '<strong>Note</strong>',
        '<p>Add the key context, caveat, or decision the reader should not miss.</p>',
        '</div>',
      ].join(""),
      tip: [
        '<div class="awp-callout awp-callout--tip">',
        '<strong>Tip</strong>',
        '<p>Share a shortcut, performance improvement, or practical implementation detail.</p>',
        '</div>',
      ].join(""),
      warning: [
        '<div class="awp-callout awp-callout--warning">',
        '<strong>Warning</strong>',
        '<p>Explain the risk, edge case, breaking change, or security concern.</p>',
        '</div>',
      ].join(""),
      terminal: [
        '<div class="awp-terminal">',
        '<div class="awp-terminal-bar" contenteditable="false">',
        '<span>Terminal</span>',
        '<span class="awp-terminal-actions">',
        '<button type="button" class="awp-terminal-copy" data-terminal-copy="true"><i class="far fa-copy" aria-hidden="true"></i> Copy</button>',
        '</span>',
        '</div>',
        '<pre><code>$ npm install package-name</code></pre>',
        '</div>',
      ].join(""),
      api: [
        '<div class="awp-api-block">',
        '<div class="awp-api-head"><span class="awp-api-method" data-method="GET">GET</span><code>/api/resource</code></div>',
        '<p>Describe request parameters, response shape, authentication, and failure modes.</p>',
        '</div>',
      ].join(""),
      checklist: [
        '<div class="awp-checklist-wrap">',
        '<ul class="awp-checklist">',
        '<li><input type="checkbox" checked contenteditable="false"> Environment configured</li>',
        '<li><input type="checkbox" contenteditable="false"> Tests cover the edge case</li>',
        '<li><input type="checkbox" contenteditable="false"> Deployment notes reviewed</li>',
        '</ul>',
        '<button type="button" class="awp-checklist-add" data-checklist-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add item</button>',
        '</div>',
      ].join(""),
      details: [
        '<details class="awp-details" open>',
        '<summary>Why this matters</summary>',
        '<p>Add deeper context, trade-offs, or an optional explanation here.</p>',
        '</details>',
        '<button type="button" class="awp-details-add" data-details-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add section</button>',
      ].join(""),
      references: [
        '<div class="awp-references">',
        '<strong>References</strong>',
        '<ol>',
        '<li><a href="https://example.com" target="_blank" rel="noopener noreferrer">Official documentation</a></li>',
        '</ol>',
        '<button type="button" class="awp-references-add" data-references-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add reference</button>',
        '</div>',
      ].join(""),
      faq: [
        '<div class="awp-faq-block">',
        '<h3>Frequently Asked Questions</h3>',
        '<details open><summary>What problem does this solve?</summary><p>Explain the practical use case and limitation.</p></details>',
        '<details><summary>When should I avoid this approach?</summary><p>Call out trade-offs, scale limits, or alternatives.</p></details>',
        '<button type="button" class="awp-faq-add" data-faq-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add question</button>',
        '</div>',
      ].join(""),
      troubleshooting: [
        '<div class="awp-troubleshooting">',
        '<strong>Troubleshooting</strong>',
        '<table class="awp-table"><tbody>',
        '<tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr>',
        '<tr><td>Error message or behavior</td><td>Root cause</td><td>Action to resolve it</td></tr>',
        '</tbody></table>',
        '<button type="button" class="awp-troubleshooting-add" data-troubleshooting-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add row</button>',
        '</div>',
      ].join(""),
      proscons: [
        '<div class="awp-proscons">',
        '<div><strong>Pros</strong><ul><li>Clear benefit</li><li>Performance or maintainability upside</li></ul></div>',
        '<div><strong>Cons</strong><ul><li>Trade-off or complexity</li><li>Operational concern</li></ul></div>',
        '</div>',
      ].join(""),
      changelog: [
        '<div class="awp-changelog">',
        '<strong>Changelog</strong>',
        '<ul>',
        '<li><time>2026-04-19</time> Initial version published.</li>',
        '</ul>',
        '</div>',
      ].join(""),
      glossary: [
        '<div class="awp-glossary">',
        '<strong>Glossary</strong>',
        '<table class="awp-table"><tbody>',
        '<tr><th>Term</th><th>Meaning</th></tr>',
        '<tr><td>Concept</td><td>Short explanation in plain language.</td></tr>',
        '</tbody></table>',
        '<button type="button" class="awp-glossary-add" data-glossary-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add row</button>',
        '</div>',
      ].join(""),
      benchmark: [
        '<div class="awp-benchmark">',
        '<strong>Benchmark Notes</strong>',
        '<table class="awp-table"><tbody>',
        '<tr><th>Scenario</th><th>Before</th><th>After</th><th>Notes</th></tr>',
        '<tr><td>Test case</td><td>120 ms</td><td>45 ms</td><td>Same input size and environment.</td></tr>',
        '</tbody></table>',
        '<button type="button" class="awp-benchmark-add" data-benchmark-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add row</button>',
        '</div>',
      ].join(""),
      testing: [
        '<div class="awp-testing">',
        '<strong>Testing Matrix</strong>',
        '<table class="awp-table"><tbody>',
        '<tr><th>Case</th><th>Command</th><th>Expected result</th></tr>',
        '<tr><td>Happy path</td><td><code>npm test</code></td><td>All assertions pass.</td></tr>',
        '</tbody></table>',
        '<button type="button" class="awp-testing-add" data-testing-add="true" contenteditable="false"><i class="fas fa-plus" aria-hidden="true"></i> Add row</button>',
        '</div>',
      ].join(""),
      adr: [
        '<div class="awp-adr">',
        '<strong>Architecture Decision</strong>',
        '<p><b>Context:</b> Describe the constraint or requirement.</p>',
        '<p><b>Decision:</b> State the chosen approach.</p>',
        '<p><b>Consequences:</b> Explain benefits, risks, and follow-up work.</p>',
        '</div>',
      ].join(""),
      pullquote: [
        '<blockquote class="awp-pull-quote">',
        '<p>Add the key insight, memorable line, or stand-out quote here.</p>',
        '<cite>— Author or source (optional)</cite>',
        '</blockquote>',
      ].join(""),
      twocol: [
        '<div class="awp-two-col">',
        '<div class="awp-col"><p><strong>Left column</strong></p><p>Add content here.</p></div>',
        '<div class="awp-col"><p><strong>Right column</strong></p><p>Add content here.</p></div>',
        '</div>',
      ].join(""),
      mermaid: [
        '<div class="awp-mermaid">',
        '<div class="awp-mermaid-bar" contenteditable="false"><span>Mermaid Diagram</span></div>',
        '<pre class="awp-mermaid-code" contenteditable="true" spellcheck="false">graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action]\n    B -->|No| D[End]</pre>',
        '</div>',
      ].join(""),
    };

    const html = templates[type];
    if (!html) return;
    restoreSelection();
    execInsertHtml(withTechnicalRemove(type, html));
    setTechMenuOpen(false);
  }

  function insertCodeBlock() {
    const langOptions = CODE_LANGUAGES.map(
      (lang) => {
        const selectedClass = lang.id === "plaintext" ? " is-selected" : "";
        return `<div role="button" tabindex="0" class="awp-codeblock-lang-option${selectedClass}" data-code-action="select-lang" data-code-lang="${lang.id}" data-code-label="${lang.label}">
          <span class="awp-codeblock-lang-badge awp-codeblock-lang-badge--${lang.tone}">${lang.badge}</span>
          <span class="awp-codeblock-lang-option-label">${lang.label}</span>
          <i class="fas fa-check awp-codeblock-lang-check" aria-hidden="true"></i>
        </div>`;
      }
    ).join("");

    const html = [
      '<div class="awp-codeblock" data-code-language="plaintext">',
      '<div class="awp-codeblock-toolbar" contenteditable="false">',
      '<div class="awp-codeblock-header-left">',
      '<span class="awp-codeblock-mac-controls" aria-hidden="true">',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--red"></span>',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--yellow"></span>',
      '<span class="awp-codeblock-mac-dot awp-codeblock-mac-dot--green"></span>',
      '</span>',
      '<div class="awp-codeblock-lang-wrap">',
      '<div role="button" tabindex="0" class="awp-codeblock-lang-btn" data-code-action="toggle-lang">',
      '<span class="awp-codeblock-lang-label">Plain Text</span>',
      '<i class="fas fa-chevron-down" aria-hidden="true"></i>',
      '</div>',
      '<div class="awp-codeblock-lang-menu">',
      '<div class="awp-codeblock-lang-search">',
      '<i class="fas fa-search awp-codeblock-lang-search-icon" aria-hidden="true"></i>',
      '<input class="awp-codeblock-lang-search-input" data-code-search="true" type="text" placeholder="Search language..." />',
      '</div>',
      `<div class="awp-codeblock-lang-options">${langOptions}</div>`,
      '</div>',
      '</div>',
      '</div>',
      '<div role="button" tabindex="0" class="awp-codeblock-copy" data-code-action="copy">',
      '<i class="far fa-copy" aria-hidden="true"></i> Copy',
      '</div>',
      '<div role="button" tabindex="0" class="awp-codeblock-remove" data-code-action="remove" aria-label="Remove code block">×</div>',
      '</div>',
      '<pre class="awp-codeblock-pre"><code class="awp-codeblock-code" contenteditable="true" spellcheck="false">Code goes here...</code></pre>',
      '</div>',
      '<p><br></p>',
    ].join("");

    restoreSelection();
    execInsertHtml(html);
    const editorEl = contentEditableRef.current;
    if (!editorEl) return;
    const insertedBlock = editorEl.querySelector(".awp-codeblock:last-of-type");
    const codeNode = insertedBlock?.querySelector(".awp-codeblock-code");
    if (!insertedBlock || !codeNode) return;
    const language = insertedBlock.getAttribute("data-code-language") || "plaintext";
    const codeText = codeNode.textContent || "";
    codeNode.innerHTML = renderHighlightedCodeWithLines(codeText, language);
    codeNode.dataset.raw = codeText;
  }

  function openContentImagePicker() {
    saveSelection();
    contentImageInputRef.current?.click();
  }

  async function handleContentImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.includes(file.type)) {
      toast?.addToast("Only JPEG, PNG, WebP, GIF, or AVIF images are allowed.", "error");
      return;
    }
    if (file.size > maxUploadBytes) {
      toast?.addToast(`Image must be under ${maxUploadSizeMb} MB.`, "error");
      return;
    }
    setContentImageUploading(true);
    setContentImagePct(0);
    try {
      const url = await uploadCoverImage(file, (pct) => setContentImagePct(Math.round(pct)));
      const altText = file.name.replace(/\.[^.]+$/, "") || "Image";
      restoreSelection();
      const editorEl2 = contentEditableRef.current;
      if (editorEl2) {
        pushEditorHistorySnapshot();
        const img = document.createElement("img");
        img.src = url;
        img.alt = altText;
        img.style.cssText = "max-width:100%;border-radius:4px;margin:8px 0;display:block;";
        const sel2 = window.getSelection();
        if (sel2 && sel2.rangeCount > 0 && editorEl2.contains(sel2.getRangeAt(0).commonAncestorContainer)) {
          const range2 = sel2.getRangeAt(0);
          range2.deleteContents();
          range2.insertNode(img);
          const nr = document.createRange();
          nr.setStartAfter(img);
          nr.collapse(true);
          sel2.removeAllRanges();
          sel2.addRange(nr);
        } else {
          editorEl2.appendChild(img);
        }
        setForm(p => ({ ...p, content: editorEl2.innerHTML || "" }));
      }
      toast?.addToast("Image uploaded and inserted!", "success");
    } catch {
      toast?.addToast("Content image upload failed. Please try again.", "error");
    } finally {
      setContentImageUploading(false);
      setContentImagePct(0);
      savedRangeRef.current = null;
      if (contentImageInputRef.current) contentImageInputRef.current.value = "";
    }
  }

  /* ── Open media picker ── */
  async function openMediaPicker(mode = "cover") {
    if (mode === "content") saveSelection();
    setMediaPickerMode(mode);
    setMediaPickerOpen(true);
    if (mediaItems.length > 0) return;
    setMediaLoading(true);
    try {
      setMediaItems(await listAllMedia());
    } catch {
      toast?.addToast("Failed to load media library.", "error");
    } finally {
      setMediaLoading(false);
    }
  }

  /* ── Field change ── */
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (editorSettings.autosave) triggerAutoSave();
  }

  function insertImageFromMedia(item) {
    const altText = escapeHtml(item.name.replace(/\.[^.]+$/, "") || "Image");
    const safeUrl = escapeHtml(item.url || "");
    restoreSelection();
    contentEditableRef.current?.focus();
    pushEditorHistorySnapshot();
    document.execCommand("insertHTML", false, `<img src="${safeUrl}" alt="${altText}" style="max-width:100%;border-radius:4px;margin:8px 0;display:block;" />`);
    setForm(p => ({ ...p, content: contentEditableRef.current?.innerHTML || "" }));
    savedRangeRef.current = null;
    toast?.addToast("Image inserted!", "success");
    setMediaPickerOpen(false);
  }

  /* ── Auto-save ──
   *  triggerAutoSave is intentionally stable (deps: id, isEditing only).
   *  It reads formRef.current at fire-time so it always gets the latest
   *  title / tags / image even though the input-handler effect captured
   *  this callback only once (when loading became false).
   * ──────────────────────────────────────────────────────────────────── */
  const triggerAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const currentForm = formRef.current;
      if (!currentForm.title.trim()) return;
      setAutoSaveState("saving");
      try {
        const freshContentRaw = stripEditorUiArtifacts(contentEditableRef.current?.innerHTML ?? currentForm.content);
        const freshContent = normalizeTechnicalBlocksHtml(normalizeCodeBlocksHtml(serializeCodeBlocksForStorage(freshContentRaw)), { includeControls: false });
        const payload = {
          ...currentForm,
          content: freshContent,
          tags: currentForm.tags.join(", "),
          scheduledAt: currentForm.scheduledAt ? new Date(currentForm.scheduledAt) : null,
        };
        if (isEditing) {
          await updateBlog(id, payload);
        } else {
          if (!lastSavedId.current) {
            const ref = await createBlog({ ...payload, published: false });
            lastSavedId.current = ref.id;
          } else {
            await updateBlog(lastSavedId.current, payload);
          }
        }
        // Hold "saving" visible for at least 2 s so the spinner doesn't flash,
        // then fade "✓ Saved" in, hold it for 3 s, then fade out.
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setAutoSaveState("saved");
        setTimeout(() => setAutoSaveState("fading"), 3000);
        setTimeout(() => setAutoSaveState("idle"),   3500);
      } catch {
        setAutoSaveState("idle");
      }
    }, autosaveDelayMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, autosaveDelayMs]); // stable — reads formRef.current at fire-time instead of closing over form

  /* ── Cancel pending auto-save on unmount ── */
  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  /* ── Save ── */
  // mode: "draft" | "publish" | "review"
  async function handleSave(mode = "draft") {
    setError("");
    if (!form.title.trim()) { setError("Title is required."); return; }
    const publishLike = mode === "publish" || mode === "schedule";
    if (publishLike && editorSettings.requireSeoBeforePublish) {
      if (!form.metaTitle.trim() || !form.metaDescription.trim()) {
        setError("Meta title and description are required before publishing (Settings → Editor).");
        toast?.addToast("Fill in SEO meta title & description before publishing.", "error");
        return;
      }
    }
    if (publishLike && editorSettings.requireCoverBeforePublish && !form.image.trim()) {
      setError("Cover image is required before publishing (Settings → Content).");
      toast?.addToast("Add a cover image before publishing.", "error");
      return;
    }
    if (publishLike && editorSettings.requireCategoryBeforePublish && form.categoryIds.length === 0) {
      setError("At least one category is required before publishing (Settings → Content).");
      toast?.addToast("Select at least one category before publishing.", "error");
      return;
    }
    if (publishLike && editorSettings.requireTagsBeforePublish && form.tags.length === 0) {
      setError("At least one tag is required before publishing (Settings → Content).");
      toast?.addToast("Add at least one tag before publishing.", "error");
      return;
    }
    const willSchedule = mode === "schedule";
    const scheduledDate = form.scheduledAt ? new Date(form.scheduledAt) : null;
    if (willSchedule && (!scheduledDate || Number.isNaN(scheduledDate.getTime()))) {
      setError("Please choose a valid scheduled publish date.");
      toast?.addToast("Choose a scheduled publish date.", "error");
      return;
    }
    setSaving(true);
    // Always read the live DOM content at save-time so we never lose text
    // that was typed since the last debounced sync.
    const freshContentRaw = stripEditorUiArtifacts(contentEditableRef.current?.innerHTML ?? form.content);
    const freshContent = normalizeTechnicalBlocksHtml(normalizeCodeBlocksHtml(serializeCodeBlocksForStorage(freshContentRaw)), { includeControls: false });
    const willPublish = mode === "publish";
    const willReview  = mode === "review";

    const payload = {
      ...form,
      content: freshContent,
      tags: form.tags.join(", "),
      published: willPublish,
      pendingReview: willReview,
      scheduledAt: willSchedule ? scheduledDate : null,
      slug: form.slug.trim() || slugify(form.title),
    };
    try {
      if (isEditing) {
        await updateBlog(id, payload);
        if (willSchedule) await publishScheduledPosts();
        if (willPublish) initialPublishedRef.current = true;
        setForm((prev) => ({ ...prev, published: willPublish, pendingReview: willReview, scheduledAt: willSchedule ? prev.scheduledAt : "" }));
        if (willPublish)     toast?.addToast("Post published!", "success");
        else if (willSchedule) toast?.addToast("Post scheduled.", "success");
        else if (willReview) toast?.addToast("Submitted for review.", "success");
        else                 toast?.addToast("Saved as draft.", "success");
      } else {
        const ref = await createBlog(payload);
        if (willSchedule) await publishScheduledPosts();
        if (willReview) toast?.addToast("Post created and submitted for review.", "success");
        else if (willSchedule) toast?.addToast("Post scheduled.", "success");
        else            toast?.addToast("Post created!", "success");
        navigate(`/admin/post/${ref.id}/edit`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
      toast?.addToast("Save failed.", "error");
    }
    setSaving(false);
  }

  const stats = contentStats(form.content, readingSpeedWpm);
  const contentText = plainTextFromHtml(form.content);
  const headingCount = (form.content.match(/<h[2-4]\b/gi) || []).length;
  const codeBlockCount = (form.content.match(/awp-codeblock|bp-codeblock/gi) || []).length;
  const hasTechnicalBlock = /awp-(callout|terminal|api-block|checklist|details|references|faq-block|troubleshooting|proscons|changelog|glossary|benchmark|adr)/i.test(form.content);
  const editorChecks = [
    { label: "Title is clear", done: form.title.trim().length >= 12 && form.title.trim().length <= TITLE_MAX },
    { label: "Subtitle or excerpt added", done: Boolean(form.subtitle.trim() || form.excerpt.trim()) },
    { label: "SEO metadata complete", done: Boolean(form.metaTitle.trim() && form.metaDescription.trim()) },
    { label: "Useful length", done: stats.words >= 500 },
    { label: "Scannable headings", done: headingCount >= 2 },
    { label: "Technical evidence included", done: codeBlockCount > 0 || hasTechnicalBlock },
    { label: "Tags and category selected", done: form.tags.length > 0 && form.categoryIds.length > 0 },
    { label: "Featured image selected", done: Boolean(form.image) },
  ];
  const completedChecks = editorChecks.filter((item) => item.done).length;
  const postSummary = {
    headings: headingCount,
    codeBlocks: codeBlockCount,
    links: (form.content.match(/<a\b/gi) || []).length,
    images: (form.content.match(/<img\b/gi) || []).length,
    chars: contentText.length,
  };
  const isScheduled = Boolean(form.scheduledAt && !form.published && !form.pendingReview);
  const statusLabel = form.published ? "Published" : form.pendingReview ? "Pending Review" : isScheduled ? "Scheduled" : "Draft";

  if (loading) {
    return (
      <div className="alayout">
        <AdminSidebar />
        <main className="amain">
          <div className="amain-inner">
            <div className="aeditor-loading">
              <span className="aspin" /> Loading post…
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner">

          {/* ── Page header ── */}
          <div className="apage-topbar">
            <h1 className="apage-title">{isEditing ? "Edit Post" : "Add New Post"}</h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {autoSaveState === "saving" && (
                <span className="aautosave-badge aautosave-badge--saving">
                  <span className="aspin" /> Auto-saving…
                </span>
              )}
              {(autoSaveState === "saved" || autoSaveState === "fading") && (
                <span className={`aautosave-badge aautosave-badge--saved${autoSaveState === "fading" ? " aautosave-badge--fading" : ""}`}>
                  ✓ Saved
                </span>
              )}
              <button
                className="abtn abtn-primary"
                onClick={() => navigate("/admin/post/new")}
              >
                Add New Post
              </button>
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="aeditor-error" key={error}>
              <span>⚠</span> {error}
            </div>
          )}

          <div className="aeditor-body">
            {/* ── Main form ── */}
            <div className="aeditor-form">

              {/* Title */}
              <div className="aeditor-title-wrap">
                <input
                  className="aeditor-title-input"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Title"
                  maxLength={TITLE_MAX}
                  autoComplete="off"
                  required
                />
              </div>

              <input
                className="aeditor-subtitle-input"
                name="subtitle"
                value={form.subtitle}
                onChange={handleChange}
                placeholder="Subtitle or short promise for the article"
                maxLength={SUBTITLE_MAX}
                autoComplete="off"
              />

              {/* Content editor card */}
              <div className={`aeditor-content-card${fullscreen ? " awp-fullscreen" : ""}`}>

                {/* Toolbar */}
                <div className="awp-toolbar">

                  {/* Block type selector — custom dropdown so focus never leaves the editor */}
                  <div className="awp-block-type" ref={blockMenuRef}>
                    <button
                      type="button"
                      className={`awp-block-trigger${blockMenuOpen ? " is-open" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep editor focus + selection
                        saveSelection();
                        setBlockMenuOpen(o => !o);
                      }}
                    >
                      <i className={`fas ${selectedBlock.icon} awp-block-icon`} />
                      <span className="awp-block-label">{selectedBlock.label}</span>
                      <i className={`fas fa-chevron-down awp-block-caret${blockMenuOpen ? " is-up" : ""}`} />
                    </button>
                    {blockMenuOpen && (
                      <div className="awp-block-menu">
                        {BLOCK_ITEMS.map(({ tag, label, icon }) => (
                          <button
                            key={tag}
                            type="button"
                            data-tag={tag}
                            className={`awp-block-option${selectedBlock.tag === tag ? " awp-block-option--active" : ""}`}
                            onMouseDown={(e) => {
                              e.preventDefault(); // never steal focus
                              execBlock(tag);
                              setSelectedBlock({ tag, label, icon });
                              setBlockMenuOpen(false);
                            }}
                          >
                            <i className={`fas ${icon} awp-block-option-icon`} />
                            <span className="awp-block-option-label">{label}</span>
                            {selectedBlock.tag === tag && (
                              <i className="fas fa-check awp-block-option-check" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="awp-toolbar-sep" />

                  <div className="awp-toolbar-group">
                    <button type="button" data-tip="Bold" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("bold")}><i className="fas fa-bold" /></button>
                    <button type="button" data-tip="Italic" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("italic")}><i className="fas fa-italic" /></button>
                    <button type="button" data-tip="Underline" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("underline")}><i className="fas fa-underline" /></button>
                    <button type="button" data-tip="Strikethrough" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("strikeThrough")}><i className="fas fa-strikethrough" /></button>
                    <button type="button" data-tip="Superscript" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("superscript")}><i className="fas fa-superscript" /></button>

                    {/* Font color */}
                    <div className="awp-color-wrap" ref={colorPanelRef}>
                      <button
                        type="button"
                        data-tip="Font Color"
                        className={`awp-tbtn awp-color-btn${colorPanelOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setColorPanelOpen(o => !o)}
                      >
                        <span className="awp-color-a" style={{ borderBottomColor: fontColor }}>A</span>
                        <i className="fas fa-chevron-down awp-color-caret" />
                      </button>

                      {colorPanelOpen && (
                        <div className="awp-color-panel">
                          <div className="awp-color-tabs" role="tablist" aria-label="Color picker tabs">
                            <button
                              type="button"
                              role="tab"
                              aria-selected={colorTab === "default"}
                              className={`awp-color-tab${colorTab === "default" ? " is-active" : ""}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setColorTab("default")}
                            >
                              Default
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={colorTab === "custom"}
                              className={`awp-color-tab${colorTab === "custom" ? " is-active" : ""}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setColorTab("custom")}
                            >
                              Custom
                            </button>
                          </div>

                          {colorTab === "default" && (
                            <>
                              <div className="awp-color-grid">
                                {COLOR_PALETTE.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    className={`awp-color-swatch${fontColor.toUpperCase() === c.toUpperCase() ? " is-selected" : ""}`}
                                    style={{ background: c, border: c === "#ffffff" ? "1px solid #d1d5db" : "1px solid transparent" }}
                                    title={c}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setFontColor(c.toUpperCase());
                                      syncPickerFromHex(c.toUpperCase());
                                      applyFontColor(c.toUpperCase());
                                    }}
                                  />
                                ))}
                              </div>
                            </>
                          )}

                          <button
                            type="button"
                            className="awp-color-clear"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const cleared = "#000000";
                              setFontColor(cleared);
                              syncPickerFromHex(cleared);
                              applyFontColor(cleared);
                            }}
                          >
                            Clear
                          </button>

                          <div className="awp-color-custom-label">Custom</div>
                          <div className="awp-color-custom-area">
                            <div
                              ref={satValRef}
                              className="awp-sv-box"
                              style={{ backgroundColor: `hsl(${pickerHue}, 100%, 50%)` }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                updateSatValFromPointer(e.clientX, e.clientY);
                                const move = (ev) => updateSatValFromPointer(ev.clientX, ev.clientY);
                                const up = () => {
                                  window.removeEventListener("mousemove", move);
                                  window.removeEventListener("mouseup", up);
                                };
                                window.addEventListener("mousemove", move);
                                window.addEventListener("mouseup", up);
                              }}
                            >
                              <div className="awp-sv-white" />
                              <div className="awp-sv-black" />
                              <span
                                className="awp-sv-handle"
                                style={{
                                  left: `${pickerSat}%`,
                                  top: `${100 - pickerVal}%`,
                                }}
                              />
                            </div>

                            <div
                              ref={hueRef}
                              className="awp-hue-bar"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                updateHueFromPointer(e.clientY);
                                const move = (ev) => updateHueFromPointer(ev.clientY);
                                const up = () => {
                                  window.removeEventListener("mousemove", move);
                                  window.removeEventListener("mouseup", up);
                                };
                                window.addEventListener("mousemove", move);
                                window.addEventListener("mouseup", up);
                              }}
                            >
                              <span
                                className="awp-hue-handle"
                                style={{ top: `${(pickerHue / 360) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="awp-color-input-row">
                            <input
                              type="text"
                              className="awp-color-hex-input"
                              value={pickerHexInput}
                              maxLength={7}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setPickerHexInput(val);
                                if (/^#[0-9A-F]{6}$/.test(val)) {
                                  setFontColor(val);
                                  const hsv = hexToHsv(val);
                                  setPickerHue(hsv.h);
                                  setPickerSat(hsv.s);
                                  setPickerVal(hsv.v);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="awp-color-apply-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const finalColor = /^#[0-9A-F]{6}$/.test(pickerHexInput)
                                  ? pickerHexInput
                                  : fontColor.toUpperCase();
                                applyFontColor(finalColor);
                                setColorPanelOpen(false);
                              }}
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="awp-toolbar-sep" />

                  {/* Semantic / inline group */}
                  <div className="awp-toolbar-group">
                    <button type="button" data-tip="Subscript" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("subscript")}><i className="fas fa-subscript" /></button>
                    <button
                      type="button" data-tip="Inline Code (`)" className="awp-tbtn"
                      onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                      onClick={toggleInlineCode}
                    ><span className="awp-inline-code-icon">&lt;/&gt;</span></button>
                    <button
                      type="button" data-tip="Keyboard Key" className="awp-tbtn"
                      onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                      onClick={toggleKbd}
                    ><i className="fas fa-keyboard" /></button>
                    <button
                      type="button" data-tip="Highlight" className="awp-tbtn"
                      onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                      onClick={toggleHighlight}
                    ><i className="fas fa-highlighter" /></button>
                    <button
                      type="button" data-tip="Clear Formatting" className="awp-tbtn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execCmd("removeFormat")}
                    ><i className="fas fa-eraser" /></button>
                  </div>

                  <div className="awp-toolbar-sep" />

                  <div className="awp-toolbar-group">
                    {/* Alignment dropdown — single button with all 4 options */}
                    <div className="awp-align-wrap" ref={alignMenuRef}>
                      <button
                        type="button"
                        data-tip="Alignment"
                        className="awp-tbtn awp-align-trigger"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveSelection();
                          setAlignMenuOpen(o => !o);
                        }}
                      >
                        <i className="fas fa-align-left" />
                        <i className="fas fa-chevron-down" style={{ fontSize: 7, marginLeft: 1 }} />
                      </button>
                      {alignMenuOpen && (
                        <div className="awp-align-menu">
                          {[
                            { cmd: "justifyLeft",   icon: "fa-align-left",    label: "Align left" },
                            { cmd: "justifyCenter", icon: "fa-align-center",  label: "Align center" },
                            { cmd: "justifyRight",  icon: "fa-align-right",   label: "Align right" },
                            { cmd: "justifyFull",   icon: "fa-align-justify", label: "Justify" },
                          ].map(({ cmd, icon, label }) => (
                            <button
                              key={cmd}
                              type="button"
                              className="awp-align-option"
                              title={label}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                execCmd(cmd);
                                setAlignMenuOpen(false);
                              }}
                            >
                              <i className={`fas ${icon}`} />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" data-tip="Insert media" className="awp-tbtn" onMouseDown={(e) => { saveSelection(); e.preventDefault(); }} onClick={openContentImagePicker}><i className="fas fa-th" /></button>
                    <button type="button" data-tip="Bullet list" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("insertUnorderedList")}><i className="fas fa-list-ul" /></button>
                  </div>


                  <div className="awp-toolbar-group">
                    <button type="button" data-tip="Insert image" className="awp-tbtn" onMouseDown={(e) => { saveSelection(); e.preventDefault(); }} onClick={openContentImagePicker}><i className="fas fa-image" /></button>
                    <button type="button" data-tip="Numbered list" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("insertOrderedList")}><i className="fas fa-list-ol" /></button>
                    <button type="button" data-tip="Indent" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("indent")}><i className="fas fa-indent" /></button>
                    <button type="button" data-tip="Outdent" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("outdent")}><i className="fas fa-outdent" /></button>
                    <div className="awp-link-wrap" ref={linkPopoverRef}>
                      <button
                        type="button"
                        data-tip="Insert link"
                        className={`awp-tbtn${linkPopoverOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => {
                          saveSelection();
                          e.preventDefault();
                        }}
                        onClick={openLinkPopover}
                      >
                        <i className="fas fa-link" />
                      </button>
                      {linkPopoverOpen && (
                        <div className="awp-link-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-link-pop-head">
                            <span>Insert Link</span>
                            <button
                              type="button"
                              className="awp-link-close"
                              onClick={() => {
                                setLinkPopoverOpen(false);
                                setLinkOptionsOpen(false);
                              }}
                              aria-label="Close link popup"
                            >
                              <i className="fas fa-times" />
                            </button>
                          </div>

                          <label className="awp-link-label">URL</label>
                          <div className="awp-link-input-row">
                            <input
                              ref={linkUrlInputRef}
                              type="text"
                              className="awp-link-input"
                              placeholder="https://example.com"
                              value={linkDraft.url}
                              onChange={(e) => setLinkDraft((p) => ({ ...p, url: e.target.value }))}
                            />
                            <button type="button" className="awp-link-input-icon" tabIndex={-1} aria-hidden="true">
                              <i className="fas fa-link" />
                            </button>
                          </div>

                          <label className="awp-link-label">Link Text</label>
                          <input
                            type="text"
                            className="awp-link-input"
                            placeholder="sample text"
                            value={linkDraft.text}
                            onChange={(e) => setLinkDraft((p) => ({ ...p, text: e.target.value }))}
                          />

                          <label className="awp-link-check">
                            <input
                              type="checkbox"
                              checked={linkDraft.openInNewTab}
                              onChange={(e) => setLinkDraft((p) => ({
                                ...p,
                                openInNewTab: e.target.checked,
                                noopener: e.target.checked ? true : p.noopener,
                              }))}
                            />
                            Open link in a new tab
                          </label>

                          <button
                            type="button"
                            className="awp-link-options-toggle"
                            onClick={() => setLinkOptionsOpen((o) => !o)}
                          >
                            Link Options
                            <i className={`awp-link-options-icon fas fa-chevron-${linkOptionsOpen ? "up" : "right"}`} />
                          </button>

                          {linkOptionsOpen && (
                            <div className="awp-link-options">
                              <label className="awp-link-check">
                                <input
                                  type="checkbox"
                                  checked={linkDraft.nofollow}
                                  onChange={(e) => setLinkDraft((p) => ({ ...p, nofollow: e.target.checked }))}
                                />
                                Add rel="nofollow"
                              </label>
                              <label className="awp-link-check">
                                <input
                                  type="checkbox"
                                  checked={linkDraft.noopener}
                                  onChange={(e) => setLinkDraft((p) => ({ ...p, noopener: e.target.checked }))}
                                />
                                Add rel="noopener"
                              </label>
                              <label className="awp-link-label">Title attribute (optional)</label>
                              <input
                                type="text"
                                className="awp-link-input"
                                placeholder="e.g., Official Website"
                                value={linkDraft.title}
                                onChange={(e) => setLinkDraft((p) => ({ ...p, title: e.target.value }))}
                              />
                            </div>
                          )}

                          <div className="awp-link-actions">
                            <button type="button" className="abtn abtn-primary abtn-sm" onClick={insertLinkFromDraft}>Insert</button>
                            <button
                              type="button"
                              className="abtn abtn-ghost abtn-sm"
                              onClick={() => {
                                setLinkPopoverOpen(false);
                                setLinkOptionsOpen(false);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button type="button" data-tip="Quote" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execBlock("blockquote")}><i className="fas fa-quote-right" /></button>
                    <button
                      type="button" data-tip="Code block" className="awp-tbtn"
                      onMouseDown={(e) => {
                        saveSelection();
                        e.preventDefault();
                      }}
                      onClick={insertCodeBlock}
                    ><i className="fas fa-code" /></button>
                    <button
                      type="button" data-tip="Horizontal Rule"
                      className="awp-tbtn"
                      onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                      onClick={insertHR}
                    ><i className="fas fa-minus" /></button>

                    {editorSettings.enableTechnicalBlocks && (
                    <div className="awp-tech-wrap" ref={techMenuRef}>
                      <button
                        type="button"
                        data-tip="Technical blocks"
                        className={`awp-tbtn${techMenuOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setTechMenuOpen((o) => !o)}
                      >
                        <i className="fas fa-cubes" />
                      </button>
                      {techMenuOpen && (
                        <div className="awp-tech-menu">
                          {[
                            { type: "summary", icon: "fa-list-alt", label: "TL;DR summary" },
                            { type: "prerequisites", icon: "fa-clipboard-check", label: "Prerequisites" },
                            { type: "environment", icon: "fa-server", label: "Environment matrix" },
                            { type: "filetree", icon: "fa-folder-open", label: "Project structure" },
                            { type: "steps", icon: "fa-route", label: "Implementation steps" },
                            { type: "callout", icon: "fa-info-circle", label: "Note callout" },
                            { type: "tip", icon: "fa-lightbulb", label: "Tip callout" },
                            { type: "warning", icon: "fa-exclamation-triangle", label: "Warning callout" },
                            { type: "terminal", icon: "fa-terminal", label: "Terminal command" },
                            { type: "api", icon: "fa-exchange-alt", label: "API endpoint" },
                            { type: "checklist", icon: "fa-tasks", label: "Checklist" },
                            { type: "details", icon: "fa-chevron-circle-down", label: "Collapsible details" },
                            { type: "references", icon: "fa-book", label: "References" },
                            { type: "faq", icon: "fa-question-circle", label: "FAQ section" },
                            { type: "troubleshooting", icon: "fa-wrench", label: "Troubleshooting table" },
                            { type: "proscons", icon: "fa-balance-scale", label: "Pros and cons" },
                            { type: "changelog", icon: "fa-history", label: "Changelog" },
                            { type: "glossary", icon: "fa-spell-check", label: "Glossary" },
                            { type: "benchmark", icon: "fa-tachometer-alt", label: "Benchmark table" },
                            { type: "testing", icon: "fa-vial", label: "Testing matrix" },
                            { type: "adr", icon: "fa-sitemap", label: "Architecture decision" },
                            { type: "pullquote", icon: "fa-quote-left", label: "Pull quote" },
                            { type: "twocol", icon: "fa-columns", label: "Two-column layout" },
                            { type: "mermaid", icon: "fa-project-diagram", label: "Mermaid diagram" },
                          ].map((item) => (
                            <button
                              key={item.type}
                              type="button"
                              className="awp-tech-option"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                insertTechnicalBlock(item.type);
                              }}
                            >
                              <i className={`fas ${item.icon}`} />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    )}

                    {/* Table picker */}
                    <div className="awp-table-wrap" ref={tablePickerRef}>
                      <button
                        type="button" data-tip="Insert Table"
                        className={`awp-tbtn${tablePickerOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setTablePickerOpen(o => !o)}
                      ><i className="fas fa-table" /></button>
                      {tablePickerOpen && (
                        <div className="awp-table-picker" onMouseDown={(e) => e.preventDefault()}>
                          <div
                            className="awp-table-grid"
                            onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
                          >
                            {Array.from({ length: 6 }, (_, r) =>
                              Array.from({ length: 8 }, (_, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  className={`awp-tpick-cell${r < tableHover.rows && c < tableHover.cols ? " is-hot" : ""}`}
                                  onMouseEnter={() => setTableHover({ rows: r + 1, cols: c + 1 })}
                                  onClick={() => insertTable(tableHover.rows, tableHover.cols)}
                                />
                              ))
                            )}
                          </div>
                          <p className="awp-table-picker-label">
                            {tableHover.rows > 0
                              ? `${tableHover.rows} × ${tableHover.cols} table`
                              : "Hover to select size"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extra second-row tools */}
                  <div className="awp-toolbar-group">

                    {/* Line break */}
                    <button
                      type="button" data-tip="Line Break (↵)"
                      className="awp-tbtn"
                      onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                      onClick={insertLineBreak}
                    ><i className="fas fa-level-down-alt" /></button>

                    {/* Video embed */}
                    <div className="awp-embed-wrap" ref={embedRef}>
                      <button
                        type="button" data-tip="Embed Video"
                        className={`awp-tbtn${embedOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setEmbedOpen(o => !o)}
                      ><i className="fas fa-film" /></button>
                      {embedOpen && (
                        <div className="awp-embed-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-embed-head">
                            <span>Embed Video</span>
                            <button type="button" className="awp-link-close" onClick={() => setEmbedOpen(false)} aria-label="Close">
                              <i className="fas fa-times" />
                            </button>
                          </div>
                          <label className="awp-link-label">YouTube or Vimeo URL</label>
                          <input
                            ref={embedInputRef}
                            type="text"
                            className="awp-link-input"
                            placeholder="https://youtu.be/…"
                            value={embedUrl}
                            onChange={(e) => setEmbedUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertVideoEmbed(); } }}
                          />
                          <div className="awp-link-actions">
                            <button type="button" className="abtn abtn-primary abtn-sm" onClick={insertVideoEmbed}>Embed</button>
                            <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => setEmbedOpen(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Special characters */}
                    {/* Special characters */}
                    <div className="awp-chars-wrap" ref={charsRef}>
                      <button
                        type="button" data-tip="Special Characters"
                        className={`awp-tbtn${charsOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => { setCharsOpen(o => !o); setCharsSearch(""); setCharsCat(0); }}
                      ><i className="fas fa-star-of-life" /></button>
                      {charsOpen && (() => {
                        const CHAR_CATS = [
                          { icon: "→", label: "Arrows", items: [
                            ["→","right arrow"],["←","left arrow"],["↑","up arrow"],["↓","down arrow"],["↔","left right arrow"],["↕","up down arrow"],["↗","up right northeast arrow"],["↘","down right southeast arrow"],["↙","down left southwest arrow"],["↖","up left northwest arrow"],
                            ["⇒","right double arrow implies"],["⇐","left double arrow"],["⇔","left right double arrow iff"],["⇑","up double arrow"],["⇓","down double arrow"],["⇕","up down double arrow"],
                            ["↵","return enter carriage arrow"],["↩","left hook arrow return"],["↪","right hook arrow"],["⤴","up right curved arrow"],["⤵","down right curved arrow"],
                            ["⟹","long right double arrow"],["⟸","long left double arrow"],["⟺","long left right double arrow"],["⟶","long right arrow"],["⟵","long left arrow"],
                            ["↺","counterclockwise arrow refresh"],["↻","clockwise arrow refresh"],["⟲","counterclockwise circle arrow"],["⟳","clockwise circle arrow"],
                            ["▶","right triangle play"],["◀","left triangle"],["▲","up triangle"],["▼","down triangle"],["►","right pointer"],["◄","left pointer"],
                          ]},
                          { icon: "∑", label: "Math", items: [
                            ["=","equals sign"],["≠","not equal"],["≈","approximately equal tilde"],["≡","identical equivalent congruent"],["≤","less than or equal"],["≥","greater than or equal"],["<","less than"],["≪","much less than"],["≫","much greater than"],
                            ["+","plus add"],["−","minus subtract"],["±","plus minus"],["×","multiply times cross"],["÷","divide obelus"],["·","middle dot multiply"],
                            ["²","superscript two squared"],["³","superscript three cubed"],["ⁿ","superscript n power"],["½","one half fraction"],["⅓","one third fraction"],["¼","one quarter fraction"],["¾","three quarters fraction"],
                            ["∞","infinity"],["√","square root radical"],["∛","cube root"],["∜","fourth root"],["∑","sum sigma capital"],["∏","product pi capital"],["∫","integral"],["∬","double integral"],["∂","partial derivative"],["∇","nabla gradient del"],
                            ["π","pi constant"],["∆","delta triangle change"],["Ω","omega"],["α","alpha"],["β","beta"],["γ","gamma"],["θ","theta angle"],["λ","lambda"],["μ","mu micro"],["σ","sigma"],
                            ["∝","proportional to"],["∈","element of set member"],["∉","not element of"],["∀","for all universal"],["∃","there exists existential"],["∅","empty set null"],["∩","intersection and"],["∪","union or"],["⊂","subset of"],["⊃","superset of"],["⊆","subset equal"],["⊇","superset equal"],
                            ["⊕","xor direct sum circle plus"],["⊗","tensor product circle times"],["⊞","boxed plus"],["⊟","boxed minus"],["⟨","left angle bracket bra"],["⟩","right angle bracket ket"],["‖","double vertical bar norm"],["∥","parallel"],["⊥","perpendicular"],["∠","angle"],["°","degree"],
                          ]},
                          { icon: "Aa", label: "Typography", items: [
                            ["—","em dash long"],["–","en dash medium"],["-","hyphen minus"],["|","vertical bar pipe"],["_","underscore"],
                            ["…","ellipsis three dots"],["·","middle dot interpunct"],["•","bullet point"],["◦","white bullet hollow"],["‣","triangular bullet"],
                            ["“","left double quotation mark open"],["\u201D","right double quotation mark close"],["\u2018","left single quotation mark open"],["\u2019","right single quotation mark apostrophe"],
                            ["«","left guillemet double angle quote"],["»","right guillemet double angle quote"],["‹","left single guillemet"],["›","right single guillemet"],
                            ["¶","pilcrow paragraph mark"],["§","section sign"],["†","dagger footnote"],["‡","double dagger"],["‰","per mille thousand"],
                            ["Æ","ae ligature"],["æ","ae lowercase ligature"],["Œ","oe ligature"],["œ","oe lowercase ligature"],["ß","sharp s german eszett"],
                            ["À","a grave accent"],["Á","a acute accent"],["Â","a circumflex"],["Ä","a umlaut"],["Å","a ring scandinavian"],["Ç","c cedilla"],["É","e acute accent"],["Ê","e circumflex"],["Ë","e umlaut"],["Í","i acute"],["Î","i circumflex"],["Ñ","n tilde spanish"],["Ó","o acute"],["Ô","o circumflex"],["Ö","o umlaut"],["Ø","o stroke"],["Ú","u acute"],["Û","u circumflex"],["Ü","u umlaut"],
                          ]},
                          { icon: "€", label: "Currency", items: [
                            ["$","dollar usd american"],["€","euro european"],["£","pound sterling british"],["¥","yen yuan japanese chinese"],["₹","rupee indian"],["₩","won korean"],["₿","bitcoin crypto"],["¢","cent"],["₽","ruble russian"],["₺","lira turkish"],["₦","naira nigerian"],["₴","hryvnia ukrainian"],["₪","shekel israeli"],["₫","dong vietnamese"],["฿","baht thai"],["₱","peso philippine"],["₲","guarani paraguayan"],["₵","cedi ghanaian"],["₡","colon costa rican"],["₮","tugrik mongolian"],["₸","tenge kazakhstani"],["₼","manat azerbaijani"],["₾","lari georgian"],["¤","generic currency sign"],
                          ]},
                          { icon: "©", label: "Legal & Keys", items: [
                            ["©","copyright"],["®","registered trademark"],["™","trademark"],["℗","sound recording copyright"],["℠","service mark"],
                            ["§","section sign legal"],["¶","paragraph pilcrow"],["†","dagger footnote"],["‡","double dagger"],["*","asterisk star"],["#","hash number pound"],["@","at sign email"],["&","ampersand and"],
                            ["⌘","command key mac"],["⌥","option alt key mac"],["⇧","shift key"],["⌫","backspace delete key"],["⎵","space bar key"],["⏎","return enter key"],["⌃","control ctrl key"],["⎋","escape esc key"],["⇥","tab key"],["⌦","forward delete key"],["⇪","caps lock key"],
                            ["✓","check mark tick"],["✗","x mark wrong"],["✘","heavy x ballot"],["✔","heavy check mark tick"],["✖","heavy multiply x"],["✚","heavy plus cross"],
                          ]},
                          { icon: "★", label: "Symbols", items: [
                            ["★","black star filled"],["☆","white star outline empty"],["✦","four pointed star"],["✧","white four pointed star"],["✩","stress outlined star"],["✪","circled white star"],["✫","open centre star"],["✬","black centre white star"],["✭","outlined black star"],["✮","heavy outlined star"],["✯","pinwheel star"],["✰","shadowed star"],
                            ["♥","heart suit card"],["♡","white heart suit"],["♦","diamond suit card"],["♣","club suit card"],["♠","spade suit card"],["♤","white spade"],["♧","white club"],
                            ["☀","sun bright"],["☁","cloud"],["☂","umbrella"],["☃","snowman winter"],["☄","comet"],["☽","crescent moon"],["☾","last quarter moon"],["❄","snowflake cold"],["☔","umbrella rain"],["⛅","sun cloud partly cloudy"],
                            ["☎","telephone phone"],["✉","envelope mail"],["✏","pencil edit"],["✒","nib pen"],["✂","scissors cut"],["⌛","hourglass time wait"],["⌚","watch clock"],["⚓","anchor nautical"],["✈","airplane flight travel"],["⚔","crossed swords"],
                            ["♻","recycling recycle green"],["⚙","gear settings cog"],["⚠","warning caution alert"],["ℹ","information info"],["⛔","no entry stop"],["☢","radioactive"],["☣","biohazard"],["☮","peace sign"],
                            ["♈","aries zodiac"],["♉","taurus zodiac"],["♊","gemini zodiac"],["♋","cancer zodiac"],["♌","leo zodiac"],["♍","virgo zodiac"],["♎","libra zodiac"],["♏","scorpius zodiac"],["♐","sagittarius zodiac"],["♑","capricorn zodiac"],["♒","aquarius zodiac"],["♓","pisces zodiac"],
                            ["♩","quarter note music"],["♪","eighth note music"],["♫","beamed notes music"],["♬","beamed sixteenth notes music"],["♭","flat music"],["♮","natural music"],["♯","sharp music"],
                          ]},
                          { icon: "α", label: "Greek", items: [
                            ["Α","alpha uppercase greek"],["α","alpha lowercase greek"],["Β","beta uppercase greek"],["β","beta lowercase greek"],["Γ","gamma uppercase greek"],["γ","gamma lowercase greek"],["Δ","delta uppercase greek"],["δ","delta lowercase greek"],["Ε","epsilon uppercase greek"],["ε","epsilon lowercase greek"],["Ζ","zeta uppercase greek"],["ζ","zeta lowercase greek"],["Η","eta uppercase greek"],["η","eta lowercase greek"],["Θ","theta uppercase greek"],["θ","theta lowercase greek angle"],["Ι","iota uppercase greek"],["ι","iota lowercase greek"],["Κ","kappa uppercase greek"],["κ","kappa lowercase greek"],["Λ","lambda uppercase greek"],["λ","lambda lowercase greek"],["Μ","mu uppercase greek"],["μ","mu lowercase micro greek"],["Ν","nu uppercase greek"],["ν","nu lowercase greek"],["Ξ","xi uppercase greek"],["ξ","xi lowercase greek"],["Ο","omicron uppercase greek"],["ο","omicron lowercase greek"],["Π","pi uppercase product greek"],["π","pi lowercase constant greek"],["Ρ","rho uppercase greek"],["ρ","rho lowercase greek"],["Σ","sigma uppercase sum greek"],["σ","sigma lowercase greek"],["ς","sigma final greek"],["Τ","tau uppercase greek"],["τ","tau lowercase greek"],["Υ","upsilon uppercase greek"],["υ","upsilon lowercase greek"],["Φ","phi uppercase greek"],["φ","phi lowercase greek"],["Χ","chi uppercase greek"],["χ","chi lowercase greek"],["Ψ","psi uppercase greek"],["ψ","psi lowercase greek"],["Ω","omega uppercase greek"],["ω","omega lowercase greek"],
                          ]},
                          { icon: "½", label: "Fractions & Super", items: [
                            ["½","one half fraction"],["⅓","one third fraction"],["⅔","two thirds fraction"],["¼","one quarter fraction"],["¾","three quarters fraction"],["⅕","one fifth fraction"],["⅖","two fifths fraction"],["⅗","three fifths fraction"],["⅘","four fifths fraction"],["⅙","one sixth fraction"],["⅚","five sixths fraction"],["⅛","one eighth fraction"],["⅜","three eighths fraction"],["⅝","five eighths fraction"],["⅞","seven eighths fraction"],
                            ["⁰","superscript zero"],["¹","superscript one"],["²","superscript two squared power"],["³","superscript three cubed power"],["⁴","superscript four power"],["⁵","superscript five"],["⁶","superscript six"],["⁷","superscript seven"],["⁸","superscript eight"],["⁹","superscript nine"],["ⁿ","superscript n power"],["⁺","superscript plus"],["⁻","superscript minus"],
                            ["₀","subscript zero"],["₁","subscript one"],["₂","subscript two"],["₃","subscript three"],["₄","subscript four"],["₅","subscript five"],["₆","subscript six"],["₇","subscript seven"],["₈","subscript eight"],["₉","subscript nine"],["₊","subscript plus"],["₋","subscript minus"],["ₐ","subscript a"],["ₑ","subscript e"],["ₒ","subscript o"],["ₓ","subscript x"],
                          ]},
                        ];
                        const q = charsSearch.trim().toLowerCase();
                        const allItems = CHAR_CATS.flatMap(c => c.items);
                        const displayItems = q
                          ? allItems.filter(([, n]) => n.includes(q))
                          : CHAR_CATS[charsCat].items;
                        return (
                          <div className="awp-chars-pop" onMouseDown={(e) => e.stopPropagation()}>
                            <div className="awp-emoji-searchbar">
                              <i className="fas fa-search awp-emoji-searchicon" />
                              <input
                                className="awp-emoji-searchinput"
                                placeholder="Search characters…"
                                value={charsSearch}
                                onChange={(e) => setCharsSearch(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              {charsSearch && (
                                <button className="awp-emoji-searchclear" type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setCharsSearch("")}
                                ><i className="fas fa-times" /></button>
                              )}
                            </div>
                            <div className="awp-emoji-grid">
                              {!q && <div className="awp-emoji-catlabel">{CHAR_CATS[charsCat].label}</div>}
                              {displayItems.length === 0 ? (
                                <div className="awp-emoji-noresult">No characters found</div>
                              ) : (
                                <div className="awp-chars-grid-inner">
                                  {displayItems.map(([ch, n]) => (
                                    <button key={ch + n} type="button"
                                      className="awp-char-btn2"
                                      title={n}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => insertSpecialChar(ch)}
                                    >{ch}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {!q && (
                              <div className="awp-emoji-catbar awp-chars-catbar">
                                {CHAR_CATS.map((cat, i) => (
                                  <button key={cat.label} type="button"
                                    className={`awp-emoji-catbtn awp-chars-catbtn${charsCat === i ? " is-active" : ""}`}
                                    title={cat.label}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setCharsCat(i)}
                                  >{cat.icon}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Emoji picker */}
                    {editorSettings.enableEmojiPicker && (
                    <div className="awp-emoji-wrap" ref={emojiRef}>
                      <button
                        type="button" data-tip="Emoji"
                        className={`awp-tbtn${emojiOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => { setEmojiOpen(o => !o); setEmojiSearch(""); setEmojiCat(0); }}
                      >😊</button>
                      {emojiOpen && (() => {
                        // Each item: [emoji, "keyword1 keyword2 ..."]
                        const EMOJI_CATS = [
                          { icon: "😊", label: "Smileys & People", items: [
                            ["😀","smile grin happy face"],["😃","smile open happy"],["😄","grin happy laugh"],["😁","grin big happy"],["😆","laugh happy squint"],["😅","sweat nervous laugh"],["🤣","rofl rolling floor laughing"],["😂","joy laugh cry tears funny"],["🙂","slight smile"],["🙃","upside down smile sarcasm"],["😉","wink"],["😊","blush smile happy"],["😇","halo angel innocent"],["🥰","hearts love adore smiling"],["😍","heart eyes love"],["🤩","star eyes excited"],["😘","kiss blow love"],["😗","kiss whistle"],["😚","kiss closed eyes"],["😙","kiss smiling eyes"],["🥲","smile tear bittersweet"],["😋","yum tongue tasty"],["😛","tongue playful"],["😜","wink tongue playful"],["🤪","zany crazy"],["😝","tongue squint"],["🤑","money dollar rich"],["🤗","hug open hands"],["🤭","hand mouth oops secret"],["🤫","shush quiet secret"],["🤔","thinking ponder hmm"],["🤐","zipper mouth silent"],["🤨","raised eyebrow skeptical"],["😐","neutral expressionless"],["😑","expressionless blank"],["😶","no mouth silent"],["😏","smirk sly"],["😒","unamused unhappy"],["🙄","eye roll annoyed"],["😬","grimace awkward nervous"],["🤥","lying pinocchio"],["😌","relieved peaceful"],["😔","pensive sad"],["😪","sleepy tired"],["🤤","drool hungry"],["😴","sleeping zzz tired"],["😷","mask sick ill"],["🤒","sick thermometer"],["🤕","hurt injury bandage"],["🤢","nausea sick gross"],["🤮","vomit sick"],["🤧","sneeze sick"],["🥵","hot sweating"],["🥶","cold freezing"],["🥴","woozy drunk dizzy"],["😵","dizzy dead"],["🤯","exploding head mind blown"],["🤠","cowboy hat"],["🥳","party celebrate"],["🥸","disguise glasses"],["😎","cool sunglasses"],["🤓","nerd glasses smart"],["🧐","monocle curious"],["😕","confused sad"],["😟","worried sad"],["🙁","slightly sad"],["☹️","frown sad unhappy"],["😮","open mouth surprised"],["😯","hushed surprised"],["😲","astonished shocked"],["😳","flushed embarrassed"],["🥺","pleading eyes puppy"],["😦","frowning open mouth"],["😧","anguished worried"],["😨","fearful scared"],["😰","anxious sweat scared"],["😥","sad relieved"],["😢","cry tear sad"],["😭","sob cry loudly"],["😱","scream fear horror"],["😖","confounded frustrated"],["😣","persevere struggle"],["😞","disappointed sad"],["😓","downcast sweat"],["😩","weary tired"],["😫","tired exhausted"],["🥱","yawn tired bored"],["😤","steam huff annoyed"],["😡","angry mad pouting"],["😠","angry mad"],["🤬","cursing rage swear"],["😈","devil evil smile"],["👿","angry devil imp"],["💀","skull death"],["☠️","skull crossbones death poison"],["💩","poop pile"],["🤡","clown joker"],["👹","ogre monster demon"],["👺","goblin demon"],["👻","ghost halloween spooky"],["👽","alien ufo"],["👾","alien monster game pixel"],["🤖","robot android ai"],
                            ["👋","wave hello bye"],["🤚","raised back hand stop"],["🖐️","raised hand five fingers"],["✋","raised hand stop"],["🖖","vulcan salute spock"],["👌","ok perfect"],["🤌","pinched fingers"],["🤏","small pinching"],["✌️","peace victory two"],["🤞","crossed fingers luck hope"],["🤟","love you hand sign"],["🤘","rock horns metal"],["🤙","call shaka hang loose"],["👈","point left"],["👉","point right"],["👆","point up"],["👇","point down"],["☝️","index point up"],["👍","thumbs up like good"],["👎","thumbs down dislike bad"],["✊","fist raised"],["👊","fist punch"],["🤛","left fist bump"],["🤜","right fist bump"],["👏","clap applause"],["🙌","raised hands celebrate"],["🫶","heart hands love"],["👐","open hands"],["🤲","palms up prayer"],["🤝","handshake deal"],["🙏","pray thanks please"],["✍️","writing pen"],["💅","nail polish fancy"],["🤳","selfie phone camera"],["💪","muscle strong flex"],["🦾","mechanical arm prosthetic"],["🦵","leg kick"],["🦶","foot"],["👂","ear hear listen"],["🦻","ear hearing aid"],["👃","nose smell"],["🧠","brain think smart mind"],["👀","eyes look see"],["👁️","eye"],["👅","tongue taste"],["👄","lips mouth kiss"],
                          ]},
                          { icon: "🐶", label: "Animals & Nature", items: [
                            ["🐶","dog puppy pet"],["🐱","cat kitten pet"],["🐭","mouse rodent"],["🐹","hamster"],["🐰","rabbit bunny"],["🦊","fox"],["🐻","bear"],["🐼","panda bear"],["🐨","koala"],["🐯","tiger"],["🦁","lion"],["🐮","cow moo"],["🐷","pig oink"],["🐸","frog"],["🐵","monkey"],["🙈","see no evil monkey"],["🙉","hear no evil monkey"],["🙊","speak no evil monkey"],["🐔","chicken hen"],["🐧","penguin"],["🐦","bird"],["🐤","chick baby bird"],["🦆","duck"],["🦅","eagle bird"],["🦉","owl"],["🦇","bat vampire"],["🐺","wolf"],["🐗","boar pig"],["🐴","horse"],["🦄","unicorn magic"],["🐝","bee honey"],["🐛","bug caterpillar worm"],["🦋","butterfly"],["🐌","snail slow"],["🐞","ladybug beetle"],["🐜","ant insect"],["🦟","mosquito"],["🦗","cricket insect"],["🦂","scorpion"],["🐢","turtle slow"],["🐍","snake reptile"],["🦎","lizard reptile"],["🐙","octopus sea"],["🦑","squid sea"],["🦐","shrimp prawn"],["🦀","crab sea"],["🐡","blowfish sea"],["🐠","fish tropical"],["🐟","fish sea"],["🐬","dolphin sea"],["🐳","whale sea"],["🦈","shark sea"],["🐘","elephant"],["🦛","hippo"],["🦒","giraffe"],["🐪","camel desert"],["🦘","kangaroo"],["🐑","sheep wool"],["🐐","goat"],["🐓","rooster cock"],["🦃","turkey"],["🦚","peacock"],["🦜","parrot colorful"],["🦢","swan"],["🕊️","dove peace bird"],["🐇","rabbit"],["🦔","hedgehog"],
                            ["🌵","cactus desert"],["🎄","christmas tree"],["🌲","tree evergreen"],["🌳","tree deciduous"],["🌴","palm tree tropical"],["🌱","seedling sprout plant"],["🌿","herb leaf plant"],["☘️","shamrock clover luck"],["🍀","four leaf clover luck"],["🍃","leaf wind"],["🍂","fallen leaf autumn"],["🍁","maple leaf autumn canada"],["🍄","mushroom fungi"],["🌾","sheaf rice"],["💐","bouquet flowers"],["🌷","tulip flower"],["🌹","rose flower love"],["🥀","wilted flower"],["🌺","hibiscus flower"],["🌸","cherry blossom flower"],["🌼","blossom flower"],["🌻","sunflower"],["🌞","sun face"],["🌙","moon crescent night"],["⭐","star yellow"],["🌟","glowing star shine"],["💫","dizzy star spin"],["✨","sparkles magic"],["⚡","lightning bolt electric"],["❄️","snowflake cold ice"],["☃️","snowman winter"],["🌈","rainbow colorful"],["🔥","fire hot flame"],["💧","droplet water"],["💦","water splash"],["🌊","wave ocean sea"],["🌍","earth globe europe africa"],["🌎","earth globe americas"],["🌏","earth globe asia australia"],
                          ]},
                          { icon: "💻", label: "Coding & Tech", items: [
                            ["💻","laptop computer coding programming"],["🖥️","desktop computer monitor screen"],["🖨️","printer"],["⌨️","keyboard type code"],["🖱️","mouse cursor click"],["🖲️","trackball mouse"],["💾","floppy disk save storage"],["💿","cd disc optical"],["📀","dvd disc"],["🔋","battery power charge"],["🪫","low battery empty"],["🔌","plug electric power"],["📡","satellite antenna signal network"],["📶","signal bars wifi network"],["🌐","globe internet web network"],
                            ["🤖","robot ai bot automation"],["👾","pixel alien monster game"],["🎮","game controller gaming"],["🕹️","joystick game arcade"],["🧩","puzzle piece component module"],
                            ["🧠","brain ai ml intelligence think smart"],["💡","idea lightbulb solution"],["⚡","lightning fast performance electric"],["🔥","fire hot trending performance"],["💥","explosion crash boom"],["✨","sparkles magic feature"],["🚀","rocket launch deploy ship fast"],["🛸","ufo spaceship"],["☁️","cloud server aws storage"],["🌩️","cloud lightning storm"],
                            ["🔧","wrench tool fix config"],["🔩","bolt nut screw hardware"],["⚙️","gear settings cog config"],["🛠️","hammer wrench tools build"],["🗜️","clamp compress zip"],["🔗","link chain url href"],["⛓️","chain link dependency"],["🧲","magnet attract"],["🪛","screwdriver tool fix"],
                            ["📊","bar chart graph analytics data"],["📈","chart up growth trending"],["📉","chart down decrease"],["📋","clipboard list task"],["📝","memo note write"],["📄","page document file"],["📁","folder directory"],["📂","open folder directory"],["🗂️","file folder organize"],["🗃️","card file box archive"],["🗄️","file cabinet database storage"],["🗑️","trash delete remove"],["📌","pushpin pin sticky"],["📍","pin location marker"],
                            ["🐛","bug error issue fix debug"],["🪲","beetle bug error"],["🐞","ladybug bug error debug"],["🐜","ant crawl"],["🦋","butterfly change transform"],
                            ["🧪","test tube experiment testing"],["🔬","microscope research science"],["🔭","telescope observe monitor"],["🧬","dna genetics data structure"],["⚗️","alembic science experiment"],
                            ["🏗️","construction build architecture infra"],["📦","package npm module dependency"],["📬","mailbox message incoming"],
                            ["🌿","branch git version control"],["🌱","sprout new feature seedling"],["🌲","tree git branch"],
                            ["✅","check done success pass"],["❌","cross fail error wrong"],["⚠️","warning alert caution"],["ℹ️","info information"],["❓","question unknown"],["❗","exclamation important alert"],["🔴","red circle error stop"],["🟠","orange circle warning"],["🟡","yellow circle caution"],["🟢","green circle success ok"],["🔵","blue circle info"],["🟣","purple circle"],["⚫","black circle dark"],["⚪","white circle light"],
                            ["🔄","refresh reload loop sync"],["♾️","infinity loop unlimited"],["⏱️","stopwatch timer benchmark"],["⏰","alarm clock deadline"],["⌛","hourglass wait loading"],["⏳","hourglass time loading pending"],
                            ["🎯","target goal direct hit"],["🏆","trophy win best"],["🥇","gold medal first place"],["🏅","medal award"],
                            ["🔍","magnifying search find left"],["🔎","magnifying search find right"],["🔐","locked key security"],["🔑","key auth access"],["🔒","locked secure closed"],["🔓","unlocked open access"],["🛡️","shield security protect"],
                            ["💬","speech bubble comment message"],["💭","thought bubble thinking"],["📣","megaphone announce broadcast"],["📢","loudspeaker announce"],["🔔","bell notification alert"],["🔕","bell off mute"],
                            ["0️⃣","zero number"],["1️⃣","one number"],["2️⃣","two number"],["3️⃣","three number"],["4️⃣","four number"],["5️⃣","five number"],["6️⃣","six number"],["7️⃣","seven number"],["8️⃣","eight number"],["9️⃣","nine number"],["🔟","ten number"],["#️⃣","hash number sign"],["*️⃣","asterisk star wildcard"],
                            ["➕","plus add"],["➖","minus subtract"],["✖️","multiply times"],["➗","divide"],["🟰","equals"],["©️","copyright"],["®️","registered"],["™️","trademark"],
                          ]},
                          { icon: "🍕", label: "Food & Drink", items: [
                            ["🍏","green apple fruit"],["🍎","red apple fruit"],["🍐","pear fruit"],["🍊","orange tangerine fruit"],["🍋","lemon yellow fruit"],["🍌","banana yellow fruit"],["🍉","watermelon fruit summer"],["🍇","grapes fruit"],["🍓","strawberry fruit"],["🫐","blueberry fruit"],["🍒","cherry fruit"],["🍑","peach fruit"],["🥭","mango tropical fruit"],["🍍","pineapple tropical"],["🥥","coconut tropical"],["🥝","kiwi fruit"],["🍅","tomato red"],["🥑","avocado"],["🍆","eggplant aubergine"],["🥕","carrot orange vegetable"],["🌽","corn maize"],["🌶️","pepper hot spicy"],["🥒","cucumber vegetable"],["🥦","broccoli vegetable green"],["🍄","mushroom fungi"],["🥜","peanut nut"],["🌰","chestnut nut"],["🍞","bread loaf"],["🥐","croissant pastry"],["🥖","baguette bread french"],["🥨","pretzel snack"],["🧀","cheese dairy"],["🥚","egg"],["🍳","frying pan egg cooking"],["🥞","pancake breakfast"],["🧇","waffle breakfast"],["🥓","bacon meat"],["🥩","meat steak"],["🍗","chicken drumstick"],["🍖","meat bone"],["🌭","hotdog sausage"],["🍔","burger hamburger fast food"],["🍟","fries chips fast food"],["🍕","pizza slice"],["🌮","taco mexican"],["🌯","wrap burrito"],["🥙","pita wrap kebab"],["🍱","bento box japanese"],["🍣","sushi japanese"],["🍜","noodles ramen soup"],["🍝","pasta spaghetti italian"],["🍛","curry rice indian"],["🍲","stew pot"],["🥗","salad green healthy"],["🍰","cake slice birthday"],["🎂","birthday cake"],["🧁","cupcake muffin"],["🍩","donut doughnut"],["🍪","cookie biscuit"],["🍫","chocolate candy bar"],["🍬","candy sweet"],["🍭","lollipop candy"],["🍦","soft ice cream"],["🍨","ice cream"],["🍧","shaved ice"],
                            ["☕","coffee hot tea"],["🍵","tea hot green"],["🧃","juice box drink"],["🥤","cup straw drink soda"],["🧋","bubble tea boba"],["🍺","beer pint"],["🍻","cheers beer"],["🥂","champagne toast celebrate"],["🍷","wine red"],["🍸","cocktail martini"],["🍹","tropical drink juice"],["🍾","champagne bottle celebrate"],["🧊","ice cube cold"],["🥄","spoon"],["🍴","fork knife cutlery"],["🍽️","plate dinner"],
                          ]},
                          { icon: "⚽", label: "Activities", items: [
                            ["⚽","soccer football sport"],["🏀","basketball sport"],["🏈","football american sport"],["⚾","baseball sport"],["🎾","tennis sport"],["🏐","volleyball sport"],["🏉","rugby sport"],["🎱","billiards pool eight ball"],["🏓","ping pong table tennis"],["🏸","badminton sport"],["🏒","hockey ice sport"],["⛳","golf hole flag"],["🎣","fishing rod"],["🤿","diving scuba snorkel"],["🎿","ski skiing"],["🛷","sled sledge winter"],["🥌","curling stone"],["🎯","dart target bullseye"],["🎮","game controller gaming"],["🕹️","joystick arcade game"],["🎲","dice game random"],["🧩","puzzle piece jigsaw"],["🧸","teddy bear toy"],["🎭","theatre drama masks art"],["🎨","art palette paint"],["🎬","clapper film movie"],["🎥","movie camera film"],["📷","camera photo"],["📸","camera flash photo"],["📹","video camera film"],
                            ["🏋️","weightlifting gym fitness"],["🤸","gymnastics cartwheel"],["🏄","surfing wave"],["🚴","cycling bicycle bike"],["🏊","swimming pool"],["🧘","yoga meditation zen"],["🏇","horse racing"],["⛷️","ski skiing slope"],["🏂","snowboard winter"],["🥊","boxing glove fight"],["🥋","martial arts karate"],["🏆","trophy award win"],["🥇","gold medal first"],["🥈","silver medal second"],["🥉","bronze medal third"],
                            ["🎵","music note sound"],["🎶","music notes sound"],["🎼","music score sheet"],["🎤","microphone sing karaoke"],["🎧","headphones music listen"],["🎷","saxophone jazz music"],["🎸","guitar music rock"],["🎹","piano keyboard music"],["🥁","drums percussion music"],["🎺","trumpet music brass"],["🎻","violin music string"],["🎉","party celebrate confetti"],["🎊","confetti celebrate party"],["🎈","balloon party celebrate"],
                          ]},
                          { icon: "🚗", label: "Travel & Places", items: [
                            ["🚗","car vehicle red"],["🚕","taxi cab yellow"],["🚙","suv car vehicle"],["🏎️","racing car fast"],["🚓","police car"],["🚑","ambulance emergency"],["🚒","fire truck"],["🚌","bus public transport"],["🚛","truck delivery cargo"],["🚜","tractor farm"],["🏍️","motorcycle bike"],["🛵","scooter moped"],["🚲","bicycle bike cycle"],["🛴","scooter kick"],["🛣️","motorway road highway"],["⛽","fuel gas petrol"],["🚧","construction barrier"],["🚨","police siren alert"],["🚥","traffic light signal"],["🚦","traffic light signal"],
                            ["✈️","airplane plane flight travel"],["🛫","airplane departure"],["🛬","airplane arrival"],["🛩️","small airplane"],["💺","seat airline"],["🛰️","satellite space orbit"],["🚀","rocket launch space"],["🛸","ufo flying saucer"],["🚁","helicopter"],["⛵","sailboat sea"],["🚤","speedboat sea"],["🚢","ship cruise ocean"],
                            ["🏠","house home"],["🏡","house garden home"],["🏢","office building city"],["🏥","hospital medical"],["🏦","bank money"],["🏨","hotel stay"],["🏪","convenience store shop"],["🏫","school education"],["🏭","factory industrial"],["🏗️","construction building"],["🏰","castle medieval"],["🏯","japanese castle"],["🗼","eiffel tower paris"],["🗽","statue liberty usa"],["⛪","church religion"],["⛩️","shrine torii japan"],["🌁","foggy city"],["🌃","night city stars"],["🏙️","cityscape skyline"],["🌄","sunrise mountain"],["🌅","sunrise sea"],["🌆","city dusk evening"],["🌇","city sunset"],["🌉","bridge night city"],["🗺️","map world travel"],["🏔️","snow mountain"],["🌋","volcano eruption"],["🏖️","beach sand sea"],["🏝️","island tropical"],["🏞️","park nature national"],
                          ]},
                          { icon: "💡", label: "Objects", items: [
                            ["💡","lightbulb idea bright"],["🔦","flashlight torch"],["🕯️","candle flame light"],["🧯","fire extinguisher safety"],["💸","money flying cash"],["💵","dollar bill money"],["💰","money bag rich"],["💳","credit card payment"],["💎","diamond gem precious"],["🔧","wrench tool repair"],["🔩","bolt screw nut"],["⚙️","gear settings cog"],["🧲","magnet attract"],["🪜","ladder climb steps"],["🧰","toolbox tools"],["🔑","key lock access"],["🔐","locked key secure"],["🔒","locked closed secure"],["🔓","unlocked open"],["🚪","door entrance exit"],["🪞","mirror reflect"],["🪟","window glass"],["🪑","chair seat"],["🛋️","couch sofa furniture"],["🛏️","bed sleep room"],["🛁","bathtub bath"],["🚿","shower clean"],["🧴","lotion bottle"],["🧹","broom sweep clean"],["🧺","basket laundry"],["🧻","roll paper toilet"],["🧼","soap clean wash"],["🪥","toothbrush clean"],
                            ["🎩","top hat magic fancy"],["🧢","cap hat baseball"],["👗","dress clothing fashion"],["👜","handbag purse"],["🎒","backpack bag school"],["🧳","luggage suitcase travel"],["👓","glasses spectacles"],["🕶️","sunglasses cool shades"],
                            ["📦","package box delivery"],["📝","memo note write"],["📄","page document"],["📋","clipboard list"],["📁","folder directory"],["📂","open folder"],["🗂️","card index dividers"],["📊","bar chart graph"],["📈","chart trend up"],["📉","chart trend down"],["📌","pin tack sticky"],["📍","pin location"],["✂️","scissors cut"],["🗑️","trash bin delete"],["🔍","magnify search zoom"],["🔎","magnify search zoom right"],
                            ["📱","phone mobile smartphone"],["☎️","telephone landline"],["📺","tv television screen"],["📻","radio music"],["🧭","compass navigate direction"],["⏱️","stopwatch timer"],["⏰","alarm clock"],["⌛","hourglass time"],["📡","satellite dish signal"],["🔋","battery power"],["🔌","plug power electric"],
                          ]},
                          { icon: "❤️", label: "Symbols", items: [
                            ["❤️","heart love red"],["🧡","orange heart"],["💛","yellow heart"],["💚","green heart"],["💙","blue heart"],["💜","purple heart"],["🖤","black heart"],["🤍","white heart"],["🤎","brown heart"],["💔","broken heart sad"],["❤️‍🔥","heart fire passion"],["❣️","heart exclamation"],["💕","two hearts love"],["💞","revolving hearts love"],["💓","beating heart love"],["💗","growing heart love"],["💖","sparkling heart love"],["💘","heart arrow love"],["💝","heart ribbon love"],["⭐","star favorite"],["🌟","glowing star"],["💫","dizzy star spin"],["✨","sparkles magic"],["🔥","fire hot flame trending"],["⚡","lightning bolt electric fast"],["💥","explosion collision crash"],["🎉","party celebrate confetti tada"],["🎊","confetti celebrate"],["🎈","balloon party"],["🎀","ribbon bow gift"],["🎁","gift present wrapped"],
                            ["✅","check green done success"],["☑️","check box done"],["❌","x cross wrong error"],["⭕","circle hollow red"],["🛑","stop sign halt"],["⛔","no entry stop"],["🚫","prohibited no"],["💯","hundred percent perfect"],["⚠️","warning caution alert"],["❓","question unknown"],["❗","exclamation important"],["ℹ️","info information"],["🆗","ok button"],["🆕","new button"],["🆒","cool button"],["🆙","up button"],["🆓","free button"],["🆘","sos emergency help"],
                            ["🔀","shuffle random"],["🔁","repeat loop"],["🔂","repeat once"],["▶️","play button"],["⏩","fast forward"],["⏸️","pause"],["⏹️","stop"],["⏺️","record"],["🔇","mute sound"],["🔈","speaker low"],["🔉","speaker medium"],["🔊","speaker high volume"],["🔔","bell notification"],["🔕","bell mute"],["📢","loudspeaker"],["📣","megaphone"],
                            ["♠️","spade card"],["♣️","club card"],["♥️","heart card"],["♦️","diamond card"],["🎴","flower card japanese"],["🔮","crystal ball magic predict"],["☮️","peace sign"],["☯️","yin yang balance"],["♾️","infinity loop"],["©️","copyright"],["®️","registered"],["™️","trademark"],
                          ]},
                          { icon: "🚩", label: "Flags", items: [
                            ["🏳️","white flag surrender"],["🏴","black flag"],["🚩","red flag warning"],["🏁","checkered flag finish race"],["🏴‍☠️","pirate flag skull"],["🏳️‍🌈","rainbow flag pride lgbtq"],["🏳️‍⚧️","transgender flag"],
                            ["🇦🇫","afghanistan flag"],["🇦🇱","albania flag"],["🇩🇿","algeria flag"],["🇦🇩","andorra flag"],["🇦🇴","angola flag"],["🇦🇷","argentina flag"],["🇦🇲","armenia flag"],["🇦🇺","australia flag"],["🇦🇹","austria flag"],["🇦🇿","azerbaijan flag"],["🇧🇭","bahrain flag"],["🇧🇩","bangladesh flag"],["🇧🇾","belarus flag"],["🇧🇪","belgium flag"],["🇧🇴","bolivia flag"],["🇧🇦","bosnia flag"],["🇧🇷","brazil flag"],["🇧🇬","bulgaria flag"],["🇰🇭","cambodia flag"],["🇨🇦","canada flag"],["🇨🇱","chile flag"],["🇨🇳","china flag"],["🇨🇴","colombia flag"],["🇭🇷","croatia flag"],["🇨🇺","cuba flag"],["🇨🇿","czech flag czechia"],["🇩🇰","denmark flag danish"],["🇩🇴","dominican republic flag"],["🇪🇨","ecuador flag"],["🇪🇬","egypt flag"],["🇸🇻","el salvador flag"],["🇪🇪","estonia flag"],["🇪🇹","ethiopia flag"],["🇫🇮","finland flag"],["🇫🇷","france flag french"],["🇬🇪","georgia flag"],["🇩🇪","germany flag german"],["🇬🇭","ghana flag"],["🇬🇷","greece flag greek"],["🇬🇹","guatemala flag"],["🇭🇳","honduras flag"],["🇭🇺","hungary flag"],["🇮🇸","iceland flag"],["🇮🇳","india flag indian"],["🇮🇩","indonesia flag"],["🇮🇷","iran flag persian"],["🇮🇶","iraq flag"],["🇮🇪","ireland flag irish"],["🇮🇱","israel flag"],["🇮🇹","italy flag italian"],["🇯🇲","jamaica flag"],["🇯🇵","japan flag japanese"],["🇯🇴","jordan flag"],["🇰🇿","kazakhstan flag"],["🇰🇪","kenya flag"],["🇰🇵","north korea flag"],["🇰🇷","south korea flag"],["🇰🇼","kuwait flag"],["🇱🇦","laos flag"],["🇱🇧","lebanon flag"],["🇱🇾","libya flag"],["🇲🇾","malaysia flag"],["🇲🇻","maldives flag"],["🇲🇱","mali flag"],["🇲🇦","morocco flag"],["🇲🇿","mozambique flag"],["🇲🇲","myanmar flag"],["🇳🇵","nepal flag"],["🇳🇱","netherlands flag dutch"],["🇳🇿","new zealand flag"],["🇳🇬","nigeria flag"],["🇳🇴","norway flag"],["🇴🇲","oman flag"],["🇵🇰","pakistan flag"],["🇵🇦","panama flag"],["🇵🇾","paraguay flag"],["🇵🇪","peru flag"],["🇵🇭","philippines flag"],["🇵🇱","poland flag"],["🇵🇹","portugal flag"],["🇶🇦","qatar flag"],["🇷🇴","romania flag"],["🇷🇺","russia flag russian"],["🇷🇼","rwanda flag"],["🇸🇦","saudi arabia flag"],["🇸🇳","senegal flag"],["🇷🇸","serbia flag"],["🇸🇬","singapore flag"],["🇸🇰","slovakia flag"],["🇸🇮","slovenia flag"],["🇸🇴","somalia flag"],["🇿🇦","south africa flag"],["🇸🇸","south sudan flag"],["🇪🇸","spain flag spanish"],["🇱🇰","sri lanka flag"],["🇸🇩","sudan flag"],["🇸🇪","sweden flag"],["🇨🇭","switzerland flag"],["🇸🇾","syria flag"],["🇹🇼","taiwan flag"],["🇹🇿","tanzania flag"],["🇹🇭","thailand flag"],["🇹🇷","turkey flag turkish"],["🇹🇲","turkmenistan flag"],["🇺🇬","uganda flag"],["🇺🇦","ukraine flag"],["🇦🇪","united arab emirates uae flag"],["🇬🇧","united kingdom uk great britain flag"],["🇺🇸","united states usa flag american"],["🇺🇿","uzbekistan flag"],["🇻🇪","venezuela flag"],["🇻🇳","vietnam flag"],["🇾🇪","yemen flag"],["🇿🇲","zambia flag"],["🇿🇼","zimbabwe flag"],["🏴󠁧󠁢󠁥󠁮󠁧󠁿","england flag"],["🏴󠁧󠁢󠁳󠁣󠁴󠁿","scotland flag"],["🏴󠁧󠁢󠁷󠁬󠁳󠁿","wales flag"],
                          ]},
                        ];
                        const q = emojiSearch.trim().toLowerCase();
                        const allItems = EMOJI_CATS.flatMap(c => c.items);
                        const displayItems = q
                          ? allItems.filter(([, n]) => n.includes(q))
                          : EMOJI_CATS[emojiCat].items;
                        return (
                          <div className="awp-emoji-pop" onMouseDown={(e) => e.stopPropagation()}>
                            {/* Search bar */}
                            <div className="awp-emoji-searchbar">
                              <i className="fas fa-search awp-emoji-searchicon" />
                              <input
                                className="awp-emoji-searchinput"
                                placeholder="Search Emoji"
                                value={emojiSearch}
                                onChange={(e) => setEmojiSearch(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              {emojiSearch && (
                                <button
                                  className="awp-emoji-searchclear"
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setEmojiSearch("")}
                                ><i className="fas fa-times" /></button>
                              )}
                            </div>
                            {/* Emoji grid */}
                            <div className="awp-emoji-grid">
                              {!q && (
                                <div className="awp-emoji-catlabel">{EMOJI_CATS[emojiCat].label}</div>
                              )}
                              {displayItems.length === 0 ? (
                                <div className="awp-emoji-noresult">No emoji found</div>
                              ) : (
                                <div className="awp-emoji-grid-inner">
                                  {displayItems.map(([ch, n]) => (
                                    <button
                                      key={ch}
                                      type="button"
                                      className="awp-emoji-btn"
                                      title={n}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => insertSpecialChar(ch)}
                                    >{ch}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Category tabs — pinned at bottom */}
                            {!q && (
                              <div className="awp-emoji-catbar">
                                {EMOJI_CATS.map((cat, i) => (
                                  <button
                                    key={cat.label}
                                    type="button"
                                    className={`awp-emoji-catbtn${emojiCat === i ? " is-active" : ""}`}
                                    title={cat.label}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setEmojiCat(i)}
                                  >{cat.icon}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    )}

                    <div className="awp-gif-wrap" ref={gifRef}>
                      <button
                        type="button"
                        data-tip="Insert GIF"
                        className={`awp-tbtn awp-gif-btn${gifOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => {
                          setGifOpen((open) => !open);
                          setGifSearch("");
                          setGifResults([]);
                          setGifError("");
                        }}
                      >
                        GIF
                      </button>
                      {gifOpen && (
                        <div className="awp-gif-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-emoji-searchbar">
                            <i className="fas fa-search awp-emoji-searchicon" />
                            <input
                              ref={gifInputRef}
                              className="awp-emoji-searchinput"
                              placeholder="Search Tenor GIFs"
                              value={gifSearch}
                              onChange={(e) => setGifSearch(e.target.value)}
                              onMouseDown={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                            {gifSearch && (
                              <button
                                className="awp-emoji-searchclear"
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setGifSearch("")}
                              >
                                <i className="fas fa-times" />
                              </button>
                            )}
                          </div>
                          <div className="awp-gif-strip">
                            {GIF_QUICK_SEARCHES.map((label) => (
                              <button
                                key={label}
                                type="button"
                                className={`awp-gif-chip${(!gifSearch.trim() && label === "Trending") || gifSearch.trim().toLowerCase() === label.toLowerCase() ? " is-active" : ""}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setGifSearch(label === "Trending" ? "" : label)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div
                            ref={gifGridRef}
                            className="awp-gif-grid"
                            onScroll={handleGifGridScroll}
                          >
                            {!gifLoading && !gifError && gifResults.length > 0 && (
                              <div className="awp-gif-section-title">
                                {gifSearch.trim() ? `GIFs for "${gifSearch.trim()}"` : "Trending GIFs"}
                              </div>
                            )}
                            {gifLoading && (
                              <div className="awp-gif-empty">
                                <i className="fas fa-spinner fa-spin" /> {gifSearch.trim() ? "Searching GIFs..." : "Loading GIFs..."}
                              </div>
                            )}
                            {!gifLoading && gifError && (
                              <div className="awp-gif-empty">{gifError}</div>
                            )}
                            {!gifLoading && !gifError && gifSearch.trim() && gifResults.length === 0 && (
                              <div className="awp-gif-empty">No GIFs found for this search.</div>
                            )}
                            {!gifLoading && !gifError && !gifSearch.trim() && gifResults.length === 0 && (
                              <div className="awp-gif-empty">Trending GIFs are unavailable right now.</div>
                            )}
                            {!gifLoading && gifResults.length > 0 && (
                              <div className="awp-gif-grid-inner">
                                {gifResults.map((gif) => (
                                  <button
                                    key={gif.id}
                                    type="button"
                                    className="awp-gif-item"
                                    title={gif.title}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => insertGifIntoEditor(gif)}
                                  >
                                    <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
                                  </button>
                                ))}
                              </div>
                            )}
                            {!gifLoading && gifLoadingMore && (
                              <div className="awp-gif-loadmore">
                                <i className="fas fa-spinner fa-spin" /> Loading more GIFs...
                              </div>
                            )}
                          </div>
                          <div className="awp-gif-footer">
                            <span>{gifSearch.trim() ? `${gifResults.length} results` : "Trending GIFs"}</span>
                            <span>Powered by Tenor</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Anchor / bookmark */}
                    <div className="awp-anchor-wrap" ref={anchorRef}>
                      <button
                        type="button" data-tip="Insert Anchor"
                        className={`awp-tbtn${anchorOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setAnchorOpen(o => !o)}
                      ><i className="fas fa-hashtag" /></button>
                      {anchorOpen && (
                        <div className="awp-anchor-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-embed-head">
                            <span>Insert Anchor</span>
                            <button type="button" className="awp-link-close" onClick={() => setAnchorOpen(false)} aria-label="Close">
                              <i className="fas fa-times" />
                            </button>
                          </div>
                          <label className="awp-link-label">Anchor ID</label>
                          <input
                            ref={anchorInputRef}
                            type="text"
                            className="awp-link-input"
                            placeholder="e.g. installation"
                            value={anchorId}
                            onChange={(e) => setAnchorId(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertAnchorMark(); } }}
                          />
                          <p className="awp-anchor-hint">Link to it with <code>#installation</code></p>
                          <div className="awp-link-actions">
                            <button type="button" className="abtn abtn-primary abtn-sm" onClick={insertAnchorMark}>Insert</button>
                            <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => setAnchorOpen(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Math / Formula */}
                  <div className="awp-toolbar-group">
                    <div className="awp-math-wrap" ref={mathRef}>
                      <button
                        type="button" data-tip="Math / Formula"
                        className={`awp-tbtn${mathOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setMathOpen(o => !o)}
                      ><i className="fas fa-calculator" /></button>
                      {mathOpen && (
                        <div className="awp-math-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-embed-head">
                            <span>Insert Formula</span>
                            <button type="button" className="awp-link-close" onClick={() => setMathOpen(false)}><i className="fas fa-times" /></button>
                          </div>
                          <div className="awp-math-type-row">
                            {["inline","block"].map(t => (
                              <button key={t} type="button"
                                className={`awp-math-type-btn${mathType === t ? " is-active" : ""}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setMathType(t)}
                              >{t === "inline" ? "Inline" : "Block"}</button>
                            ))}
                          </div>
                          <label className="awp-link-label">Formula (LaTeX)</label>
                          <input
                            ref={mathInputRef}
                            type="text"
                            className="awp-link-input awp-math-input"
                            placeholder={mathType === "inline" ? "e.g. x^2 + y^2 = z^2" : "e.g. \\sum_{i=0}^{n} x_i"}
                            value={mathFormula}
                            onChange={(e) => setMathFormula(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertMath(); }}}
                          />
                          <div className="awp-link-actions">
                            <button type="button" className="abtn abtn-primary abtn-sm" onClick={insertMath}>Insert</button>
                            <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => setMathOpen(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footnote */}
                    <button
                      type="button" data-tip="Insert Footnote"
                      className="awp-tbtn"
                      onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                      onClick={insertFootnote}
                    ><i className="fas fa-scroll" /></button>

                    {/* Labeled divider */}
                    <div className="awp-divider-wrap" ref={dividerRef}>
                      <button
                        type="button" data-tip="Section Divider"
                        className={`awp-tbtn${dividerOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setDividerOpen(o => !o)}
                      ><i className="fas fa-grip-lines" /></button>
                      {dividerOpen && (
                        <div className="awp-anchor-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-embed-head">
                            <span>Section Divider</span>
                            <button type="button" className="awp-link-close" onClick={() => setDividerOpen(false)}><i className="fas fa-times" /></button>
                          </div>
                          <label className="awp-link-label">Label (optional)</label>
                          <input
                            ref={dividerInputRef}
                            type="text"
                            className="awp-link-input"
                            placeholder="e.g. Further Reading"
                            value={dividerLabel}
                            onChange={(e) => setDividerLabel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertLabeledDivider(); }}}
                          />
                          <div className="awp-link-actions">
                            <button type="button" className="abtn abtn-primary abtn-sm" onClick={insertLabeledDivider}>Insert</button>
                            <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => setDividerOpen(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Auto TOC */}
                    <div className="awp-toc-wrap" ref={tocRef}>
                      <button
                        type="button" data-tip="Insert Table of Contents"
                        className={`awp-tbtn${tocOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                        onClick={() => setTocOpen(o => !o)}
                      ><i className="fas fa-list-alt" /></button>
                      {tocOpen && (
                        <div className="awp-anchor-pop awp-toc-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-embed-head">
                            <span>Table of Contents</span>
                            <button type="button" className="awp-link-close" onClick={() => setTocOpen(false)}><i className="fas fa-times" /></button>
                          </div>
                          <label className="awp-link-label">Title</label>
                          <input
                            ref={tocInputRef}
                            type="text"
                            className="awp-link-input"
                            placeholder="Table of Contents"
                            value={tocTitle}
                            onChange={(e) => setTocTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertTOC(); }}}
                          />
                          <p className="awp-anchor-hint">
                            {getTOCHeadings().length} heading{getTOCHeadings().length === 1 ? "" : "s"} detected
                          </p>
                          <div className="awp-link-actions">
                            <button type="button" className="abtn abtn-primary abtn-sm" onClick={insertTOC}>Insert</button>
                            <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => setTocOpen(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Clear block formatting */}
                    <button
                      type="button" data-tip="Clear Block Formatting"
                      className="awp-tbtn"
                      onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
                      onClick={clearBlockFormatting}
                    ><i className="fas fa-text-height" /></button>

                    {/* Word count */}
                    {editorSettings.showWordCount && (
                    <div className="awp-wc-wrap" ref={wordCountRef}>
                      <button
                        type="button" data-tip="Word Count"
                        className={`awp-tbtn${wordCountOpen ? " is-active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setWordCountOpen(o => !o)}
                      ><i className="fas fa-file-word" /></button>
                      {wordCountOpen && (
                        <div className="awp-wc-pop" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="awp-wc-title">Document Stats</div>
                          <div className="awp-wc-grid">
                            <span>Words</span><strong>{stats.words}</strong>
                            <span>Characters</span><strong>{stats.chars}</strong>
                            <span>Reading time</span><strong>{stats.readMin} min</strong>
                            <span>Headings</span><strong>{headingCount}</strong>
                            <span>Code blocks</span><strong>{codeBlockCount}</strong>
                            <span>Links</span><strong>{postSummary.links}</strong>
                            <span>Images</span><strong>{postSummary.images}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Fullscreen */}
                    <button
                      type="button" data-tip={fullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
                      className={`awp-tbtn${fullscreen ? " is-active" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={toggleFullscreen}
                    ><i className={`fas ${fullscreen ? "fa-compress" : "fa-expand"}`} /></button>
                  </div>

                  {/* Find & Replace panel — sits above editor, toggled by button */}
                  <button
                    type="button" data-tip="Find & Replace"
                    className={`awp-tbtn${findOpen ? " is-active" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { if (findOpen) { clearFindHighlights(); setFindStats({ total: 0, current: 0 }); } setFindOpen(o => !o); }}
                  ><i className="fas fa-search-plus" /></button>

                  <div className="awp-toolbar-sep" />

                  {/* Undo / Redo */}
                  <div className="awp-toolbar-group">
                    <button type="button" data-tip="Undo (Ctrl+Z)" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("undo")}><i className="fas fa-undo" /></button>
                    <button type="button" data-tip="Redo (Ctrl+Y)" className="awp-tbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("redo")}><i className="fas fa-redo" /></button>
                  </div>

                </div>{/* end awp-toolbar */}

                {/* Find & Replace panel */}
                {findOpen && (
                  <div className="awp-find-panel" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="awp-find-row">
                      <input
                        ref={findQueryRef}
                        type="text"
                        className="awp-find-input"
                        placeholder="Find…"
                        value={findQuery}
                        onChange={(e) => { setFindQuery(e.target.value); runFind(e.target.value); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findNav(1); }}}
                      />
                      <span className="awp-find-count">{findStats.total > 0 ? `${findStats.current}/${findStats.total}` : "0"}</span>
                      <button type="button" className="awp-find-nav" onMouseDown={(e) => e.preventDefault()} onClick={() => findNav(-1)} title="Previous"><i className="fas fa-chevron-up" /></button>
                      <button type="button" className="awp-find-nav" onMouseDown={(e) => e.preventDefault()} onClick={() => findNav(1)} title="Next"><i className="fas fa-chevron-down" /></button>
                    </div>
                    <div className="awp-find-row">
                      <input
                        type="text"
                        className="awp-find-input"
                        placeholder="Replace with…"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); performReplace(); }}}
                      />
                      <button type="button" className="abtn abtn-ghost abtn-sm" onMouseDown={(e) => e.preventDefault()} onClick={performReplace}>Replace</button>
                      <button type="button" className="abtn abtn-ghost abtn-sm" onMouseDown={(e) => e.preventDefault()} onClick={performReplaceAll}>All</button>
                      <button type="button" className="awp-find-close" onMouseDown={(e) => e.preventDefault()} onClick={() => { clearFindHighlights(); setFindOpen(false); setFindStats({ total: 0, current: 0 }); }}><i className="fas fa-times" /></button>
                    </div>
                  </div>
                )}

                {/* WYSIWYG content area */}
                <div
                  ref={contentEditableRef}
                  className="awp-editor-area"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={editorSettings.spellcheck}
                  data-placeholder="Start writing your post here…"
                  // onInput is intentionally omitted – state sync is handled
                  // by the mount-only native listener to avoid React blanking
                  // the editor during reconciliation.
                />

                {/* Hidden content image input */}
                <input
                  ref={contentImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  style={{ display: "none" }}
                  onChange={handleContentImageUpload}
                />

                {/* Image resize / alignment overlay — rendered in body via portal */}
                {selectedImg && imgOverlayPos && createPortal(
                  <div
                    className="aimg-overlay"
                    style={{
                      position: "fixed",
                      top:    imgOverlayPos.top,
                      left:   imgOverlayPos.left,
                      width:  imgOverlayPos.width,
                      height: imgOverlayPos.height,
                    }}
                    onMouseDown={e => e.preventDefault()}
                  >
                    {/* Alignment toolbar */}
                    <div className="aimg-toolbar">
                      {[
                        { align: "left",   icon: "fa-align-left",    title: "Float left"   },
                        { align: "center", icon: "fa-align-center",  title: "Center"       },
                        { align: "right",  icon: "fa-align-right",   title: "Float right"  },
                        { align: "full",   icon: "fa-arrows-alt-h",  title: "Full width"   },
                      ].map(({ align, icon, title }) => (
                        <button
                          key={align}
                          type="button"
                          className="aimg-tb-btn"
                          title={title}
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); applyImgAlignment(align); }}
                        >
                          <i className={`fas ${icon}`} />
                        </button>
                      ))}
                      <span className="aimg-tb-sep" />
                      <span className="aimg-tb-dims">
                        {Math.round(imgOverlayPos.width)} × {Math.round(imgOverlayPos.height)}
                      </span>
                    </div>

                    {/* 8 resize handles */}
                    {[
                      { dir: "nw", style: { top: -5,      left: -5,                                         cursor: "nwse-resize"  } },
                      { dir: "n",  style: { top: -5,      left: "50%", transform: "translateX(-50%)",       cursor: "ns-resize"   } },
                      { dir: "ne", style: { top: -5,      right: -5,                                        cursor: "nesw-resize"  } },
                      { dir: "e",  style: { top: "50%",   right: -5,   transform: "translateY(-50%)",       cursor: "ew-resize"   } },
                      { dir: "se", style: { bottom: -5,   right: -5,                                        cursor: "nwse-resize"  } },
                      { dir: "s",  style: { bottom: -5,   left: "50%", transform: "translateX(-50%)",       cursor: "ns-resize"   } },
                      { dir: "sw", style: { bottom: -5,   left: -5,                                         cursor: "nesw-resize"  } },
                      { dir: "w",  style: { top: "50%",   left: -5,    transform: "translateY(-50%)",       cursor: "ew-resize"   } },
                    ].map(({ dir, style }) => (
                      <div
                        key={dir}
                        className="aimg-handle"
                        style={{ ...style, cursor: style.cursor }}
                        onMouseDown={e => startImgResize(e, dir)}
                      />
                    ))}
                  </div>,
                  document.body
                )}
                {contentImageUploading && (
                  <div style={{ padding: "8px 16px", fontSize: 13, color: "#1565c0" }}>
                    Uploading… {contentImagePct}%
                  </div>
                )}
              </div>

              {/* Tags card */}
              <div className="aeditor-tags-card">
                <div className="aeditor-tags-header">
                  <h3 className="aeditor-tags-title">Tags</h3>
                  <button
                    type="button"
                    className="abtn abtn-primary abtn-sm"
                    style={{ padding: "3px 14px" }}
                    onClick={() => {
                      const input = document.getElementById("wtag-input");
                      if (input?.value.trim()) {
                        const t = input.value.trim().toLowerCase();
                        if (!form.tags.includes(t)) setForm((p) => ({ ...p, tags: [...p.tags, t] }));
                        input.value = "";
                        input.focus();
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="aeditor-tags-chips">
                    {form.tags.map((t) => (
                      <span key={t} className="atag-chip">
                        {t}
                        <button
                          type="button"
                          className="atag-rm"
                          onClick={() => setForm((p) => ({ ...p, tags: p.tags.filter((x) => x !== t) }))}
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  id="wtag-input"
                  className="ainput"
                  style={{ marginTop: 8 }}
                  placeholder="Add new tag"
                  onKeyDown={(e) => {
                    if (["Enter", "Tab", ","].includes(e.key)) {
                      e.preventDefault();
                      const t = e.target.value.trim().toLowerCase();
                      if (t && !form.tags.includes(t)) setForm((p) => ({ ...p, tags: [...p.tags, t] }));
                      e.target.value = "";
                    }
                  }}
                />
                <p className="aform-help" style={{ marginTop: 6 }}>Separate with commas or press Enter.</p>
              </div>

              <div className="aeditor-tech-card">
                <div className="aeditor-tags-header">
                  <h3 className="aeditor-tags-title">Technical Blogging Details</h3>
                  <span className="aeditor-counter">{form.metaDescription.length}/{META_DESCRIPTION_MAX}</span>
                </div>

                <div className="aeditor-tech-grid">
                  <label className="aeditor-tech-field aeditor-tech-field--wide">
                    <span>Excerpt</span>
                    <textarea
                      className="ainput aeditor-tech-textarea"
                      name="excerpt"
                      value={form.excerpt}
                      placeholder="Short summary for post cards and intro sections"
                      rows={3}
                      maxLength={220}
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field">
                    <span>SEO Title</span>
                    <input
                      className="ainput"
                      name="metaTitle"
                      value={form.metaTitle}
                      placeholder="Recommended under 60 characters"
                      maxLength={META_TITLE_MAX}
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field">
                    <span>Difficulty</span>
                    <select className="ainput" name="difficulty" value={form.difficulty} onChange={handleChange}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </label>

                  <label className="aeditor-tech-field aeditor-tech-field--wide">
                    <span>Meta Description</span>
                    <textarea
                      className="ainput aeditor-tech-textarea"
                      name="metaDescription"
                      value={form.metaDescription}
                      placeholder="Search/social description. Recommended under 160 characters"
                      rows={2}
                      maxLength={META_DESCRIPTION_MAX}
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field">
                    <span>Audience</span>
                    <input
                      className="ainput"
                      name="audience"
                      value={form.audience}
                      placeholder="e.g. React developers, backend engineers"
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field">
                    <span>Series</span>
                    <input
                      className="ainput"
                      name="series"
                      value={form.series}
                      placeholder="Optional series name"
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field aeditor-tech-field--wide">
                    <span>Prerequisites</span>
                    <input
                      className="ainput"
                      name="prerequisites"
                      value={form.prerequisites}
                      placeholder="Comma-separated concepts or tools readers should know"
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field">
                    <span>Repository URL</span>
                    <input
                      className="ainput"
                      name="repoUrl"
                      value={form.repoUrl}
                      placeholder="https://github.com/user/repo"
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field">
                    <span>Demo URL</span>
                    <input
                      className="ainput"
                      name="demoUrl"
                      value={form.demoUrl}
                      placeholder="https://demo.example.com"
                      onChange={handleChange}
                    />
                  </label>

                  <label className="aeditor-tech-field aeditor-tech-field--wide">
                    <span>Canonical URL</span>
                    <input
                      className="ainput"
                      name="canonicalUrl"
                      value={form.canonicalUrl}
                      placeholder="Original/canonical article URL, if cross-posted"
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>

            </div>

            {/* ── Right sidebar ── */}
            <div className="aeditor-sidebar">

              {/* Publish panel */}
              <div className="acard aeditor-panel acard--pub">
                <div className="aeditor-panel-title">Publish</div>

                {/* Action buttons */}
                <div className="aeditor-pub-btns">
                  {/* Row 1: Save Draft + Preview */}
                  <div className="aeditor-pub-btns-row">
                    <button
                      className="abtn abtn-ghost abtn-sm aeditor-pub-btn aeditor-pub-btn--draft"
                      onClick={() => handleSave("draft")}
                      disabled={saving}
                    >
                      {saving ? <><span className="aspin" /> Saving…</> : "Save Draft"}
                    </button>
                    <button
                      className="abtn abtn-ghost abtn-sm aeditor-pub-btn aeditor-pub-btn--preview"
                      onClick={() => setPreviewOpen(true)}
                      disabled={!form.content}
                    >
                      Preview
                    </button>
                  </div>
                  {/* Row 2: Submit for Review */}
                  <button
                    className="abtn abtn-ghost abtn-sm aeditor-pub-btn aeditor-pub-btn--review aeditor-pub-btn--full"
                    onClick={() => handleSave("review")}
                    disabled={saving}
                    title="Submit this post for admin review before publishing"
                  >
                    <i className="fas fa-paper-plane" />
                    {saving ? <><span className="aspin" /> Saving…</> : "Submit for Review"}
                  </button>
                  {/* Row 3: Publish */}
                  <button
                    className="abtn abtn-primary abtn-sm aeditor-pub-btn aeditor-pub-btn--publish aeditor-pub-btn--full"
                    onClick={() => handleSave("publish")}
                    disabled={saving}
                  >
                    {saving ? <><span className="aspin" /> Saving…</> : "Publish"}
                  </button>
                  <button
                    className="abtn abtn-ghost abtn-sm aeditor-pub-btn aeditor-pub-btn--schedule aeditor-pub-btn--full"
                    onClick={() => handleSave("schedule")}
                    disabled={saving || !form.scheduledAt}
                    title={form.scheduledAt ? "Schedule this post for later" : "Choose a date and time first"}
                  >
                    <i className="far fa-calendar-alt" />
                    {saving ? <><span className="aspin" /> Saving…</> : "Schedule"}
                  </button>
                </div>

                {/* Stats strip */}
                <div className="aeditor-pub-stats">
                  <span className="aeditor-pub-stat">
                    <i className="fas fa-align-left" />
                    {stats.words} words
                  </span>
                  <span className="aeditor-pub-stat-sep">·</span>
                  <span className="aeditor-pub-stat">
                    <i className="far fa-clock" />
                    {stats.readMin} min read
                  </span>
                </div>

                {/* Info rows */}
                <div className="aeditor-pub-rows">
                  <div className="aeditor-pub-row">
                    <span className="aeditor-pub-label">Status:</span>
                    <span className={`aeditor-pub-badge${form.published ? " aeditor-pub-badge--published" : form.pendingReview ? " aeditor-pub-badge--pending" : isScheduled ? " aeditor-pub-badge--scheduled" : " aeditor-pub-badge--draft"}`}>
                      {statusLabel}
                    </span>
                  </div>
                  {form.scheduledAt && (
                    <div className="aeditor-pub-row aeditor-pub-row--scheduled">
                      <span className="aeditor-pub-label">Schedule:</span>
                      <span className="aeditor-pub-scheduled-val">{formatScheduledDate(form.scheduledAt)}</span>
                    </div>
                  )}
                </div>

                {/* Permalink / Slug */}
                <div className="aeditor-pub-section">
                  <div className="aeditor-pub-section-label">
                    <i className="fas fa-link" />
                    Permalink
                  </div>
                  <div className="aeditor-pub-slug-wrap">
                    <span className="aeditor-pub-slug-prefix">/blogs/</span>
                    <input
                      type="text"
                      className="aeditor-pub-slug-input"
                      value={form.slug}
                      placeholder={slugify(form.title) || "post-url-slug"}
                      onChange={(e) => {
                        slugCustomizedRef.current = true;
                        setForm((p) => ({
                          ...p,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="aeditor-pub-section">
                  <div className="aeditor-pub-section-label">
                    <i className="far fa-calendar-alt" />
                    Schedule Publish
                  </div>
                  <button
                    type="button"
                    className={`aeditor-schedule-card${form.scheduledAt ? " is-set" : ""}`}
                    onClick={() => setSchedulePickerOpen(true)}
                  >
                    <span className="aeditor-schedule-icon">
                      <i className="far fa-calendar-check" />
                    </span>
                    <span className="aeditor-schedule-copy">
                      <strong>{form.scheduledAt ? formatScheduledDate(form.scheduledAt) : "Choose date and time"}</strong>
                      <small>{form.scheduledAt ? "Post will publish automatically when due" : "Select when this post should go live"}</small>
                    </span>
                    <i className="fas fa-chevron-right aeditor-schedule-arrow" />
                  </button>
                  {form.scheduledAt && (
                    <button
                      type="button"
                      className="aeditor-pub-clear-date"
                      onClick={() => setForm((p) => ({ ...p, scheduledAt: "" }))}
                    >
                      Clear schedule
                    </button>
                  )}
                </div>

                {/* Toggle rows */}
                <div className="aeditor-pub-toggles">
                  <label className="aeditor-pub-toggle-row">
                    <span className="aeditor-pub-toggle-info">
                      <i className="fas fa-comment-alt" />
                      <span>Allow Comments</span>
                    </span>
                    <span
                      role="switch"
                      aria-checked={form.allowComments}
                      className={`apub-toggle${form.allowComments ? " apub-toggle--on" : ""}`}
                      onClick={() => setForm((p) => ({ ...p, allowComments: !p.allowComments }))}
                    >
                      <span className="apub-toggle-thumb" />
                    </span>
                  </label>
                  <label className="aeditor-pub-toggle-row">
                    <span className="aeditor-pub-toggle-info">
                      <i className="fas fa-star" />
                      <span>Featured Post</span>
                    </span>
                    <span
                      role="switch"
                      aria-checked={form.featured}
                      className={`apub-toggle${form.featured ? " apub-toggle--on" : ""}`}
                      onClick={() => setForm((p) => ({ ...p, featured: !p.featured }))}
                    >
                      <span className="apub-toggle-thumb" />
                    </span>
                  </label>
                </div>

              </div>

              {editorSettings.editorReadiness && (
              <div className="acard aeditor-panel">
                <div className="aeditor-panel-title">Editor Readiness</div>
                <div className="aeditor-readiness">
                  <div className="aeditor-readiness-score">
                    <span>{completedChecks}/{editorChecks.length}</span>
                    <strong>checks complete</strong>
                  </div>
                  <div className="aeditor-readiness-bar">
                    <span style={{ width: `${Math.round((completedChecks / editorChecks.length) * 100)}%` }} />
                  </div>
                  <div className="aeditor-readiness-list">
                    {editorChecks.map((item) => (
                      <div key={item.label} className={`aeditor-readiness-item${item.done ? " is-done" : ""}`}>
                        <i className={`fas ${item.done ? "fa-check-circle" : "fa-circle"}`} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="aeditor-mini-stats">
                    <span><i className="fas fa-heading" /> {postSummary.headings}</span>
                    <span><i className="fas fa-code" /> {postSummary.codeBlocks}</span>
                    <span><i className="fas fa-link" /> {postSummary.links}</span>
                    <span><i className="far fa-image" /> {postSummary.images}</span>
                  </div>
                </div>
              </div>
              )}

              {/* Categories panel */}
              <div className="acard aeditor-panel">
                <div
                  className="aeditor-panel-title aeditor-panel-collapsible"
                  onClick={() => setCatPanelOpen((o) => !o)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Categories
                    {form.categoryIds.length > 0 && (
                      <span className="aeditor-cat-badge">{form.categoryIds.length}</span>
                    )}
                  </span>
                  <i
                    className="fas fa-chevron-down aeditor-panel-chevron"
                    style={{ transform: catPanelOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </div>

                {catPanelOpen && (
                  <>
                    {allCategories.length > 4 && (
                      <div className="aeditor-cat-search-wrap">
                        <i className="fas fa-search aeditor-cat-search-icon" />
                        <input
                          className="aeditor-cat-search"
                          placeholder="Search categories…"
                          value={catSearch}
                          onChange={(e) => setCatSearch(e.target.value)}
                        />
                        {catSearch && (
                          <button
                            type="button"
                            className="aeditor-cat-search-clear"
                            onClick={() => setCatSearch("")}
                          >×</button>
                        )}
                      </div>
                    )}

                    <div className="aeditor-cats-outer">
                    <div className="aeditor-cats">
                      {catsLoading ? (
                        <span className="aeditor-cat-empty">Loading…</span>
                      ) : allCategories.length === 0 ? (
                        <span className="aeditor-cat-empty">No categories yet.</span>
                      ) : (() => {
                        const visible = allCategories.filter((c) =>
                          c.name.toLowerCase().includes(catSearch.toLowerCase())
                        );
                        if (visible.length === 0) return <span className="aeditor-cat-empty">No match.</span>;
                        const allChecked = visible.every((c) => form.categoryIds.includes(c.id));
                        return (
                          <>
                            <div className="aeditor-selectall-row">
                              <button
                                type="button"
                                className="aeditor-selectall-btn"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    categoryIds: allChecked
                                      ? prev.categoryIds.filter((x) => !visible.map((c) => c.id).includes(x))
                                      : [...new Set([...prev.categoryIds, ...visible.map((c) => c.id)])],
                                  }))
                                }
                              >
                                {allChecked ? "Clear all" : "Select all"}
                              </button>
                            </div>
                            {visible.map((cat) => (
                              <label key={cat.id} className="aeditor-cat-label">
                                <input
                                  type="checkbox"
                                  className="achk"
                                  checked={form.categoryIds.includes(cat.id)}
                                  onChange={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      categoryIds: prev.categoryIds.includes(cat.id)
                                        ? prev.categoryIds.filter((x) => x !== cat.id)
                                        : [...prev.categoryIds, cat.id],
                                    }))
                                  }
                                />
                                {cat.name}
                              </label>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                    </div>

                    {/* Quick-add trigger */}
                    <button type="button" className="aeditor-addcat-link" onClick={() => setAddCatOpen(true)}>
                      + Add New Category
                    </button>
                  </>
                )}
              </div>

              {/* Tags panel */}
              <div className="acard aeditor-panel">
                <div
                  className="aeditor-panel-title aeditor-panel-collapsible"
                  onClick={() => setTagPanelOpen((o) => !o)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Tags
                    {form.tags.length > 0 && (
                      <span className="aeditor-cat-badge">{form.tags.length}</span>
                    )}
                  </span>
                  <i
                    className="fas fa-chevron-down aeditor-panel-chevron"
                    style={{ transform: tagPanelOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </div>

                {tagPanelOpen && (
                  <>
                    {/* Search — only when there are enough tags */}
                    {allTags.length > 0 && (
                      <div className="aeditor-cat-search-wrap">
                        <i className="fas fa-search aeditor-cat-search-icon" />
                        <input
                          className="aeditor-cat-search"
                          placeholder="Search tags…"
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                        />
                        {tagSearch && (
                          <button
                            type="button"
                            className="aeditor-cat-search-clear"
                            onClick={() => setTagSearch("")}
                          >×</button>
                        )}
                      </div>
                    )}

                    <div className="aeditor-cats-outer">
                    <div className="aeditor-cats">
                      {tagsLoading ? (
                        <span className="aeditor-cat-empty">Loading…</span>
                      ) : allTags.length === 0 ? (
                        <span className="aeditor-cat-empty">No tags yet.</span>
                      ) : (() => {
                        const visible = allTags.filter((t) =>
                          t.name.toLowerCase().includes(tagSearch.toLowerCase())
                        );
                        if (visible.length === 0) return <span className="aeditor-cat-empty">No match.</span>;
                        const allTagsChecked = visible.every((t) => form.tags.includes(t.name));
                        return (
                          <>
                            <div className="aeditor-selectall-row">
                              <button
                                type="button"
                                className="aeditor-selectall-btn"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    tags: allTagsChecked
                                      ? prev.tags.filter((x) => !visible.map((t) => t.name).includes(x))
                                      : [...new Set([...prev.tags, ...visible.map((t) => t.name)])],
                                  }))
                                }
                              >
                                {allTagsChecked ? "Clear all" : "Select all"}
                              </button>
                            </div>
                            {visible.map((tag) => (
                              <label key={tag.id} className="aeditor-cat-label">
                                <input
                                  type="checkbox"
                                  className="achk"
                                  checked={form.tags.includes(tag.name)}
                                  onChange={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      tags: prev.tags.includes(tag.name)
                                        ? prev.tags.filter((x) => x !== tag.name)
                                        : [...prev.tags, tag.name],
                                    }))
                                  }
                                />
                                {tag.name}
                              </label>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                    </div>

                    {/* Quick-add tag trigger */}
                    <button type="button" className="aeditor-addcat-link" onClick={() => setAddTagOpen(true)}>
                      + Add New Tag
                    </button>
                  </>
                )}
              </div>

              {/* Featured Image panel */}
              <div className="acard aeditor-panel">
                <div
                  className="aeditor-panel-title aeditor-panel-collapsible"
                  onClick={() => setFeatPanelOpen((o) => !o)}
                >
                  Featured Image
                  <i
                    className="fas fa-chevron-down aeditor-panel-chevron"
                    style={{ transform: featPanelOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </div>
                {featPanelOpen && (
                  <>
                    {form.image && (
                      <div className="aeditor-feat-img-wrap">
                        <img src={form.image} alt="Featured" className="aeditor-feat-img" />
                        <button
                          type="button"
                          className="acover-remove-btn"
                          onClick={() => setForm((p) => ({ ...p, image: "", imageAlt: "" }))}
                        >✕</button>
                      </div>
                    )}
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <label className="aeditor-image-alt-field">
                        <span>Image Alt Text</span>
                        <input
                          type="text"
                          className="ainput"
                          value={form.imageAlt}
                          placeholder="Describe the cover image for accessibility"
                          maxLength={140}
                          onChange={(e) => setForm((p) => ({ ...p, imageAlt: e.target.value }))}
                        />
                      </label>
                      <button
                        type="button"
                        className="abtn abtn-primary"
                        style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}
                        onClick={() => coverInputRef.current?.click()}
                      >
                        {form.image ? "Change Featured Image" : "Set Featured Image"}
                      </button>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        style={{ display: "none" }}
                        onChange={handleCoverUpload}
                      />
                      <button
                        type="button"
                        className="abtn abtn-ghost"
                        style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}
                        onClick={() => openMediaPicker("cover")}
                      >
                        Pick from Library
                      </button>
                      {uploading && (
                        <div className="acover-progress-wrap">
                          <div className="acover-progress-bar" style={{ width: `${uploadPct}%` }} />
                          <span className="acover-progress-label">Uploading… {uploadPct}%</span>
                        </div>
                      )}
                      {isEditing && form.published && (
                        <a
                          href={`/#/blogs/${form.slug || slugify(form.title)}`}
                          className="abtn abtn-ghost"
                          style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🌐 View Live Post
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          {schedulePickerOpen && (
            <AdminDatePicker
              value={form.scheduledAt || toDateTimeLocalValue(new Date())}
              showTime
              onClose={() => setSchedulePickerOpen(false)}
              onChange={(date) => {
                const picked = date < new Date() ? new Date() : date;
                setForm((p) => ({ ...p, scheduledAt: toDateTimeLocalValue(picked) }));
              }}
            />
          )}
        </div>
      </main>

      {/* ── Media picker modal ── */}
      {mediaPickerOpen && (
        <div className="amedia-picker-overlay" onClick={() => setMediaPickerOpen(false)}>
          <div className="amedia-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="amedia-picker-topbar">
              <span className="apreview-label">
                {mediaPickerMode === "content"
                  ? "🖼 Media Library — insert image into content"
                  : "🖼 Media Library — select a cover image"}
              </span>
              <button className="abtn abtn-ghost abtn-sm" onClick={() => setMediaPickerOpen(false)}>× Close</button>
            </div>
            <div className="amedia-picker-body">
              {mediaLoading ? (
                <div className="aeditor-loading"><span className="aspin" /> Loading media…</div>
              ) : mediaItems.length === 0 ? (
                <div className="aempty" style={{ padding: "40px 24px" }}>
                  <div className="aempty-icon">🖼</div>
                  <p className="aempty-title">No images uploaded yet</p>
                  <p className="aempty-sub">Upload images via the Media Library.</p>
                </div>
              ) : (
                <div className="amedia-grid amedia-grid--picker">
                  {mediaItems.map((item) => (
                    <div
                      key={item.fullPath}
                      className="amedia-card amedia-card--selectable"
                      onClick={() => {
                        if (mediaPickerMode === "content") {
                          insertImageFromMedia(item);
                          return;
                        }
                        setForm((p) => ({ ...p, image: item.url }));
                        setMediaPickerOpen(false);
                        toast?.addToast("Cover image selected!", "success");
                      }}
                    >
                      <div className="amedia-thumb-wrap">
                        <img src={item.url} alt={item.name} className="amedia-thumb" loading="lazy" />
                      </div>
                      <div className="amedia-card-footer">
                        <span className="amedia-card-name" title={item.name}>{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Preview modal ── */}
      {previewOpen && (
        <div className="apreview-modal" onClick={() => setPreviewOpen(false)}>
          <div className="apreview-inner" onClick={(e) => e.stopPropagation()}>
            <div className="apreview-topbar">
              <span className="apreview-label">📄 Preview</span>
              <button className="abtn abtn-ghost abtn-sm" onClick={() => setPreviewOpen(false)}>× Close</button>
            </div>
            {form.image && (
              <img
                src={form.image}
                alt="Cover"
                style={{ width: "100%", maxHeight: 320, objectFit: "cover" }}
              />
            )}
            <div className="apreview-body">
              <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>{form.title || "Untitled"}</h1>
              {form.subtitle && (
                <p style={{ margin: "0 0 16px", color: "var(--atxt2)", fontSize: 16 }}>{form.subtitle}</p>
              )}
              {form.tags.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                  {form.tags.map((t) => <span key={t} className="atag-chip">{t}</span>)}
                </div>
              )}
              <div
                className="bp-body bp-body--html"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(transformPreviewHtml(form.content), { mode: "adminPreview" }) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Add New Tag modal ── */}
      {addTagOpen && (
        <div
          className="acat-modal-overlay"
          onClick={() => { if (!addingTag) { setAddTagOpen(false); setNewTagName(""); } }}
        >
          <div className="acat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acat-modal-header">
              <h3 className="acat-modal-title">Add New Tag</h3>
              <button
                type="button"
                className="acat-modal-close"
                onClick={() => { setAddTagOpen(false); setNewTagName(""); }}
                disabled={addingTag}
              >×</button>
            </div>
            <form onSubmit={handleAddQuickTag} className="acat-modal-body">
              <div className="acat-modal-field">
                <label className="acat-modal-label">Tag Name</label>
                <input
                  className="ainput"
                  placeholder="e.g. React"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="abtn abtn-primary acat-modal-submit"
                disabled={addingTag || !newTagName.trim()}
              >
                {addingTag
                  ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Adding…</>
                  : "Add New Tag"}
              </button>
              <button
                type="button"
                className="acat-modal-cancel-link"
                onClick={() => { setAddTagOpen(false); setNewTagName(""); }}
                disabled={addingTag}
              >Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add New Category modal ── */}
      {addCatOpen && (
        <div
          className="acat-modal-overlay"
          onClick={() => { if (!addingCat) { setAddCatOpen(false); setNewCatName(""); setNewCatParentId(""); } }}
        >
          <div className="acat-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="acat-modal-header">
              <h3 className="acat-modal-title">Add New Category</h3>
              <button
                type="button"
                className="acat-modal-close"
                onClick={() => { setAddCatOpen(false); setNewCatName(""); setNewCatParentId(""); }}
                disabled={addingCat}
              >×</button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddQuickCat} className="acat-modal-body">
              <div className="acat-modal-field">
                <label className="acat-modal-label">Name</label>
                <input
                  className="ainput"
                  placeholder="Nature"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="acat-modal-field">
                <label className="acat-modal-label">Parent Category</label>
                <select
                  className="ainput acat-modal-select"
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value)}
                >
                  <option value="">None</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="abtn abtn-primary acat-modal-submit"
                disabled={addingCat || !newCatName.trim()}
              >
                {addingCat
                  ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Adding…</>
                  : "Add New Category"}
              </button>

              <button
                type="button"
                className="acat-modal-cancel-link"
                onClick={() => { setAddCatOpen(false); setNewCatName(""); setNewCatParentId(""); }}
                disabled={addingCat}
              >Cancel</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
