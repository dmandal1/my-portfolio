import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { listAllMedia } from "../../../api/apiService";

export default function MediaPickerModal({ open, onClose, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    listAllMedia().then(data => {
      if (mounted) {
        // filter for images only
        const images = data.filter(d => d.contentType?.startsWith("image/"));
        setItems(images);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [open]);

  if (!open) return null;

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return createPortal(
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={onClose}>
      <div style={{
        background: "var(--acard)", borderRadius: 12, width: "100%", maxWidth: 700,
        maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        border: "1px solid var(--abdr)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--abdr)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, margin: 0, color: "var(--atxt)", fontWeight: 600 }}>Select from Media Library</h2>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--atxt2)", cursor: "pointer", fontSize: 16 }}><i className="fas fa-times" /></button>
        </div>
        
        <div style={{ padding: 12, borderBottom: "1px solid var(--abdr)" }}>
          <input 
            type="text" 
            placeholder="Search images..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--abdr)", background: "var(--abg)", color: "var(--atxt)" }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--atxt2)", padding: 40 }}><i className="fas fa-circle-notch fa-spin fa-2x" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--atxt2)", padding: 40 }}>No images found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 16 }}>
              {filtered.map(img => (
                <div 
                  key={img.id} 
                  onClick={() => { onSelect(img.url); onClose(); }}
                  style={{
                    cursor: "pointer", borderRadius: 8, overflow: "hidden", border: "1px solid var(--abdr)", 
                    aspectRatio: "1", position: "relative", background: "var(--abg)"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ap)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--abdr)"}
                >
                  <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 11, padding: "4px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {img.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
