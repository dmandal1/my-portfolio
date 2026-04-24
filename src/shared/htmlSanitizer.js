import DOMPurify from "dompurify";

const SAFE_URL_RE = /^(?:(?:https?:)?\/\/|mailto:|tel:|\/|#)/i;

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
]);

function filterInlineStyle(styleText) {
  const raw = String(styleText || "");
  if (!raw) return "";

  const parts = raw.split(";").map((p) => p.trim()).filter(Boolean);
  const kept = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    const lowerVal = val.toLowerCase();
    // Block url(), javascript:, and legacy IE expression().
    if (lowerVal.includes("url(") || lowerVal.includes("expression(") || lowerVal.includes("javascript:")) continue;
    kept.push(`${prop}: ${val}`);
  }
  return kept.join("; ");
}

let hooksInstalled = false;
function ensureHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!node || !node.getAttribute) return;

    // Normalize outbound links opened in a new tab.
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (href && !SAFE_URL_RE.test(href)) {
        node.removeAttribute("href");
      }

      const target = (node.getAttribute("target") || "").toLowerCase();
      if (target === "_blank") {
        const rel = (node.getAttribute("rel") || "").toLowerCase();
        const tokens = new Set(rel.split(/\s+/).filter(Boolean));
        tokens.add("noopener");
        tokens.add("noreferrer");
        node.setAttribute("rel", Array.from(tokens).join(" "));
      }
    }

    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") || "";
      // Disallow data: URLs to avoid SVG/data-based surprises.
      if (src && (!SAFE_URL_RE.test(src) || /^data:/i.test(src))) {
        node.removeAttribute("src");
      }
    }

    if (node.tagName === "INPUT") {
      // Only allow safe checklist-style checkboxes in public HTML.
      node.setAttribute("type", "checkbox");
      node.setAttribute("disabled", "disabled");
      node.removeAttribute("name");
      node.removeAttribute("value");
      node.removeAttribute("form");
    }

    if (node.tagName === "BUTTON") {
      // Ensure buttons are non-submitting inside injected content.
      node.setAttribute("type", "button");
    }
  });

  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (!data) return;
    if (data.attrName === "style") {
      const filtered = filterInlineStyle(data.attrValue);
      if (!filtered) {
        data.keepAttr = false;
      } else {
        data.attrValue = filtered;
      }
    }
  });
}

export function sanitizeRichHtml(dirtyHtml, { mode = "public" } = {}) {
  ensureHooks();

  const baseCfg = {
    // DOMPurify already forbids scripts/iframes by default; make intent explicit.
    FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "meta"],
    // No unknown protocols in href/src.
    ALLOW_UNKNOWN_PROTOCOLS: false,
    USE_PROFILES: { html: true },
  };

  const cfg =
    mode === "adminPreview"
      ? {
          ...baseCfg,
          // Admin preview can be a bit more flexible, but still sanitized.
          ALLOWED_TAGS: [
            "div","p","br","b","i","strong","em","u","s","strike",
            "h1","h2","h3","h4","h5","h6",
            "ul","ol","li","blockquote","pre","code",
            "a","img","table","thead","tbody","tr","th","td",
            "span","hr","figure","figcaption","details","summary","input","time","button",
          ],
          ALLOWED_ATTR: [
            "href","src","alt","title","target","rel","class","style","open",
            "type","checked","disabled",
            "data-terminal-copy","data-technical-type","data-method","aria-hidden",
          ],
        }
      : {
          ...baseCfg,
          ALLOWED_TAGS: [
            "div","p","br","b","i","strong","em","u","s","strike",
            "h1","h2","h3","h4","h5","h6",
            "ul","ol","li","blockquote","pre","code",
            "a","img","table","thead","tbody","tr","th","td",
            "span","hr","figure","figcaption","details","summary","input","time","button",
          ],
          ALLOWED_ATTR: [
            "href","src","alt","title","target","rel","class","style","open",
            "type","checked","disabled",
            "data-terminal-copy","data-technical-type","data-method","aria-hidden",
          ],
        };

  return DOMPurify.sanitize(String(dirtyHtml || ""), cfg);
}

