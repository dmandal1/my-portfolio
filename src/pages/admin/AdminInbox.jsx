import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import {
  getContactMessages,
  getSentMessages,
  getTrashMessages,
  deleteContactMessage,
  markContactMessageRead,
  bulkDeleteMessages,
  bulkMarkRead,
  restoreMessage,
  saveDraft,
  getDrafts,
  deleteDraft,
  toggleStar,
  sendNewEmail,
} from "../../api/apiService";
import { apiFetch, apiUpload } from "../../api/config";
import "./Admin.css";

export default function AdminInbox() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState("inbox"); // inbox | sent | trash
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selection, setSelection] = useState(new Set());
  const [viewMode, setViewMode] = useState("list"); // list | detail (for mobile)
  
  // Compose Modal State
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const [isComposeFullscreen, setIsComposeFullscreen] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showMoreFormatting, setShowMoreFormatting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const composeEditorRef = useRef(null);
  const composeFileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const imageEditorTargetRef = useRef('reply');
  const imageRangeRef = useRef(null);

  // Image selection / toolbar / resize
  const [imgSelection, setImgSelection] = useState(null); // { img } — rect is NOT stored, computed fresh
  const [imgRect, setImgRect] = useState(null);
  const [imgAltEdit, setImgAltEdit] = useState(false);
  const [imgAltInput, setImgAltInput] = useState('');
  const [imgActiveSize, setImgActiveSize] = useState(null); // 'small' | 'fit' | 'original'
  const [composeDraftId, setComposeDraftId] = useState(null);
  const [filterChip, setFilterChip] = useState("all"); // all | unread | starred
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const draftTimerRef = useRef(null);
  
  // Reply State
  const [replySubject, setReplySubject] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const editorRef = useRef(null);

  // Toolbar active state
  const [toolbarState, setToolbarState] = useState({
    bold: false, italic: false, underline: false, strikeThrough: false,
    justifyLeft: false, justifyCenter: false, justifyRight: false,
    insertUnorderedList: false, insertOrderedList: false,
  });
  const [textColor, setTextColor] = useState('#1e293b');
  const [fontSize, setFontSize] = useState('3');
  
  // Link Popover State
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [savedRange, setSavedRange] = useState(null);
  const linkPopoverRef = useRef(null);
  const linkUrlInputRef = useRef(null);
  
  // Attachment State
  const [replyAttachments, setReplyAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // Stats
  const stats = useMemo(() => {
    return {
      unread: messages.filter(m => !m.is_read).length,
      starred: messages.filter(m => m.is_starred).length,
      drafts: messages.filter(m => folder === "drafts").length, // This only works if we're in the drafts folder
      total: messages.length
    };
  }, [messages, folder]);

  // We actually need a separate count for drafts that's always available
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    const fetchDraftCount = async () => {
      try {
        const drafts = await getDrafts();
        setDraftCount(drafts.length);
      } catch (e) {}
    };
    fetchDraftCount();
  }, [messages]); // Refresh when messages change

  // Update Tab Title
  useEffect(() => {
    document.title = stats.unread > 0 ? `(${stats.unread}) Inbox | Admin` : "Inbox | Admin";
    return () => { document.title = "Deepak Mandal | Admin"; };
  }, [stats.unread]);

  // Modals
  const [deleteModal, setDeleteModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      let data = [];
      if (folder === "sent") data = await getSentMessages();
      else if (folder === "trash") data = await getTrashMessages();
      else if (folder === "drafts") {
        data = await getDrafts();
      }
      else data = await getContactMessages();
      
      setMessages(data || []);
      setSelection(new Set());
    } catch (err) {
      toast?.addToast(`Failed to load ${folder}`, "error");
    } finally {
      setLoading(false);
    }
  }, [toast, folder]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const applyFormat = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) editorRef.current.focus();
    if (composeEditorRef.current) composeEditorRef.current.focus();
  };

  const handleInsertLink = () => {
    openLinkPopover();
  };

  // ── Image click → show toolbar + handles ───────────────────
  const handleEditorImgClick = (e) => {
    if (e.target.tagName === 'IMG') {
      e.stopPropagation();
      setImgSelection({ img: e.target });
      setImgAltEdit(false);
      setImgActiveSize(null);
      return;
    }
    if (e.target.closest('.aimg-toolbar') || e.target.closest('.aimg-selection-overlay')) return;
    setImgSelection(null);
    setImgAltEdit(false);
    setImgActiveSize(null);
  };

  useEffect(() => {
    const close = (e) => {
      if (e.target.closest('.aimg-toolbar') || e.target.closest('.aimg-selection-overlay') || e.target.tagName === 'IMG') return;
      setImgSelection(null);
      setImgAltEdit(false);
      setImgActiveSize(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  // Compute rect after every render where imgSelection changes (useLayoutEffect = after DOM commit)
  useLayoutEffect(() => {
    if (!imgSelection?.img) { setImgRect(null); return; }
    setImgRect(imgSelection.img.getBoundingClientRect());
  }, [imgSelection]);

  // Keep overlay in sync when the container scrolls or window resizes
  useEffect(() => {
    if (!imgSelection?.img) return;
    const sync = () => setImgRect(imgSelection.img.getBoundingClientRect());
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [imgSelection?.img]);

  const applyImgSize = (type) => {
    if (!imgSelection?.img) return;
    const img = imgSelection.img;
    if (type === 'small') {
      img.style.width = '180px'; img.style.height = 'auto';
    } else if (type === 'fit') {
      img.style.width = '100%'; img.style.height = 'auto';
    } else if (type === 'original') {
      img.style.width = `${img.naturalWidth}px`; img.style.height = 'auto';
    }
    setImgActiveSize(type);
    // Shallow-copy to trigger re-render → useLayoutEffect re-computes rect after DOM commit
    setImgSelection(prev => prev ? { ...prev } : null);
  };

  const removeSelectedImg = () => {
    imgSelection?.img?.remove();
    setImgSelection(null);
  };

  const startImgResize = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgSelection.img;
    const startX = e.clientX;
    const startW = img.getBoundingClientRect().width;
    const aspectRatio = startW / img.getBoundingClientRect().height;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const newW = Math.max(40, corner.includes('e') ? startW + dx : startW - dx);
      img.style.width = `${newW}px`;
      img.style.height = `${newW / aspectRatio}px`;
      setImgSelection(prev => prev ? { ...prev } : null);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setImgSelection(prev => prev ? { ...prev } : null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ────────────────────────────────────────────────────────────
  const handleInsertImage = (target = 'reply') => {
    imageEditorTargetRef.current = target;
    const sel = window.getSelection();
    imageRangeRef.current = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const targetEditor = imageEditorTargetRef.current === 'compose' ? composeEditorRef.current : editorRef.current;
      if (!targetEditor) return;

      const img = document.createElement('img');
      img.src = ev.target.result;
      img.style.cssText = 'max-width:100%;height:auto;display:block;margin:4px 0;border-radius:4px;';

      const range = imageRangeRef.current;
      if (range && targetEditor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        targetEditor.appendChild(img);
      }

      targetEditor.focus();
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setReplyAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0));
    }
  };

  const openLinkPopover = () => {
    saveSelection();
    const sel = window.getSelection();
    setLinkText(sel.toString());
    setLinkUrl("");
    setLinkPopoverOpen(true);
    setTimeout(() => linkUrlInputRef.current?.focus(), 100);
  };

  const insertLinkFromDraft = () => {
    if (!linkUrl) {
      setLinkPopoverOpen(false);
      return;
    }
    
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedRange) {
      sel.addRange(savedRange);
    } else {
      editorRef.current?.focus();
    }

    const linkNode = document.createElement("a");
    const finalUrl = linkUrl.includes("://") ? linkUrl : `https://${linkUrl}`;
    linkNode.href = finalUrl;
    linkNode.textContent = linkText || linkUrl;
    linkNode.target = "_blank";
    linkNode.rel = "noopener noreferrer";

    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(linkNode);
    
    setLinkPopoverOpen(false);
    setLinkText("");
    setLinkUrl("");
    editorRef.current?.focus();
  };

  const generateAIDraft = async () => {
    if (!selectedMessage) return;
    setIsSending(true);
    toast?.addToast("Magic Pen is drafting...", "info");
    
    // Simulate AI processing delay
    await new Promise(r => setTimeout(r, 1500));
    
    const msg = selectedMessage.message.toLowerCase();
    const draft = (msg.includes("hello") || msg.includes("hi") || msg.includes("hey"))
      ? `<p>Dear <strong>${selectedMessage.name}</strong>,</p><p>Thank you for reaching out! It's a pleasure to connect with you.</p><p>I have received your message and I'll get back to you with more details shortly.</p><p>Best regards,<br>Deepak</p>`
      : `<p>Hello <strong>${selectedMessage.name}</strong>,</p><p>Thank you for your message regarding your inquiry. I have noted your details and will review them thoroughly.</p><p>I'll provide a detailed response within the next 24 hours.</p><p>Warm regards,<br>Deepak</p>`;
    
    if (editorRef.current) {
      editorRef.current.innerHTML = draft;
    }
    setReplySubject(`Re: Your inquiry - ${selectedMessage.name}`);
    setIsSending(false);
  };

  const handleSendNew = async () => {
    const content = composeEditorRef.current?.innerHTML || "";
    if (!composeTo || (!content.replace(/<[^>]*>/g, "").trim() && composeAttachments.length === 0)) {
      toast?.addToast("Recipient and message content required", "warning");
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("recipient", composeTo);
      formData.append("cc", composeCc);
      formData.append("bcc", composeBcc);
      formData.append("subject", composeSubject || "No Subject");
      formData.append("message", content);
      composeAttachments.forEach(file => formData.append("attachments[]", file));

      await sendNewEmail(formData);
      
      toast?.addToast("Email sent successfully", "success");
      setShowCompose(false);
      setComposeTo("");
      setComposeCc("");
      setComposeBcc("");
      setShowCc(false);
      setShowBcc(false);
      setComposeSubject("");
      setComposeAttachments([]);
    } catch (err) {
      toast?.addToast(`Failed to send: ${err.message}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStar = async (e, id) => {
    e.stopPropagation();
    try {
      await toggleStar(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_starred: !m.is_starred } : m));
    } catch (err) {
      toast?.addToast("Failed to star message", "error");
    }
  };

  const handleQuickAction = async (e, action, msg) => {
    e.stopPropagation();
    if (action === "delete") {
      setDeleteModal({ mode: "single", id: msg.id, name: msg.name || msg.recipient, message: msg.message });
    } else if (action === "read") {
      try {
        await markContactMessageRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 1 } : m));
      } catch (e) {}
    } else if (action === "unread") {
      try {
        await apiFetch(`/messages.php?id=${msg.id}&unread=1`, { method: 'PUT' });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 0 } : m));
      } catch (e) {}
    }
  };

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, msg });
  };
  useEffect(() => {
    const hideMenu = () => setContextMenu(null);
    window.addEventListener("click", hideMenu);
    return () => window.removeEventListener("click", hideMenu);
  }, []);

  const toggleSelectAll = () => {
    if (selection.size === filteredMessages.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(filteredMessages.map(m => m.id)));
    }
  };

  const handleBulkMarkRead = async () => {
    if (selection.size === 0) return;
    try {
      await bulkMarkRead([...selection]);
      setMessages(prev => prev.map(m => selection.has(m.id) ? { ...m, is_read: 1 } : m));
      setSelection(new Set());
      toast?.addToast("Messages marked as read", "success");
    } catch (err) {
      toast?.addToast("Bulk action failed", "error");
    }
  };

  const getAvatarColor = (name) => {
    const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
    const charCode = name?.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  const handleInsertEmoji = (emoji) => {
    if (!composeEditorRef.current) return;
    composeEditorRef.current.focus();
    document.execCommand("insertText", false, emoji);
    setShowEmojiPicker(false);
  };

  const EMOJI_LIST = [
    "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾","👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦵","🦿","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁","👅","👄"
  ];

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const parts = String(text).split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} style={{ background: "var(--ap-soft)", color: "var(--ap)", fontWeight: 700, borderRadius: "2px", padding: "0 2px" }}>{part}</mark> 
        : part
    );
  };

  const persistDraft = async () => {
    if (!selectedMessage || !editorRef.current) return;
    try {
      await saveDraft({
        messageId: selectedMessage.id || selectedMessage.message_id,
        subject: replySubject,
        message: editorRef.current.innerHTML
      });
      setIsDraftSaved(true);
    } catch (e) {
      console.error("Draft save failed", e);
    }
  };

  const updateToolbarState = () => {
    try {
      setToolbarState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch (_) {}
  };

  const applyFontSize = (size) => {
    setFontSize(size);
    editorRef.current?.focus();
    document.execCommand('fontSize', false, size);
  };

  const applyTextColor = (color) => {
    setTextColor(color);
    editorRef.current?.focus();
    document.execCommand('foreColor', false, color);
  };

  const saveNewComposeDraft = async () => {
    const content = composeEditorRef.current?.innerHTML || "";
    const textContent = composeEditorRef.current?.innerText?.trim() || "";
    
    // Comprehensive content check
    const hasContent = composeTo.trim() || 
                      composeCc.trim() || 
                      composeBcc.trim() || 
                      composeSubject.trim() || 
                      textContent || 
                      (composeAttachments && composeAttachments.length > 0);
                      
    if (!hasContent) return;

    try {
      const draftId = composeDraftId || `new_${Date.now()}`;
      await saveDraft({
        messageId: draftId,
        recipient: composeTo,
        subject: composeSubject,
        message: content
      });
      setComposeDraftId(draftId);
      setIsDraftSaved(true);
    } catch (e) {
      console.error("New draft save failed", e);
    }
  };

  const handleCloseCompose = async () => {
    await saveNewComposeDraft();
    setShowCompose(false);
    setComposeTo("");
    setComposeCc("");
    setComposeBcc("");
    setComposeSubject("");
    setComposeAttachments([]);
    setComposeDraftId(null);
  };

  const onEditorInput = () => {
    setIsDraftSaved(false);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(persistDraft, 1500);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.target.tagName === "INPUT" || e.target.getAttribute("contenteditable") === "true") return;
      
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setShowCompose(true);
      }
      if (e.key === "Escape") {
        setShowCompose(false);
        setIsComposeMinimized(false);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, []);

  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    setViewMode("detail");
    
    if (folder === "drafts") {
      setShowReplyBox(true);
      // Use setTimeout to ensure the editorRef is available if we just switched to detail mode
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = msg.message;
      }, 50);
      setReplySubject(msg.subject);
    } else {
      setShowReplyBox(false);
      setReplySubject(`Re: Your inquiry - ${msg.name}`);
    }

    if (folder === "inbox" && !msg.is_read) {
      try {
        await markContactMessageRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 1 } : m));
      } catch (e) {
        console.error("Failed to mark as read", e);
      }
    }
  };

  const handleReply = async () => {
    const content = editorRef.current?.innerHTML || "";
    if (!content.replace(/<[^>]*>/g, "").trim() && replyAttachments.length === 0) {
      toast?.addToast("Please enter a message or attach a file", "warning");
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("messageId", selectedMessage.id);
      formData.append("recipient", selectedMessage.email);
      formData.append("subject", replySubject || `Re: Your Contact Request`);
      formData.append("message", content);
      
      replyAttachments.forEach(file => {
        formData.append("attachments[]", file);
      });

      await apiUpload("/messages.php?action=reply", formData);
      
      toast?.addToast("Reply sent successfully", "success");
      setShowReplyBox(false);
      setReplyAttachments([]);
    } catch (err) {
      toast?.addToast(`Failed to send: ${err.message}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreMessage(id);
      toast?.addToast("Message restored", "success");
      setSelectedMessage(null);
      setViewMode("list");
      await loadMessages();
    } catch (err) {
      toast?.addToast("Failed to restore", "error");
    }
  };

  const handleForward = () => {
    const forwardHeader = `<br><br>---------- Forwarded message ---------<br>From: <strong>${selectedMessage.name}</strong> &lt;${selectedMessage.email}&gt;<br>Date: ${new Date(selectedMessage.created_at).toLocaleString()}<br>Subject: ${selectedMessage.subject || "Contact Message"}<br><br>`;
    const content = forwardHeader + selectedMessage.message;
    
    setShowReplyBox(true);
    setReplySubject(`Fwd: ${selectedMessage.subject || "Contact Message"}`);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = content;
    }, 100);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    const permanent = folder === "trash";
    try {
      if (deleteModal.mode === "bulk") {
        await bulkDeleteMessages([...selection], permanent);
        toast?.addToast(`${selection.size} messages deleted`, "success");
      } else {
        await deleteContactMessage(deleteModal.id, permanent);
        toast?.addToast(`Message deleted`, "success");
      }
      
      if (selectedMessage && (deleteModal.id === selectedMessage.id || selection.has(selectedMessage.id))) {
        setSelectedMessage(null);
        setViewMode("list");
      }
      await loadMessages();
    } catch (err) {
      toast?.addToast("Failed to delete", "error");
    } finally {
      setIsDeleting(false);
      setDeleteModal(null);
    }
  };

  const filteredMessages = useMemo(() => {
    let list = messages;
    if (filterChip === "unread") list = list.filter(m => !m.is_read);
    else if (filterChip === "starred") list = list.filter(m => m.is_starred);

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(m => 
      (m.name || "").toLowerCase().includes(q) || 
      (m.email || m.recipient || "").toLowerCase().includes(q) || 
      (m.message || "").toLowerCase().includes(q)
    );
  }, [messages, searchQuery, filterChip]);

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="amain-inner">
          <div className="apage-topbar">
            <div>
              <div className="apage-crumb">
                <Link to="/admin/home" className="apage-crumb-link">Admin</Link>
                <span className="apage-crumb-sep">/</span>
                <span className="apage-crumb-cur">Inbox</span>
              </div>
              <h1 className="apage-title">Professional Inbox</h1>
            </div>
            <div className="atopbar-right-group">
              <button className={`arefresh-btn ${loading ? "is-refreshing" : ""}`} onClick={loadMessages}>
                <i className="fas fa-sync-alt" />
              </button>
            </div>
          </div>
          
          <div className={`ainbox-container is-view-${viewMode}`}>
            {/* Folder Nav */}
            <div className="ainbox-nav">
              <button className="abtn abtn-primary abtn-lg ainbox-compose-btn" onClick={() => setShowCompose(true)}>
                <i className="fas fa-pencil-alt" style={{ marginRight: 8 }} />
                <span>Compose</span>
              </button>
              <div style={{ height: 12 }} />
              <button className={`ainbox-nav-item ${folder === "inbox" ? "is-active" : ""}`} onClick={() => { setFolder("inbox"); setViewMode("list"); }}>
                <i className="fas fa-inbox" />
                <span>Inbox</span>
                {unreadCount > 0 && <span className="ainbox-nav-count">{unreadCount}</span>}
              </button>
              <button className={`ainbox-nav-item ${folder === "sent" ? "is-active" : ""}`} onClick={() => { setFolder("sent"); setViewMode("list"); }}>
                <i className="fas fa-paper-plane" />
                <span>Sent</span>
              </button>
              <button className={`ainbox-nav-item ${folder === "drafts" ? "is-active" : ""}`} onClick={() => { setFolder("drafts"); setViewMode("list"); }}>
                <i className="fas fa-file-alt" />
                <span>Drafts</span>
                {draftCount > 0 && <span className="ainbox-nav-count">{draftCount}</span>}
              </button>
              <button className={`ainbox-nav-item ${folder === "trash" ? "is-active" : ""}`} onClick={() => { setFolder("trash"); setViewMode("list"); }}>
                <i className="fas fa-trash-alt" />
                <span>Trash</span>
              </button>
            </div>

             {/* List */}
            <div className={`ainbox-sidebar ${viewMode === 'detail' ? 'is-hidden-mobile' : ''}`}>
              <div className="ainbox-sidebar-header">
                <div className="ainbox-search-wrap">
                  <i className="fas fa-search ainbox-search-icon" />
                  <input type="text" className="ainbox-search-input" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                
                <div className="ainbox-filter-chips">
                  <button className={`afilter-chip ${filterChip === "all" ? "is-active" : ""}`} onClick={() => setFilterChip("all")}>All</button>
                  <button className={`afilter-chip ${filterChip === "unread" ? "is-active" : ""}`} onClick={() => setFilterChip("unread")}>Unread {stats.unread > 0 && <span>({stats.unread})</span>}</button>
                  <button className={`afilter-chip ${filterChip === "starred" ? "is-active" : ""}`} onClick={() => setFilterChip("starred")}>Starred</button>
                </div>

                <div className="ainbox-bulk-toolbar">
                  <div className="abulk-check-wrap" onClick={toggleSelectAll}>
                    <div className={`abulk-checkbox ${selection.size === filteredMessages.length && filteredMessages.length > 0 ? 'is-checked' : selection.size > 0 ? 'is-partial' : ''}`}>
                      {selection.size === filteredMessages.length && filteredMessages.length > 0 ? <i className="fas fa-check" /> : selection.size > 0 ? <i className="fas fa-minus" /> : null}
                    </div>
                  </div>
                  {selection.size > 0 ? (
                    <div className="abulk-actions">
                      <button className="abulk-btn" onClick={handleBulkMarkRead} title="Mark as Read"><i className="fas fa-envelope-open" /></button>
                      <button className="abulk-btn is-danger" onClick={() => setDeleteModal({ mode: "bulk" })} title="Delete Selected"><i className="fas fa-trash-alt" /></button>
                      <span className="abulk-count">{selection.size} selected</span>
                    </div>
                  ) : (
                    <span className="abulk-label">Select messages to act</span>
                  )}
                </div>
              </div>

              <div className="ainbox-list">
                {loading && messages.length === 0 ? (
                  <div className="ainbox-empty"><i className="fas fa-spinner fa-spin" /><p>Loading messages...</p></div>
                ) : filteredMessages.length === 0 ? (
                  <div className="ainbox-empty"><i className="fas fa-inbox" /><p>No messages found</p></div>
                ) : (
                  filteredMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`ainbox-item ${selectedMessage?.id === msg.id ? "is-active" : ""} ${folder === "inbox" && !msg.is_read ? "is-unread" : ""}`} 
                      onClick={() => handleSelectMessage(msg)}
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                    >
                      <div className="ainbox-item-selector" onClick={(e) => {
                        e.stopPropagation();
                        const next = new Set(selection);
                        if (next.has(msg.id)) next.delete(msg.id);
                        else next.add(msg.id);
                        setSelection(next);
                      }}>
                        <div className={`ainbox-item-checkbox ${selection.has(msg.id) ? 'is-checked' : ''}`}>
                          {selection.has(msg.id) && <i className="fas fa-check" />}
                        </div>
                      </div>

                      <div className="ainbox-item-star" onClick={(e) => handleToggleStar(e, msg.id)}>
                        <i className={`${msg.is_starred ? 'fas fa-star is-starred' : 'far fa-star'}`} />
                      </div>

                      <div className="ainbox-item-avatar" style={{ background: getAvatarColor(msg.name || "U") }}>
                        {(msg.name || "U")[0].toUpperCase()}
                      </div>

                      <div className="ainbox-item-main">
                        <div className="ainbox-item-top">
                          <span className="ainbox-item-name">{highlightText(msg.name || msg.recipient || "User", searchQuery)}</span>
                          <span className="ainbox-item-date">{new Date(msg.updated_at || msg.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                          
                          {/* Hover Actions */}
                          <div className="ainbox-item-actions">
                            {folder === "inbox" && (
                              msg.is_read ? (
                                <button onClick={(e) => handleQuickAction(e, "unread", msg)} title="Mark as Unread"><i className="fas fa-envelope" /></button>
                              ) : (
                                <button onClick={(e) => handleQuickAction(e, "read", msg)} title="Mark as Read"><i className="fas fa-envelope-open" /></button>
                              )
                            )}
                            <button onClick={(e) => handleQuickAction(e, "delete", msg)} title="Delete"><i className="fas fa-trash-alt" /></button>
                          </div>
                        </div>
                        <div className="ainbox-item-preview">{highlightText(msg.message?.replace(/<[^>]*>/g, ""), searchQuery)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* View */}
            <div className={`ainbox-view ${viewMode === 'list' ? 'is-hidden-mobile' : ''}`}>
              {selectedMessage ? (
                <>
                  <div className="ainbox-view-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <button className="abtn abtn-ghost is-mobile-only" onClick={() => setViewMode("list")}><i className="fas fa-arrow-left" /></button>
                      <div className="ainbox-view-meta">
                        <h2>{selectedMessage.name || selectedMessage.recipient}</h2>
                        <div className="ainbox-view-email">
                          <a href={`mailto:${selectedMessage.email || selectedMessage.recipient}`}>{selectedMessage.email || selectedMessage.recipient}</a>
                          <span style={{ opacity: 0.5 }}>•</span>
                          <span>{new Date(selectedMessage.updated_at || selectedMessage.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ainbox-view-actions">
                      {folder === 'trash' && (
                        <button className="abtn abtn-ghost abtn-sm" onClick={() => handleRestore(selectedMessage.id)} title="Restore to Inbox" style={{ color: '#10b981' }}>
                          <i className="fas fa-undo" /> Restore
                        </button>
                      )}
                      <button className="abtn abtn-ghost abtn-sm" onClick={handleForward} title="Forward"><i className="fas fa-share" /></button>
                      <button className="abtn abtn-ghost abtn-sm" onClick={() => setDeleteModal({ id: selectedMessage.id, name: selectedMessage.name, message: selectedMessage.message, mode: "single" })} style={{ color: "var(--err)" }} title="Delete"><i className="fas fa-trash-alt" /></button>
                    </div>
                  </div>

                  <div className="ainbox-view-body">
                    <div className="ainbox-view-text" dangerouslySetInnerHTML={{ __html: folder === "drafts" ? selectedMessage.original_message : selectedMessage.message }} />
                  </div>

                  {(folder === "inbox" || folder === "drafts") && (
                    <div className="ainbox-reply-section">
                      {showReplyBox ? (
                        <div className="ainbox-reply-box">
                          <div className="ainbox-reply-header">
                            <div className="ainbox-reply-to">
                              <span className="reply-label">To:</span>
                              <span className="reply-email">{selectedMessage.email}</span>
                            </div>
                            <button className="abtn abtn-sm abtn-ghost MagicPen-btn" onClick={generateAIDraft} title="Regenerate Draft"><i className="fas fa-magic" /></button>
                          </div>
                          <div className="ainbox-reply-subject-wrap">
                            <input type="text" className="ainbox-reply-subject" placeholder="Subject" value={replySubject} onChange={(e) => setReplySubject(e.target.value)} />
                          </div>
                          
                          {/* Premium Two-Row Formatting Toolbar */}
                          <div className="arply-toolbar">
                            {/* Row 1 */}
                            <div className="arply-toolbar-row">
                              {/* Font size dropdown */}
                              <div className="arply-font-size-wrap">
                                <select
                                  className="arply-font-select"
                                  value={fontSize}
                                  onChange={(e) => applyFontSize(e.target.value)}
                                >
                                  <option value="1">Small</option>
                                  <option value="3">Normal</option>
                                  <option value="5">Large</option>
                                  <option value="7">Huge</option>
                                </select>
                                <i className="fas fa-caret-down arply-font-caret" />
                              </div>

                              <span className="arply-sep" />

                              <button type="button" className={`arply-btn ${toolbarState.bold ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); updateToolbarState(); }} title="Bold (Ctrl+B)"><b>B</b></button>
                              <button type="button" className={`arply-btn ${toolbarState.italic ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); updateToolbarState(); }} title="Italic (Ctrl+I)"><span className="arply-char-italic">I</span></button>
                              <button type="button" className={`arply-btn ${toolbarState.underline ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); updateToolbarState(); }} title="Underline (Ctrl+U)"><u>U</u></button>
                              <button type="button" className={`arply-btn ${toolbarState.strikeThrough ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('strikeThrough'); updateToolbarState(); }} title="Strikethrough"><s>S</s></button>

                              {/* Text Color Picker */}
                              <div className="arply-color-wrap" title="Text Color">
                                <span className="arply-color-icon">
                                  <span className="arply-color-letter">A</span>
                                  <span className="arply-color-bar" style={{ background: textColor }} />
                                </span>
                                <input
                                  type="color"
                                  className="arply-color-input"
                                  value={textColor}
                                  onChange={(e) => applyTextColor(e.target.value)}
                                />
                              </div>

                              <span className="arply-sep" />

                              <button type="button" className={`arply-btn ${toolbarState.justifyLeft ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyLeft'); updateToolbarState(); }} title="Align Left"><i className="fas fa-align-left" /></button>
                              <button type="button" className={`arply-btn ${toolbarState.justifyCenter ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyCenter'); updateToolbarState(); }} title="Align Center"><i className="fas fa-align-center" /></button>
                              <button type="button" className={`arply-btn ${toolbarState.justifyRight ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyRight'); updateToolbarState(); }} title="Align Right"><i className="fas fa-align-right" /></button>
                            </div>

                            {/* Row 2 */}
                            <div className="arply-toolbar-row">
                              <button type="button" className={`arply-btn ${toolbarState.insertUnorderedList ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('insertUnorderedList'); updateToolbarState(); }} title="Bullet List"><i className="fas fa-list-ul" /></button>
                              <button type="button" className={`arply-btn ${toolbarState.insertOrderedList ? 'is-active' : ''}`} onMouseDown={(e) => { e.preventDefault(); applyFormat('insertOrderedList'); updateToolbarState(); }} title="Numbered List"><i className="fas fa-list-ol" /></button>

                              {/* Link button + inline popover */}
                              <div className="arply-link-wrap" ref={linkPopoverRef}>
                                <button type="button" className="arply-btn" onMouseDown={(e) => { e.preventDefault(); handleInsertLink(); }} title="Insert Link"><i className="fas fa-link" /></button>
                                {linkPopoverOpen && (
                                  <div className="arply-link-popover" onMouseDown={(e) => e.stopPropagation()}>
                                    <div className="arply-link-pop-head">
                                      <span><i className="fas fa-link" style={{ marginRight: 8, color: 'var(--ap)' }} />Insert Link</span>
                                      <button type="button" className="arply-link-pop-close" onClick={() => setLinkPopoverOpen(false)}><i className="fas fa-times" /></button>
                                    </div>
                                    <div className="arply-link-pop-body">
                                      <div className="arply-link-field">
                                        <label>Text to display</label>
                                        <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Link text" />
                                      </div>
                                      <div className="arply-link-field">
                                        <label>Link URL</label>
                                        <input
                                          type="text"
                                          ref={linkUrlInputRef}
                                          value={linkUrl}
                                          onChange={(e) => setLinkUrl(e.target.value)}
                                          placeholder="https://example.com"
                                          onKeyDown={(e) => e.key === 'Enter' && insertLinkFromDraft()}
                                        />
                                      </div>
                                      <div className="arply-link-pop-actions">
                                        <button type="button" className="arply-link-cancel" onClick={() => setLinkPopoverOpen(false)}>Cancel</button>
                                        <button type="button" className="arply-link-insert" onClick={insertLinkFromDraft}><i className="fas fa-link" /> Insert</button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <button type="button" className="arply-btn" onMouseDown={(e) => { e.preventDefault(); handleInsertImage('reply'); }} title="Insert Image"><i className="fas fa-image" /></button>
                              <button type="button" className="arply-btn" onMouseDown={(e) => { e.preventDefault(); applyFormat('removeFormat'); updateToolbarState(); }} title="Clear Formatting"><i className="fas fa-remove-format" /></button>

                              <span className="arply-sep" />

                              <button type="button" className="arply-btn" onMouseDown={(e) => { e.preventDefault(); applyFormat('undo'); }} title="Undo (Ctrl+Z)"><i className="fas fa-undo" /></button>
                              <button type="button" className="arply-btn" onMouseDown={(e) => { e.preventDefault(); applyFormat('redo'); }} title="Redo (Ctrl+Y)"><i className="fas fa-redo" /></button>

                              <span className="arply-sep" />

                              <button type="button" className="arply-btn" onClick={() => fileInputRef.current?.click()} title="Attach File"><i className="fas fa-paperclip" /></button>
                              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple style={{ display: 'none' }} />
                            </div>
                          </div>

                           <div
                            className="ainbox-reply-editor-direct"
                            contentEditable="true"
                            ref={editorRef}
                            onInput={onEditorInput}
                            onKeyUp={updateToolbarState}
                            onMouseUp={updateToolbarState}
                            onSelect={updateToolbarState}
                            onClick={handleEditorImgClick}
                            placeholder="Write your professional response here..."
                          />

                          {replyAttachments.length > 0 && (
                            <div className="ainbox-attachment-list">
                              {replyAttachments.map((file, i) => (
                                <div key={i} className="ainbox-attachment-pill">
                                  <i className="fas fa-file-alt" />
                                  <span className="name">{file.name}</span>
                                  <span className="size">({(file.size / 1024).toFixed(1)} KB)</span>
                                  <button onClick={() => removeAttachment(i)} className="remove">×</button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="ainbox-reply-footer">
                            <div className="ainbox-draft-status">
                              {isDraftSaved && <><i className="fas fa-check-circle" /> Draft saved</>}
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                              <button className="abtn abtn-ghost" onClick={async () => {
                                if (folder !== "drafts") {
                                  setShowReplyBox(false);
                                  if (editorRef.current) editorRef.current.innerHTML = "";
                                  return;
                                }
                                await deleteDraft(selectedMessage.id);
                                toast?.addToast("Draft deleted", "success");
                                setSelectedMessage(null);
                                setViewMode("list");
                                loadMessages();
                              }} disabled={isSending}>Discard</button>
                              <button className="abtn abtn-primary" onClick={handleReply} disabled={isSending} style={{ minWidth: 140 }}>
                                {isSending ? <><i className="fas fa-spinner fa-spin" /> Sending...</> : <><i className="fas fa-paper-plane" style={{ marginRight: 8 }} /> Send Reply</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 12 }}>
                          <button className="abtn abtn-primary" onClick={() => setShowReplyBox(true)}><i className="fas fa-reply" style={{ marginRight: 8 }} /> Reply</button>
                          <button className="abtn abtn-ghost MagicPen-btn" onClick={() => { setShowReplyBox(true); generateAIDraft(); }}><i className="fas fa-magic" style={{ marginRight: 8 }} /> Magic Pen</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="ainbox-empty" style={{ gap: 16 }}>
                  <i className={folder === 'trash' ? 'fas fa-trash-alt' : folder === 'sent' ? 'fas fa-paper-plane' : folder === 'drafts' ? 'fas fa-file-alt' : 'fas fa-envelope-open-text'} />
                  <h3>{
                    folder === 'trash' ? 'Trash is empty' :
                    folder === 'sent' ? 'No sent messages yet' :
                    folder === 'drafts' ? 'No saved drafts' :
                    'Select a message'
                  }</h3>
                  <p style={{ fontSize: 14, color: 'var(--amut)', maxWidth: 280, lineHeight: 1.5 }}>{
                    folder === 'trash' ? 'Deleted messages will appear here.' :
                    folder === 'sent' ? 'Messages you send will appear here.' :
                    folder === 'drafts' ? 'Start composing to auto-save a draft.' :
                    'Choose a conversation from the left to read it here.'
                  }</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {deleteModal && createPortal(
        <div className="adel-overlay" onClick={() => setDeleteModal(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 className="adel-title" style={{ marginBottom: 12 }}>Delete message?</h3>
            
            {deleteModal.mode === "single" && (
              <div className="adel-preview-box" style={{ 
                background: "rgba(0,0,0,0.03)", 
                padding: "16px", 
                borderRadius: "12px", 
                marginBottom: "24px",
                border: "1px solid var(--abdr)"
              }}>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{deleteModal.name}</div>
                <div style={{ 
                  fontSize: "13px", 
                  color: "var(--amut)", 
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: "1.5"
                }}>
                  {deleteModal.message?.replace(/<[^>]*>/g, "")}
                </div>
              </div>
            )}

            {deleteModal.mode === "bulk" && (
              <p style={{ marginBottom: "24px", color: "var(--amut)" }}>Are you sure you want to delete {selection.size} messages?</p>
            )}

            <div className="adel-actions">
              <button className="adel-btn-cancel" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="adel-btn-confirm" onClick={confirmDelete} disabled={isDeleting}>Confirm Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Compose Modal */}
      {showCompose && createPortal(
        <div className={`ainbox-compose-window ${isComposeMinimized ? 'is-minimized' : ''} ${isComposeFullscreen ? 'is-fullscreen' : ''}`}>
          <div className="ainbox-compose-head" onClick={() => setIsComposeMinimized(!isComposeMinimized)}>
            <span>New Message</span>
            <div className="ainbox-compose-head-actions" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsComposeMinimized(!isComposeMinimized)} title="Minimize"><i className="fas fa-minus" /></button>
              <button onClick={() => setIsComposeFullscreen(!isComposeFullscreen)} title="Fullscreen">
                {isComposeFullscreen ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
              </button>
              <button onClick={handleCloseCompose} title="Save & Close"><i className="fas fa-times" /></button>
            </div>
          </div>
          
          {!isComposeMinimized && (
            <div className="ainbox-compose-body">
              <div className="ainbox-compose-field" style={{ display: "flex", alignItems: "center" }}>
                <input type="text" placeholder="Recipients" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} style={{ flex: 1 }} />
                <div className="ainbox-compose-ccbcc-btns">
                  {!showCc && <button onClick={() => setShowCc(true)}>Cc</button>}
                  {!showBcc && <button onClick={() => setShowBcc(true)}>Bcc</button>}
                </div>
              </div>
              
              {showCc && (
                <div className="ainbox-compose-field">
                  <input type="text" placeholder="Cc" value={composeCc} onChange={(e) => setComposeCc(e.target.value)} />
                </div>
              )}
              
              {showBcc && (
                <div className="ainbox-compose-field">
                  <input type="text" placeholder="Bcc" value={composeBcc} onChange={(e) => setComposeBcc(e.target.value)} />
                </div>
              )}

              <div className="ainbox-compose-field">
                <input type="text" placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
              </div>
              
              <div
                className="ainbox-compose-editor"
                contentEditable="true"
                ref={composeEditorRef}
                onClick={handleEditorImgClick}
                placeholder="Press / for Help me write"
              />

              {showFormatting && (
                <div className="ainbox-compose-toolbar">
                  <div className="atoolbar-group">
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("undo"); }} title="Undo"><i className="fas fa-undo" /></button>
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("redo"); }} title="Redo"><i className="fas fa-redo" /></button>
                  </div>
                  
                  <span className="awp-toolbar-sep" />
                  
                  <div className="atoolbar-group">
                    <div className="atoolbar-font-select">
                      <span>Sans Serif</span>
                      <i className="fas fa-caret-down" />
                    </div>
                  </div>

                  <span className="awp-toolbar-sep" />

                  <div className="atoolbar-group">
                    <button type="button" className="awp-tbtn" title="Text size"><i className="fas fa-text-height" /><i className="fas fa-caret-down" style={{ fontSize: 8, marginLeft: 2 }} /></button>
                  </div>

                  <span className="awp-toolbar-sep" />

                  <div className="atoolbar-group">
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("bold"); }} title="Bold"><i className="fas fa-bold" /></button>
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("italic"); }} title="Italic"><i className="fas fa-italic" /></button>
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("underline"); }} title="Underline"><i className="fas fa-underline" /></button>
                    <div className="awp-tcolor-group">
                      <button type="button" className="awp-tbtn" title="Text Color"><i className="fas fa-font" style={{ borderBottom: "3px solid var(--atxt)" }} /></button>
                      <input type="color" onChange={(e) => applyFormat("foreColor", e.target.value)} />
                    </div>
                  </div>

                  <span className="awp-toolbar-sep" />

                  <div className="atoolbar-group">
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("justifyLeft"); }} title="Align"><i className="fas fa-align-left" /><i className="fas fa-caret-down" style={{ fontSize: 8, marginLeft: 2 }} /></button>
                  </div>

                  <span className="awp-toolbar-sep" />

                  <div className="atoolbar-group">
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("insertOrderedList"); }} title="Numbered list"><i className="fas fa-list-ol" /></button>
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("insertUnorderedList"); }} title="Bulleted list"><i className="fas fa-list-ul" /></button>
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("outdent"); }} title="Indent"><i className="fas fa-outdent" /></button>
                    <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); applyFormat("indent"); }} title="Indent"><i className="fas fa-indent" /></button>
                  </div>
                  
                  <div className="atoolbar-group" style={{ position: "relative" }}>
                    <button type="button" className={`awp-tbtn ${showMoreFormatting ? 'is-active' : ''}`} onClick={() => setShowMoreFormatting(!showMoreFormatting)} title="More options"><i className="fas fa-caret-down" /></button>
                    
                    {showMoreFormatting && (
                      <div className="atoolbar-more-dropdown">
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormat("strikeThrough"); setShowMoreFormatting(false); }} title="Strikethrough"><i className="fas fa-strikethrough" /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormat("insertHorizontalRule"); setShowMoreFormatting(false); }} title="Horizontal line"><i className="fas fa-minus" /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "BLOCKQUOTE"); setShowMoreFormatting(false); }} title="Quote"><i className="fas fa-quote-right" /></button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormat("removeFormat"); setShowMoreFormatting(false); }} title="Clear formatting"><i className="fas fa-remove-format" /></button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="ainbox-compose-footer">
                {composeAttachments.length > 0 && (
                  <div className="ainbox-compose-attach-zone">
                    <div className="ainbox-compose-attach-pills">
                      {composeAttachments.map((file, i) => (
                        <div key={i} className="ainbox-attachment-pill">
                          <i className={file.type.startsWith('image/') ? 'fas fa-image' : 'fas fa-file-alt'} />
                          <span className="name">{file.name}</span>
                          <span className="size">({(file.size / 1024).toFixed(0)} KB)</span>
                          <button onClick={() => setComposeAttachments(prev => prev.filter((_, idx) => idx !== i))} className="remove">×</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="ainbox-attach-files-btn" onClick={() => composeFileInputRef.current?.click()}>
                      <i className="fas fa-paperclip" /> Attach files
                    </button>
                  </div>
                )}

                <div className="ainbox-compose-footer-row">
                  <div className="ainbox-footer-main">
                    <div className="ainbox-send-split">
                      <button className="ainbox-send-btn" onClick={handleSendNew} disabled={isSending}>
                        {isSending ? <i className="fas fa-spinner fa-spin" /> : "Send"}
                      </button>
                      <button className="ainbox-send-more"><i className="fas fa-caret-down" /></button>
                    </div>

                    <div className="ainbox-footer-tools">
                      <button type="button" className={`awp-tbtn ${showFormatting ? 'is-active' : ''}`} onClick={() => setShowFormatting(!showFormatting)} title="Formatting options"><i className="fas fa-font" /></button>
                      <button type="button" className="awp-tbtn" onClick={() => { setShowFormatting(false); generateAIDraft(); }} title="Help me write"><i className="fas fa-magic" /></button>
                      <button type="button" className="awp-tbtn" onClick={() => composeFileInputRef.current?.click()} title="Attach files"><i className="fas fa-paperclip" /></button>
                      <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); handleInsertLink(); }} title="Insert link"><i className="fas fa-link" /></button>
                      <div style={{ position: "relative" }}>
                        <button type="button" className={`awp-tbtn ${showEmojiPicker ? 'is-active' : ''}`} onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Insert emoji"><i className="far fa-smile" /></button>
                        {showEmojiPicker && (
                          <div className="ainbox-emoji-picker">
                            <div className="emoji-grid">
                              {EMOJI_LIST.map((emoji, i) => (
                                <button key={i} type="button" onClick={() => handleInsertEmoji(emoji)} className="emoji-item">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button type="button" className="awp-tbtn" onMouseDown={(e) => { e.preventDefault(); handleInsertImage('compose'); }} title="Insert photo"><i className="far fa-image" /></button>
                      <input type="file" ref={composeFileInputRef} onChange={(e) => setComposeAttachments(prev => [...prev, ...Array.from(e.target.files)])} multiple style={{ display: "none" }} />
                    </div>
                  </div>

                  <button className="ainbox-discard-btn" onClick={handleCloseCompose} title="Discard draft"><i className="fas fa-trash-alt" /></button>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Hidden image file input — shared by reply and compose image buttons */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleImageFileChange}
        style={{ display: "none" }}
      />

      {/* Image Selection Overlay + Toolbar */}
      {imgSelection && imgRect && createPortal(
        <>
          {/* Blue outline + corner resize handles */}
          <div
            className="aimg-selection-overlay"
            style={{ top: imgRect.top, left: imgRect.left, width: imgRect.width, height: imgRect.height }}
          >
            {['nw','ne','sw','se'].map(corner => (
              <div key={corner} className={`aimg-handle aimg-handle-${corner}`} onMouseDown={(e) => startImgResize(e, corner)} />
            ))}
          </div>

          {/* Floating toolbar — Gmail-style white card below image */}
          <div
            className="aimg-toolbar"
            style={{
              top: imgRect.bottom + 8,
              left: Math.min(imgRect.left, window.innerWidth - 420),
            }}
          >
            {imgAltEdit ? (
              <>
                <input
                  className="aimg-alt-input"
                  value={imgAltInput}
                  onChange={(e) => setImgAltInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { imgSelection.img.alt = imgAltInput; setImgAltEdit(false); } if (e.key === 'Escape') setImgAltEdit(false); }}
                  placeholder="Describe the image…"
                  autoFocus
                />
                <span className="aimg-tb-sep">|</span>
                <button className="aimg-tb-btn" onClick={() => { imgSelection.img.alt = imgAltInput; setImgAltEdit(false); }}>Save</button>
                <span className="aimg-tb-sep">|</span>
                <button className="aimg-tb-btn" onClick={() => setImgAltEdit(false)}>Cancel</button>
              </>
            ) : (
              <>
                <button className={`aimg-tb-btn${imgActiveSize === 'small' ? ' is-active' : ''}`} onClick={() => applyImgSize('small')}>Small</button>
                <span className="aimg-tb-sep">|</span>
                <button className={`aimg-tb-btn${imgActiveSize === 'fit' ? ' is-active' : ''}`} onClick={() => applyImgSize('fit')}>Best fit</button>
                <span className="aimg-tb-sep">|</span>
                <button className={`aimg-tb-btn${imgActiveSize === 'original' ? ' is-active' : ''}`} onClick={() => applyImgSize('original')}>Original size</button>
                <span className="aimg-tb-sep">|</span>
                <button className="aimg-tb-btn" onClick={() => { setImgAltEdit(true); setImgAltInput(imgSelection.img.alt || ''); }}>Edit alt text</button>
                <span className="aimg-tb-sep">|</span>
                <button className="aimg-tb-btn is-remove" onClick={removeSelectedImg}>Remove</button>
              </>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="ainbox-context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={(e) => { handleSelectMessage(contextMenu.msg); setContextMenu(null); }}>
            <i className="fas fa-envelope-open" /> Open message
          </button>
          <button onClick={(e) => handleQuickAction(e, contextMenu.msg.is_read ? "unread" : "read", contextMenu.msg)}>
            <i className={contextMenu.msg.is_read ? "fas fa-envelope" : "fas fa-envelope-open"} /> 
            {contextMenu.msg.is_read ? " Mark as unread" : " Mark as read"}
          </button>
          <button onClick={(e) => handleToggleStar(e, contextMenu.msg.id)}>
            <i className="fas fa-star" /> {contextMenu.msg.is_starred ? "Remove star" : "Add star"}
          </button>
          <div className="ainbox-context-sep" />
          <button className="is-danger" onClick={(e) => handleQuickAction(e, "delete", contextMenu.msg)}>
            <i className="fas fa-trash-alt" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
