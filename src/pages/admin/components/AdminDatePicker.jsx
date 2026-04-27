import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DAYS    = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ADP_HOURS   = [1,2,3,4,5,6,7,8,9,10,11,12];
const ADP_MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM_H  = 44;
const pad     = n => String(n).padStart(2, "0");

export default function AdminDatePicker({ value, onChange, onClose, showTime = false }) {
  const initial = value ? new Date(value) : new Date();

  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selected,  setSelected]  = useState(value ? new Date(value) : null);
  const [hours,     setHours]     = useState(() => { const h = initial.getHours() % 12; return h === 0 ? 12 : h; });
  const [minutes,   setMinutes]   = useState(initial.getMinutes());
  const [ampm,      setAmpm]      = useState(initial.getHours() >= 12 ? "PM" : "AM");

  const hrRef  = useRef(null);
  const minRef = useRef(null);

  // Scroll columns to selected position on open
  useEffect(() => {
    if (!showTime) return;
    const t = setTimeout(() => {
      if (hrRef.current)  hrRef.current.scrollTop  = ADP_HOURS.indexOf(hours)  * ITEM_H;
      if (minRef.current) minRef.current.scrollTop = minutes * ITEM_H;
    }, 40);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPreview = useMemo(() => {
    if (!selected) return "No date selected";
    const result = new Date(selected);
    if (showTime) {
      let h = hours % 12;
      if (ampm === "PM") h += 12;
      result.setHours(h, minutes, 0, 0);
    }
    return result.toLocaleString("en-IN", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
      ...(showTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  }, [selected, hours, minutes, ampm, showTime]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function pickPreset(daysFromToday, label) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    d.setSeconds(0, 0);
    if (label === "Tonight") d.setHours(20, 0, 0, 0);
    const h = d.getHours() % 12;
    const newH = h === 0 ? 12 : h;
    const newM = d.getMinutes();
    setSelected(d); setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
    setHours(newH); setMinutes(newM); setAmpm(d.getHours() >= 12 ? "PM" : "AM");
    setTimeout(() => {
      if (hrRef.current)  hrRef.current.scrollTop  = ADP_HOURS.indexOf(newH) * ITEM_H;
      if (minRef.current) minRef.current.scrollTop = newM * ITEM_H;
    }, 40);
  }

  function pickHour(h) {
    setHours(h);
    setTimeout(() => { if (hrRef.current) hrRef.current.scrollTop = ADP_HOURS.indexOf(h) * ITEM_H; }, 0);
  }

  function pickMinute(m) {
    setMinutes(m);
    setTimeout(() => { if (minRef.current) minRef.current.scrollTop = m * ITEM_H; }, 0);
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

  const cells = useMemo(() => {
    const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevTotal = new Date(viewYear, viewMonth, 0).getDate();
    const result = [];
    for (let i = firstDay - 1; i >= 0; i--) result.push({ day: prevTotal - i, offset: -1 });
    for (let d = 1; d <= totalDays; d++) result.push({ day: d, offset: 0 });
    while (result.length < 42) result.push({ day: result.length - (firstDay + totalDays) + 1, offset: 1 });
    return result;
  }, [viewYear, viewMonth]);

  const selectedKey = selected ? `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}` : "";

  function handleDayPick(day, offset) {
    const picked = new Date(viewYear, viewMonth + offset, day);
    setViewYear(picked.getFullYear());
    setViewMonth(picked.getMonth());
    setSelected(picked);
  }

  return createPortal(
    <div className="adp-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adp-modal">

        {/* Header */}
        <div className="adp-header">
          <div>
            <span className="adp-title">Schedule Publish</span>
            <p className="adp-subtitle">Choose when this post should go live.</p>
          </div>
          <button type="button" className="adp-close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Summary */}
        <div className="adp-summary">
          <span className="adp-summary-icon"><i className="far fa-calendar-check" /></span>
          <div>
            <small>Selected schedule</small>
            <strong>{selectedPreview}</strong>
          </div>
        </div>

        {/* Quick presets */}
        <div className="adp-presets" aria-label="Quick date choices">
          {[["Today",0],["Tomorrow",1],["Weekend",5],["Next week",7],["Tonight",0]].map(([label, days]) => (
            <button key={label} type="button" onClick={() => pickPreset(days, label)}>{label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="adp-body">

          {/* Calendar */}
          <div className="adp-cal">
            <div className="adp-cal-nav">
              <button type="button" className="adp-nav-btn" onClick={prevMonth}><i className="fas fa-chevron-left" /></button>
              <span className="adp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" className="adp-nav-btn" onClick={nextMonth}><i className="fas fa-chevron-right" /></button>
            </div>
            <div className="adp-day-headers">
              {DAYS.map(d => <span key={d} className="adp-day-hdr">{d}</span>)}
            </div>
            <div className="adp-grid">
              {cells.map(({ day, offset }, i) => {
                const key    = new Date(viewYear, viewMonth + offset, day);
                const keyStr = `${key.getFullYear()}-${key.getMonth()}-${key.getDate()}`;
                const inMonth      = offset === 0;
                const isSel        = selectedKey === keyStr;
                const isTodayCell  = inMonth && !isSel && (() => {
                  const t = new Date();
                  return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
                })();
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
                <i className="far fa-clock" /> Publish time
              </div>

              <div className="adp-time-cols">
                {/* Hour */}
                <div className="adp-tcol-wrap">
                  <span className="adp-tcol-lbl">Hour</span>
                  <div className="adp-tcol" ref={hrRef}>
                    <div className="adp-tcol-spacer" />
                    {ADP_HOURS.map(h => (
                      <button key={h} type="button"
                        className={`adp-titem${hours === h ? " adp-titem--sel" : ""}`}
                        onClick={() => pickHour(h)}>
                        {pad(h)}
                      </button>
                    ))}
                    <div className="adp-tcol-spacer" />
                  </div>
                </div>

                <span className="adp-tcol-colon">:</span>

                {/* Minute */}
                <div className="adp-tcol-wrap adp-tcol-wrap--min">
                  <span className="adp-tcol-lbl">Min</span>
                  <div className="adp-tcol" ref={minRef}>
                    <div className="adp-tcol-spacer" />
                    {ADP_MINUTES.map(m => (
                      <button key={m} type="button"
                        className={`adp-titem${minutes === m ? " adp-titem--sel" : ""}`}
                        onClick={() => pickMinute(m)}>
                        {pad(m)}
                      </button>
                    ))}
                    <div className="adp-tcol-spacer" />
                  </div>
                </div>

                {/* AM / PM */}
                <div className="adp-ampm">
                  {["AM","PM"].map(ap => (
                    <button key={ap} type="button"
                      className={`adp-ampm-btn${ampm === ap ? " adp-ampm-btn--sel" : ""}`}
                      onClick={() => setAmpm(ap)}>
                      {ap}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
