import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep logging lightweight; useful in production when a render crash would blank the page.
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 24, textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px" }}>Something went wrong.</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Please refresh the page and try again.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

