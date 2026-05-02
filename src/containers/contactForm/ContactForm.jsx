import React, { useState, useRef, useEffect } from "react";
import emailjs from "@emailjs/browser";
import "./ContactForm.css";
import { Fade } from "../../components/animations/Reveal";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_CHARS = /^[\d\s\-()\\.]+$/;

import { COUNTRY_CODES, ISO_TO_DIAL } from "../../constants/countryCodes";

const EMPTY_FORM = { name: "", email: "", countryCode: "+1", phone: "", subject: "", message: "" };
const EMPTY_ERRORS = { name: "", email: "", phone: "", subject: "", message: "" };

function validate(form) {
  const errors = { ...EMPTY_ERRORS };
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else {
    const digits = form.phone.replace(/\D/g, "");
    if (!PHONE_ALLOWED_CHARS.test(form.phone.trim())) {
      errors.phone = "Only digits, spaces, dashes, and parentheses are allowed.";
    } else if (digits.length < 6) {
      errors.phone = "Phone number must have at least 6 digits.";
    } else if (digits.length > 15) {
      errors.phone = "Phone number must have at most 15 digits.";
    }
  }
  if (!form.subject.trim()) errors.subject = "Subject is required.";
  if (!form.message.trim()) errors.message = "Message is required.";
  return errors;
}

function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

