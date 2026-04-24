import React, { useState } from "react";
import "./QuickContact.css";
import { Fade } from "../../components/animations/Reveal";
import { contactInfo, contactPageData } from "../../portfolio";

const addressSection = contactPageData.addressSection;

function ContactCard({ icon, label, value, href, copyValue, theme }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e) {
    e.preventDefault();
    navigator.clipboard.writeText(copyValue || value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="qc-card" style={{ borderColor: theme.imageDark }}>
      <div className="qc-icon" style={{ background: "linear-gradient(135deg,#1565C0,#42A5F5)" }}>
        {icon}
      </div>
      <div className="qc-info">
        <span className="qc-label" style={{ color: theme.secondaryText }}>
          {label}
        </span>
        <a className="qc-value" href={href} style={{ color: theme.text }}>
          {value}
        </a>
      </div>
      <button
        className={`qc-copy-btn ${copied ? "copied" : ""}`}
        onClick={handleCopy}
        title="Copy to clipboard"
        aria-label={copied ? "Copied!" : "Copy"}
      >
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function QuickContact({ theme }) {
  return (
    <Fade direction="up" duration={1000}>
      <div className="qc-section">
        <br />
        <br />
        <div className="qc-availability" style={{ color: "#2e7d32", background: "rgba(46,125,50,0.08)" }}>
          <span className="qc-dot" />
          Available for opportunities · replies within 24 hours
        </div>
        <div className="qc-cards-row">
          <ContactCard
            theme={theme}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
            label="Email"
            value={contactInfo.email_address}
            href={`mailto:${contactInfo.email_address}`}
            copyValue={contactInfo.email_address}
          />
          <ContactCard
            theme={theme}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            }
            label="Phone"
            value={contactInfo.number}
            href={`tel:${contactInfo.number}`}
            copyValue={contactInfo.number}
          />
          <ContactCard
            theme={theme}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            label="Location"
            value={addressSection.subtitle}
            href={addressSection.location_map_link}
            copyValue={addressSection.subtitle}
          />
        </div>
      </div>
    </Fade>
  );
}
