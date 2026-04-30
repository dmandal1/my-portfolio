import React, { useState } from "react";
import "./ContactFAQ.css";
import { Fade } from "../../components/animations/Reveal";
import { contactPageData as defaultContactPageData } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

function FAQItem({ faq, theme, open, onToggle }) {
  return (
    <div
      className={`faq-item ${open ? "open" : ""}`}
      style={{ borderColor: theme.imageDark }}
    >
      <button
        className="faq-question"
        onClick={onToggle}
        style={{ color: theme.text }}
        aria-expanded={open}
      >
        <span>{faq.q}</span>
        <span className="faq-chevron" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="faq-answer" style={{ color: theme.secondaryText }}>
          {faq.a}
        </p>
      )}
    </div>
  );
}

export default function ContactFAQ({ theme }) {
  const data = usePortfolioData();
  const faqs = data?.contactPageData?.faqs || defaultContactPageData.faqs || [];
  const [openIndex, setOpenIndex] = useState(null);

  function handleToggle(i) {
    setOpenIndex(openIndex === i ? null : i);
  }

  if (!faqs.length) return null;

  return (
    <Fade direction="up" duration={1000}>
      <div className="faq-section">
        <h2 className="faq-title" style={{ color: theme.text }}>
          Frequently Asked Questions
        </h2>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              theme={theme}
              open={openIndex === i}
              onToggle={() => handleToggle(i)}
            />
          ))}
        </div>
      </div>
    </Fade>
  );
}
