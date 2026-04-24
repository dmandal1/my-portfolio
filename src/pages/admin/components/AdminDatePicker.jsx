import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function AdminDatePicker({ value, onChange, onClose, showTime = false }) {
  const initial = value ? new Date(value) : new Date();

  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selected,  setSelected]  = useState(value ? new Date(value) : null);
  const [hours,     setHours]     = useState(() => { const h = initial.getHours() % 12; return h === 0 ? 12 : h; });
  const [minutes,   setMinutes]   = useState(initial.getMinutes());
  const [ampm,      setAmpm]      = useState(initial.getHours() >= 12 ? "PM" : "AM");

  const timeValue = useMemo(() => {
    if (!showTime) return null;
    return {
      hour: String(hours).padStart(2, "0"),
      minute: String(minutes).padStart(2, "0"),
      period: ampm,
    };
  }, [hours, minutes, ampm, showTime]);

  const selectedPreview = useMemo(() => {
    if (!selected) return "No date selected";
    const result = new Date(selected);
    if (showTime) {
      let h = hours % 12;
      if (ampm === "PM") h += 12;
      result.setHours(h, minutes, 0, 0);
    }
    return result.toLocaleString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(showTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  }, [selected, hours, minutes, ampm, showTime]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function shiftHour(delta) {
    setHours((current) => {
      const next = current + delta;
      if (next > 12) return 1;
      if (next < 1) return 12;
      return next;
    });
  }

  function shiftMinute(delta) {
    setMinutes((current) => {
      const next = current + delta;
      if (next > 59) return 0;
      if (next < 0) return 59;
      return next;
    });
  }

  function setTypedHour(value) {
    setHours(Math.min(12, Math.max(1, value)));
  }

  function setTypedMinute(value) {
    setMinutes(Math.min(59, Math.max(0, value)));
  }

  function pickPreset(daysFromToday, label) {
    const picked = new Date();
    picked.setDate(picked.getDate() + daysFromToday);
    picked.setSeconds(0, 0);
    if (label === "Tonight") {
      picked.setHours(20, 0, 0, 0);
    }
    setSelected(picked);
    setViewYear(picked.getFullYear());
    setViewMonth(picked.getMonth());
    const h = picked.getHours() % 12;
    setHours(h === 0 ? 12 : h);
    setMinutes(picked.getMinutes());
    setAmpm(picked.getHours() >= 12 ? "PM" : "AM");
  }

  function isSelected(day) {
    if (!selected) return false;
    return selected.getFullYear() === viewYear &&
           selected.getMonth()    === viewMonth &&
           selected.getDate()     === day;
  }
  function isToday(day) {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
  }

  function handleApply() {
    if (!selected) return;
    const result = new Date(selected);
    if (showTime) {
      let h = hours % 12;
      if (ampm === "PM") h += 12;
      result.setHours(h, minutes, 0, 0);
    } else {
      result.setHours(0, 0, 0, 0);
    }
    onChange(result);
    onClose();
  }

  /* Build fixed 6x7 calendar grid including prev/next month spillover */
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevTotal = new Date(viewYear, viewMonth, 0).getDate();
    const result = [];

    for (let i = firstDay - 1; i >= 0; i -= 1) {
      result.push({ day: prevTotal - i, offset: -1 });
    }
    for (let d = 1; d <= totalDays; d += 1) {
      result.push({ day: d, offset: 0 });
    }
    while (result.length < 42) {
      result.push({ day: result.length - (firstDay + totalDays) + 1, offset: 1 });
    }
    return result;
  }, [viewYear, viewMonth]);

  const selectedKey = selected
    ? `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`
    : "";

  function handleDayPick(day, offset) {
    const picked = new Date(viewYear, viewMonth + offset, day);
    setViewYear(picked.getFullYear());
    setViewMonth(picked.getMonth());
    setSelected(picked);
  }

  return createPortal(
    <div className="adp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adp-modal">

        {/* ── Header ── */}
        <div className="adp-header">
          <div>
            <span className="adp-title">Schedule Publish</span>
            <p className="adp-subtitle">Choose when this post should go live.</p>
          </div>
          <button type="button" className="adp-close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="adp-summary">
          <span className="adp-summary-icon"><i className="far fa-calendar-check" /></span>
          <div>
            <small>Selected schedule</small>
            <strong>{selectedPreview}</strong>
          </div>
        </div>

        <div className="adp-presets" aria-label="Quick date choices">
          {[
            ["Today", 0],
            ["Tomorrow", 1],
            ["Weekend", 5],
            ["Next week", 7],
            ["Tonight", 0],
          ].map(([label, days]) => (
            <button key={label} type="button" onClick={() => pickPreset(days, label)}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="adp-body">

          {/* Calendar */}
          <div className="adp-cal">
            <button type="button" className="adp-month-select">
              {MONTHS[viewMonth]} {viewYear}
              <i className="fas fa-chevron-down" aria-hidden="true" />
            </button>

            <div className="adp-cal-nav">
              <button type="button" className="adp-nav-btn" onClick={prevMonth}>
                <i className="fas fa-chevron-left" />
              </button>
              <span className="adp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" className="adp-nav-btn" onClick={nextMonth}>
                <i className="fas fa-chevron-right" />
              </button>
            </div>

            <div className="adp-day-headers">
              {DAYS.map((d) => <span key={d} className="adp-day-hdr">{d}</span>)}
            </div>

            <div className="adp-grid">
              {cells.map(({ day, offset }, i) => {
                const key = new Date(viewYear, viewMonth + offset, day);
                const keyStr = `${key.getFullYear()}-${key.getMonth()}-${key.getDate()}`;
                const inMonth = offset === 0;
                const isSel = selectedKey === keyStr;
                const isTodayCell = inMonth && isToday(day) && !isSel;
                return (
                  <button
                    key={`${keyStr}-${i}`}
                    type="button"
                    className={`adp-day${isSel ? " adp-day--sel" : ""}${isTodayCell ? " adp-day--today" : ""}${inMonth ? "" : " adp-day--muted"}`}
                    onClick={() => handleDayPick(day, offset)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker */}
          {showTime && (
            <div className="adp-time-wrap">
              <div className="adp-time-title">
                <i className="far fa-clock" />
                Publish time
              </div>
              <div className="adp-time-panel">
                <TimeStepper
                  label="Hour"
                  value={timeValue.hour}
                  onUp={() => shiftHour(1)}
                  onDown={() => shiftHour(-1)}
                  min={1}
                  max={12}
                  onType={setTypedHour}
                />
                <span className="adp-time-colon">:</span>
                <TimeStepper
                  label="Minute"
                  value={timeValue.minute}
                  onUp={() => shiftMinute(1)}
                  onDown={() => shiftMinute(-1)}
                  min={0}
                  max={59}
                  onType={setTypedMinute}
                />
              </div>
              <div className="adp-period-tabs" role="group" aria-label="AM or PM">
                {["AM", "PM"].map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={`adp-period-btn${ampm === period ? " is-active" : ""}`}
                    onClick={() => setAmpm(period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="adp-footer">
          <div className="adp-footer-preview">
            <span>Ready for</span>
            <strong>{selectedPreview}</strong>
          </div>
          <button type="button" className="abtn abtn-ghost adp-cancel-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="abtn abtn-primary adp-apply-btn" onClick={handleApply} disabled={!selected}>Apply</button>
        </div>

      </div>
    </div>,
    document.body
  );
}

function TimeStepper({ label, value, onUp, onDown, onType, min, max }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  function commit(raw = draft) {
    const numeric = Number(raw);
    if (!raw || Number.isNaN(numeric)) {
      setDraft(value);
      return;
    }
    const clamped = Math.min(max, Math.max(min, numeric));
    onType(clamped);
    setDraft(String(clamped).padStart(2, "0"));
  }

  function handleChange(e) {
    const next = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDraft(next);
    if (!next) return;
    const numeric = Number(next);
    if (!Number.isNaN(numeric) && numeric >= min && numeric <= max) {
      onType(numeric);
    }
  }

  return (
    <div className="adp-stepper" aria-label={label}>
      <button type="button" className="adp-stepper-btn" onClick={onUp} aria-label={`Increase ${label}`}>
        <i className="fas fa-chevron-up" />
      </button>
      <input
        className="adp-stepper-input"
        value={editing ? draft : value}
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        onFocus={(e) => {
          setEditing(true);
          setDraft(value);
          e.target.select();
        }}
        onChange={handleChange}
        onBlur={() => {
          commit();
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(value);
            e.currentTarget.blur();
          }
        }}
      />
      <button type="button" className="adp-stepper-btn" onClick={onDown} aria-label={`Decrease ${label}`}>
        <i className="fas fa-chevron-down" />
      </button>
      <span>{label}</span>
    </div>
  );
}
