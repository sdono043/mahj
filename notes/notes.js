// AM's 40th — Notes & Questions
// Single-pane view of every note across the site, grouped by section, with inline
// threaded replies. Shares the same Firestore project/collection as the main site's
// per-section notes widgets, so everything stays in sync both ways.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAkyLuQDuq7v9E3G9j8V9UygoRBIFdWDCY",
  authDomain: "am-40th-party.firebaseapp.com",
  projectId: "am-40th-party",
  storageBucket: "am-40th-party.firebasestorage.app",
  messagingSenderId: "999828518053",
  appId: "1:999828518053:web:bed02130dc83a7af77494c",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "detail-flowers", label: "Flowers & Decor" },
  { id: "grazing-table", label: "Grazing Table" },
  { id: "detail-paella", label: "Paella" },
  { id: "bar-cocktails", label: "Cocktail Menu" },
  { id: "bar-setup", label: "Bar Setup" },
  { id: "detail-cake", label: "Cake" },
  { id: "detail-setup", label: "Setup" },
  { id: "detail-pinata", label: "Piñata" },
  { id: "timeline", label: "Day-Of Timeline" },
  { id: "setup-logistics", label: "Yard Map & Logistics" },
];

// Shares the same "seen" watermark as the main site's per-section widgets.
const NOTES_SEEN_KEY = "am40-notes-seen-at";
const notesSeenAt = Number(localStorage.getItem(NOTES_SEEN_KEY) || 0);
let notesSeenAtWritten = false;
let scrolledToHash = false;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function isNew(data) {
  const t = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
  return t > notesSeenAt;
}

function fmtTime(data) {
  const when = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  return when
    ? when.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "just now";
}

function newBadge(data) {
  return isNew(data) ? '<span class="note-card__new-badge">NEW</span>' : "";
}

function replyHtml(doc) {
  const data = doc.data();
  return `
    <div class="note-reply">
      <div class="note-card__head">
        <span class="note-card__name">${escapeHtml(data.name)}</span>
        <span class="note-card__time">${newBadge(data)}${fmtTime(data)}</span>
      </div>
      <p class="note-card__text">${escapeHtml(data.text)}</p>
    </div>`;
}

function threadHtml(noteDoc, replies) {
  const data = noteDoc.data();
  const repliesHtml = replies.map(replyHtml).join("");
  return `
    <div class="note-thread" id="note-${noteDoc.id}">
      <div class="note-card">
        <div class="note-card__head">
          <span class="note-card__name">${escapeHtml(data.name)}</span>
          <span class="note-card__time">${newBadge(data)}${fmtTime(data)}</span>
        </div>
        <p class="note-card__text">${escapeHtml(data.text)}</p>
      </div>
      ${repliesHtml ? `<div class="note-thread__replies">${repliesHtml}</div>` : ""}
      <form class="reply-form" data-parent="${noteDoc.id}" data-section="${escapeHtml(data.section || "general")}">
        <input type="text" data-reply-name placeholder="Your name" required />
        <input type="text" data-reply-text placeholder="Reply to this…" required />
        <button type="submit">Reply</button>
      </form>
    </div>`;
}

function render(allDocs) {
  const groups = document.getElementById("notes-groups");
  const jump = document.getElementById("notes-jump");

  const bySection = {};
  SECTIONS.forEach((s) => (bySection[s.id] = []));

  const topLevel = allDocs.filter((d) => !d.data().parentId);
  topLevel.forEach((d) => {
    const secId = d.data().section && bySection[d.data().section] ? d.data().section : "general";
    bySection[secId].push(d);
  });

  const activeSections = SECTIONS.filter((s) => bySection[s.id].length);

  if (!activeSections.length) {
    jump.innerHTML = "";
    groups.innerHTML = '<p class="notes-empty">No notes yet — be the first!</p>';
    return;
  }

  jump.innerHTML = activeSections
    .map((s) => `<a href="#section-${s.id}">${s.label} <span class="notes-jump__count">${bySection[s.id].length}</span></a>`)
    .join("");

  groups.innerHTML = activeSections
    .map((s) => {
      const threads = bySection[s.id]
        .map((noteDoc) => {
          const replies = allDocs
            .filter((d) => d.data().parentId === noteDoc.id)
            .sort((a, b) => (a.data().createdAt?.toMillis?.() || 0) - (b.data().createdAt?.toMillis?.() || 0));
          return threadHtml(noteDoc, replies);
        })
        .join("");
      return `
        <section class="notes-group" id="section-${s.id}">
          <h2>${s.label}</h2>
          <div class="notes-group__threads">${threads}</div>
        </section>`;
    })
    .join("");

  document.querySelectorAll(".reply-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("[data-reply-name]").value.trim();
      const text = form.querySelector("[data-reply-text]").value.trim();
      if (!name || !text) return;
      addDoc(collection(db, "notes"), {
        name,
        text,
        section: form.dataset.section,
        parentId: form.dataset.parent,
        createdAt: serverTimestamp(),
      })
        .then(() => form.reset())
        .catch((err) => console.error("Failed to post reply", err));
    });
  });

  if (!scrolledToHash && location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      scrolledToHash = true;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

function watch() {
  const notesQuery = query(collection(db, "notes"), orderBy("createdAt", "asc"));
  onSnapshot(
    notesQuery,
    (snap) => {
      render(snap.docs);
      if (!notesSeenAtWritten) {
        notesSeenAtWritten = true;
        localStorage.setItem(NOTES_SEEN_KEY, String(Date.now()));
      }
    },
    (err) => console.error("Notes sync error", err)
  );
}

watch();