function PhoneCountrySelect({ value, onChange, theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef();
  const searchRef = useRef();

  const selected = COUNTRY_CODES.find((c) => c.label.includes(value) && c.code === value)
    || COUNTRY_CODES.find((c) => c.code === value)
    || COUNTRY_CODES[0];
  const selectedFlag = selected.label.split(" ")[0];

  const filtered = COUNTRY_CODES.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) searchRef.current.focus();
  }, [isOpen]);

  function handleSelect(code) {
    onChange(code);
    setIsOpen(false);
    setSearch("");
  }

  return (
    <div className="phone-country-dropdown" ref={containerRef}>
      <input id="cf-country-code-hidden" type="hidden" name="countryCode" value={value} />
      <button
        type="button"
        className="phone-country-trigger"
        onClick={() => setIsOpen((o) => !o)}
        style={{ color: theme.text }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedFlag} {value}</span>
        <span className={`dropdown-arrow${isOpen ? " open" : ""}`}>▾</span>
      </button>
      {isOpen && (
        <div
          className="phone-country-menu"
          style={{ background: theme.body || "#fff", borderColor: theme.imageDark }}
          role="listbox"
        >
          <div className="phone-country-search-wrap" style={{ borderColor: theme.imageDark }}>
            <span className="search-icon">🔍</span>
            <input
              ref={searchRef}
              id="cf-country-search"
              name="countrySearch"
              type="text"
              className="phone-country-search"
              placeholder="Search country or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              aria-label="Search country codes"
              style={{ color: theme.text }}
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch("")}
                style={{ color: theme.secondaryText }}
              >✕</button>
            )}
          </div>
          <ul className="phone-country-list">
            {filtered.length > 0 ? filtered.map(({ code, label }) => {
              const flag = label.split(" ")[0];
              const name = label.replace(/^[^ ]+ /, "").replace(/ \(.*\)$/, "");
              return (
                <li
                  key={label}
                  className={`phone-country-item${code === value && label === selected.label ? " active" : ""}`}
                  onClick={() => handleSelect(code)}
                  role="option"
                  aria-selected={code === value}
                  style={{ color: theme.text }}
                >
                  <span className="item-flag">{flag}</span>
                  <span className="item-name" style={{ color: theme.text }}>{name}</span>
                  <span className="item-code" style={{ color: theme.secondaryText }}>{code}</span>
                </li>
              );
            }) : (
              <li className="phone-country-no-results" style={{ color: theme.secondaryText }}>
                No countries found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ContactForm({ theme }) {
  const formRef = useRef();
  const detectedCodeRef = useRef("+1");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [touched, setTouched] = useState(EMPTY_ERRORS);
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"

  useEffect(() => {
    let cancelled = false;

    function applyCode(isoCode) {
      const dialCode = ISO_TO_DIAL[isoCode];
      if (!dialCode) return false;
      const match = COUNTRY_CODES.find((c) => c.code === dialCode);
      if (!match || cancelled) return false;
      detectedCodeRef.current = match.code;
      setForm((prev) => (prev.countryCode === "+1" ? { ...prev, countryCode: match.code } : prev));
      return true;
    }

    async function detect() {
      // 1. Try IP geolocation (3 s timeout, CORS-safe endpoint)
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch("https://api.country.is/", { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const { country } = await res.json();
          if (applyCode((country || "").toUpperCase())) return;
        }
      } catch (_) { /* timed out or blocked — fall through */ }

      // 2. Fallback: browser locale (e.g. "en-IN" → "IN")
      if (cancelled) return;
      const lang = (typeof navigator !== "undefined" && navigator.language) || "";
      const region = (lang.split("-")[1] || "").toUpperCase();
      applyCode(region);
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  function handleChange(e) {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (touched[e.target.name]) {
      setErrors(validate(updated));
    }
  }

  function handleBlur(e) {
    const updatedTouched = { ...touched, [e.target.name]: true };
    setTouched(updatedTouched);
    setErrors(validate(form));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const allTouched = { name: true, email: true, phone: true, subject: true, message: true };
    setTouched(allTouched);
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setStatus("sending");

    try {
      const { submitContactMessage } = await import("../../api/apiService");
      const fullMessage = `Subject: ${form.subject}\nPhone: ${form.countryCode} ${form.phone}\n\n${form.message}`;
      
      await submitContactMessage({
        name: form.name,
        email: form.email,
        message: fullMessage
      });
      
      setStatus("success");
      setForm({ ...EMPTY_FORM, countryCode: detectedCodeRef.current });
      setTouched(EMPTY_ERRORS);
      setErrors(EMPTY_ERRORS);
      
      // Also send via EmailJS as backup if configured
      if (import.meta.env.VITE_EMAILJS_SERVICE_ID) {
        emailjs.sendForm(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          formRef.current,
          import.meta.env.VITE_EMAILJS_USER_ID
        ).catch(console.error);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setStatus("error");
    }
  }

  return (
    <Fade direction="up" duration={1000}>
      <div className="contact-form-section">
        <h1 className="contact-form-title" style={{ color: theme.text }}>
          Get In Touch
        </h1>
        <p className="contact-form-subtitle" style={{ color: theme.secondaryText }}>
          Have a project in mind or just want to say hi? Fill out the form below!
        </p>
        <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="contact-form-row">
            <div className="contact-form-group">
              <label htmlFor="cf-name" style={{ color: theme.secondaryText }}>
                Name <span className="required-star">*</span>
              </label>
              <input
                id="cf-name"
                type="text"
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                className={errors.name && touched.name ? "input-error" : ""}
                style={{ borderColor: errors.name && touched.name ? "#c62828" : theme.imageDark, color: theme.text }}
              />
              {errors.name && touched.name && (
                <span className="field-error">{errors.name}</span>
              )}
            </div>
            <div className="contact-form-group">
              <label htmlFor="cf-email" style={{ color: theme.secondaryText }}>
                Email <span className="required-star">*</span>
              </label>
              <input
                id="cf-email"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                className={errors.email && touched.email ? "input-error" : ""}
                style={{ borderColor: errors.email && touched.email ? "#c62828" : theme.imageDark, color: theme.text }}
              />
              {errors.email && touched.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>
          </div>
          <div className="contact-form-row">
            <div className="contact-form-group">
              <label htmlFor="cf-phone" style={{ color: theme.secondaryText }}>
                Phone <span className="required-star">*</span>
              </label>
              <div
                className={`phone-input-wrapper${errors.phone && touched.phone ? " input-error" : ""}`}
                style={{ borderColor: errors.phone && touched.phone ? "#c62828" : theme.imageDark }}
              >
                <PhoneCountrySelect
                  value={form.countryCode}
                  onChange={(code) => setForm((prev) => ({ ...prev, countryCode: code }))}
                  theme={theme}
                />
                <span className="phone-divider" />
                <input
                  id="cf-phone"
                  type="tel"
                  name="phone"
                  placeholder="555 000-0000"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="tel-national"
                  className="phone-number-input"
                  style={{ color: theme.text }}
                />
              </div>
              {/* Hidden field sends the full number to EmailJS */}
              <input
                id="cf-full-phone-hidden"
                type="hidden"
                name="full_phone"
                value={form.phone ? `${form.countryCode} ${form.phone}` : ""}
              />
              {errors.phone && touched.phone && (
                <span className="field-error">{errors.phone}</span>
              )}
            </div>
            <div className="contact-form-group">
              <label htmlFor="cf-subject" style={{ color: theme.secondaryText }}>
                Subject <span className="required-star">*</span>
              </label>
              <input
                id="cf-subject"
                type="text"
                name="subject"
                placeholder="What's this about?"
                value={form.subject}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="off"
                className={errors.subject && touched.subject ? "input-error" : ""}
                style={{ borderColor: errors.subject && touched.subject ? "#c62828" : theme.imageDark, color: theme.text }}
              />
              {errors.subject && touched.subject && (
                <span className="field-error">{errors.subject}</span>
              )}
            </div>
          </div>
          <div className="contact-form-group">
            <label htmlFor="cf-message" style={{ color: theme.secondaryText }}>
              Message <span className="required-star">*</span>
            </label>
            <textarea
              id="cf-message"
              name="message"
              rows={5}
              placeholder="Write your message here..."
              value={form.message}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="off"
              className={errors.message && touched.message ? "input-error" : ""}
              style={{ borderColor: errors.message && touched.message ? "#c62828" : theme.imageDark, color: theme.text }}
            />
            {errors.message && touched.message && (
              <span className="field-error">{errors.message}</span>
            )}
          </div>
          <button
            type="submit"
            className="contact-form-btn"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send Message"}
          </button>
          {status === "success" && (
            <p className="contact-form-feedback success">
              Thanks! Your message has been sent.
            </p>
          )}
          {status === "error" && (
            <p className="contact-form-feedback error">
              Something went wrong. Please try again or email me directly.
            </p>
          )}
        </form>
      </div>
    </Fade>
  );
}
