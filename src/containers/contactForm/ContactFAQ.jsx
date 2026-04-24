import React, { useState } from "react";
import "./ContactFAQ.css";
import { Fade } from "../../components/animations/Reveal";

const faqs = [
  {
    q: "What kind of projects are you open to?",
    a: "I'm open to full-stack web and mobile projects, freelance contracts, long-term collaborations, and full-time roles. I work primarily with JavaScript, React, Node.js, and cloud-based architectures.",
  },
  {
    q: "How quickly do you respond?",
    a: "I aim to reply to all messages within 24 hours on weekdays. For urgent matters, reaching out via email is the fastest route.",
  },
  {
    q: "Are you available for remote work?",
    a: "Yes! I'm fully set up for remote work and have collaborated with teams across different time zones. I'm also open to hybrid arrangements in Noida/NCR.",
  },
  {
    q: "Can you help with code reviews or consulting?",
    a: "Absolutely. I'm happy to do one-off consulting sessions, architecture reviews, or help debug tricky problems. Just drop me a message with some context.",
  },
  {
    q: "Do you take on open source contributions?",
    a: "Yes, I actively contribute to open source and welcome collaboration. If you have an interesting project, feel free to reach out.",
  },
];

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
  const [openIndex, setOpenIndex] = useState(null);

  function handleToggle(i) {
    setOpenIndex(openIndex === i ? null : i);
  }

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
