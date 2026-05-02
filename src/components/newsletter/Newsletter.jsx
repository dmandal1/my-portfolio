import React, { useState } from "react";
import "./Newsletter.css";
import { Fade } from "../animations/Reveal";
import { subscribeNewsletter } from "../../api/apiService";

export default function Newsletter({ theme }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      // Artificial delay for better processing UX (1.5 seconds)
      const [response] = await Promise.all([
        subscribeNewsletter(email),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);

      if (response.success) {
        setStatus("success");
        setMessage("Thank you for subscribing! You're all set.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(response.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      // Small delay even for errors
      await new Promise(resolve => setTimeout(resolve, 800));
      setStatus("error");
      if (err.message && err.message.toLowerCase().includes("already subscribed")) {
        setMessage("You're already on the list! We've already got your email saved.");
      } else {
        setMessage("Failed to subscribe. Please try again later.");
      }
    }
  };

  return (
    <div className="newsletter-section">
      <Fade direction="up" duration={1000}>
        <h1 className="newsletter-section-title" style={{ color: theme.text }}>
          Subscribe to my <span style={{ color: theme.imageHighlight }}>Newsletter</span>
        </h1>
        <p className="newsletter-section-subtitle" style={{ color: theme.secondaryText }}>
          Get the latest updates, articles, and insights delivered straight to your inbox.
        </p>
        
        <form className="newsletter-section-form" onSubmit={handleSubmit}>
          <div className="newsletter-input-group">
            <div className="newsletter-input-wrapper">
              <label htmlFor="newsletter-email" className="newsletter-label sr-only">Email Address</label>
              <i className="fas fa-envelope newsletter-field-icon" style={{ color: theme.secondaryText }}></i>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                className="newsletter-field-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  borderColor: status === "error" ? "#ef4444" : theme.imageDark,
                  color: theme.text
                }}
                required
                autoComplete="email"
              />
            </div>
            <button 
              type="submit" 
              className="newsletter-submit-btn" 
              disabled={status === "loading"}
              style={{ background: `linear-gradient(135deg, ${theme.imageHighlight}, ${theme.highlight})`, color: "#ffffff" }}
            >
              {status === "loading" ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                "Subscribe Now"
              )}
            </button>
          </div>
        </form>

        {status === "success" && (
          <p className="newsletter-feedback success">
            <i className="fas fa-check-circle"></i> {message}
          </p>
        )}
        {status === "error" && (
          <p className="newsletter-feedback error">
            <i className="fas fa-exclamation-circle"></i> {message}
          </p>
        )}
      </Fade>
    </div>
  );
}
