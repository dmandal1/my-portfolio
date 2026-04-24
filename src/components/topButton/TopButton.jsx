import React, { useEffect, useRef } from "react";
import "./TopButton.css";

export default function TopButton({ theme }) {
  const btnRef = useRef(null);

  function GoUpEvent() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  useEffect(() => {
    const onScroll = () => {
      const el = btnRef.current;
      if (!el) return;
      const visible = document.body.scrollTop > 30 || document.documentElement.scrollTop > 30;
      el.style.visibility = visible ? "visible" : "hidden";
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initialize
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onMouseEnter = (event, color, bgColor) => {
    const el = event.currentTarget;
    el.style.color = color;
    el.style.backgroundColor = bgColor;
  };

  const onMouseLeave = (event, color, bgColor) => {
    const el = event.currentTarget;
    el.style.color = color;
    el.style.backgroundColor = bgColor;
  };

  return (
    <div
      ref={btnRef}
      onClick={GoUpEvent}
      id="topButton"
      style={{
        color: theme.body,
        backgroundColor: theme.text,
        border: `solid 1px ${theme.text}`,
      }}
      title="Go up"
      onMouseEnter={(e) => onMouseEnter(e, theme.text, theme.body)}
      onMouseLeave={(e) => onMouseLeave(e, theme.body, theme.text)}
    >
      <i className="fas fa-arrow-up" aria-hidden="true" />
    </div>
  );
}
