// AM's 40th — Rainy Day Plan
// Per-section notes widgets, same pattern as the main site and sharing the same
// Firestore "notes" collection — anything posted here also shows up on /notes.

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

const NOTE_SECTIONS = [
  { id: "rainy-the-call", label: "The Call" },
  { id: "rainy-floor-plan", label: "Indoor Floor Plan" },
  { id: "rainy-outdoor-plan", label: "Outdoor Plan — Tents" },
  { id: "rainy-rooms", label: "Room by Room" },
  { id: "rainy-porch-bar", label: "Porch — Bar & Sparkling Bar" },
  { id: "rainy-dining-grazing", label: "Dining Room — Grazing Table" },
  { id: "rainy-inventory", label: "What's Already in the House" },
];

// Shares the same "seen" watermark as the main site and /notes.
const NOTES_SEEN_KEY = "am40-notes-seen-at";
const notesSeenAt = Number(localStorage.getItem(NOTES_SEEN_KEY) || 0);
let notesSeenAtWritten = false;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function noteIsNew(data) {
  const created = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
  return created > notesSeenAt;
}

function noteCardHtml(doc, replyCount) {
  const data = doc.data();
  const when = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  const whenStr = when
    ? when.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "just now";
  const isNew = noteIsNew(data);
  const replyLabel = replyCount > 0 ? `${replyCount} repl${replyCount === 1 ? "y" : "ies"}` : "Reply";
  return `
    <div class="note-card ${isNew ? "note-card--new" : ""}">
      <div class="note-card__head">
        <span class="note-card__name">${escapeHtml(data.name)}</span>
        <span class="note-card__time">${isNew ? '<span class="note-card__new-badge">NEW</span>' : ""}${whenStr}</span>
      </div>
      <p class="note-card__text">${escapeHtml(data.text)}</p>
      <a class="note-card__reply-link" href="/mahj/notes/#note-${doc.id}" target="_blank" rel="noopener">${replyLabel} →</a>
    </div>`;
}

function buildSectionNoteWidgets() {
  NOTE_SECTIONS.forEach((sec) => {
    const host = document.getElementById(sec.id);
    if (!host) return;

    const details = document.createElement("details");
    details.className = "section-notes";
    details.dataset.section = sec.id;
    details.innerHTML = `
      <summary>💬 Notes for this section <span class="section-notes__count" data-count></span></summary>
      <div class="section-notes__body">
        <form class="notes-form-mini">
          <input type="text" data-note-name placeholder="Your name" required />
          <textarea data-note-text rows="2" placeholder="Question or suggestion for this section…" required></textarea>
          <button type="submit">Post</button>
        </form>
        <div class="section-notes__list" data-notes-list></div>
      </div>
    `;
    host.appendChild(details);

    details.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = details.querySelector("[data-note-name]").value.trim();
      const text = details.querySelector("[data-note-text]").value.trim();
      if (!name || !text) return;
      addDoc(collection(db, "notes"), { name, text, section: sec.id, parentId: null, createdAt: serverTimestamp() })
        .then(() => e.target.reset())
        .catch((err) => console.error("Failed to post note", err));
    });
  });
}

function countReplies(allDocs, noteId) {
  return allDocs.filter((d) => d.data().parentId === noteId).length;
}

function renderAllNotes(allDocs) {
  const topLevel = allDocs.filter((d) => !d.data().parentId);

  NOTE_SECTIONS.forEach((sec) => {
    const widget = document.querySelector(`.section-notes[data-section="${sec.id}"]`);
    if (!widget) return;
    const docsForSection = topLevel.filter((d) => d.data().section === sec.id);
    const listEl = widget.querySelector("[data-notes-list]");
    listEl.innerHTML = docsForSection.length
      ? docsForSection.map((d) => noteCardHtml(d, countReplies(allDocs, d.id))).join("")
      : '<p class="notes-empty-inline">No notes yet for this section.</p>';

    const sectionNoteIds = new Set(docsForSection.map((d) => d.id));
    const repliesToSection = allDocs.filter((d) => sectionNoteIds.has(d.data().parentId));
    const countEl = widget.querySelector("[data-count]");
    const total = docsForSection.length + repliesToSection.length;
    countEl.textContent = total ? String(total) : "";
    const hasNew =
      docsForSection.some((d) => noteIsNew(d.data())) || repliesToSection.some((d) => noteIsNew(d.data()));
    countEl.classList.toggle("section-notes__count--new", hasNew);
    if (hasNew) widget.open = true;
  });
}

function watchNotes() {
  const notesQuery = query(collection(db, "notes"), orderBy("createdAt", "desc"));
  onSnapshot(
    notesQuery,
    (snap) => {
      renderAllNotes(snap.docs);
      if (!notesSeenAtWritten) {
        notesSeenAtWritten = true;
        localStorage.setItem(NOTES_SEEN_KEY, String(Date.now()));
      }
    },
    (err) => console.error("Notes sync error", err)
  );
}

buildSectionNoteWidgets();
watchNotes();
