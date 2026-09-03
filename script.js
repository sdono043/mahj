// AM's 40th — Party HQ
// Checked tasks and notes sync live for everyone via Firestore. The guest list still
// ships pre-seeded with the current RSVPs, but edits to it persist to localStorage on
// this device only (not yet shared).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
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

const PARTY_DATE = new Date("2026-09-12T18:00:00");

const TEAMS = [
  {
    id: "flowers",
    icon: "🌸",
    name: "Flowers & Decor",
    tasks: [
      "Overall flowers",
      "Tablescape styling",
      "Candles",
      "Final “make it beautiful” pass",
    ],
    anchorLink: { href: "#detail-flowers", label: "View setup details" },
  },
  {
    id: "grazing",
    icon: "🧀",
    name: "Grazing Table",
    tasks: ["Shop", "Assemble grazing table", "Keep it replenished before dinner"],
    note: "Overlaps with the Bar — coordinate together.",
    anchorLink: { href: "#grazing-table", label: "View shopping list" },
  },
  {
    id: "bar",
    icon: "🍷",
    name: "Beverage / Bar",
    tasks: [
      "Make red & white sangria",
      "Chill wine, cava & champagne",
      "Stock bar",
      "Ice",
      "Garnishes",
    ],
    note: "Overlaps with the Grazing Table — coordinate together.",
    anchorLink: { href: "#bar-cocktails", label: "View cocktail menu" },
  },
  {
    id: "cake",
    icon: "🎂",
    name: "Cake",
    tasks: [
      "Call Pearl's Bake Shoppe — confirm Gone Coco Cake sizing for 48",
      "Order cake",
      "Pick up cake",
      "Cake stand",
      "Candles",
      "Knife",
      "Plates / forks",
      "Bring cake out",
      "Coordinate the toast",
    ],
    note: "The reveal moment — keep it a fun surprise!",
    anchorLink: { href: "#detail-cake", label: "View setup details" },
  },
  {
    id: "setup",
    icon: "💪",
    name: "Setup",
    tasks: [
      "Hang lanterns",
      "String lights",
      "Set tables",
      "Put out candles",
      "General setup",
    ],
    anchorLink: { href: "#detail-setup", label: "View setup details" },
  },
  {
    id: "pinata",
    icon: "🎈",
    name: "Piñata",
    tasks: [
      "Commission the piñata",
      "Hang it during setup",
      "Time the reveal with the cake",
    ],
    note: "Commissioned ahead of time; hung during setup, with the reveal timed to the cake.",
    anchorLink: { href: "#detail-pinata", label: "View setup details" },
  },
];

const TIMELINE = [
  { time: "11:00 AM – 3:00 PM", title: "Setup", detail: "Hang lanterns & string lights, set tables, put out candles — making it all beautiful." },
  { time: "2:00 PM", title: "Flowers & Decor styling", detail: "Tablescape, candles, final “make it beautiful” pass." },
  { time: "5:00 PM", title: "Patty arrives — grazing table & bar", detail: "Assemble grazing table, stock bar, chill wine, cava & champagne, make sangria." },
  { time: "5:00 PM", title: "Piñata hung, final walkthrough", detail: "Piñata hung; quick walk of the whole yard." },
  { time: "5:45 PM", title: "Paella on", detail: "Get the paella going so it's ready not long after guests arrive." },
  { time: "6:00 PM", title: "Guests arrive 🎉", detail: "Welcome drinks, grazing table open." },
  { time: "7:00 PM", title: "Paella served", detail: "Dinner under the string lights." },
  { time: "8:30 PM", title: "Cake reveal & toast 🎂", detail: "Cake brought out, toast coordinated." },
  { time: "9:00 PM", title: "Piñata", detail: "Reveal timed with the cake." },
  { time: "9:30 PM", title: "Dancing & night breeze", detail: "Keep the lights on and the night going." },
];

const DEFAULT_GUESTS = [
  { name: "AB & Rob Dickinson", rsvp: "yes", notes: "" },
  { name: "Elizabeth & John Carrington", rsvp: "yes", notes: "" },
  { name: "Caley & Alex Wilson", rsvp: "no", notes: "" },
  { name: "Eden & Brian Fowler", rsvp: "yes", notes: "" },
  { name: "Christina & Lan Holloway", rsvp: "invited", notes: "Invite sent 14 days ago — consider resending" },
  { name: "Chris & Britt Harris", rsvp: "no", notes: "" },
  { name: "Bailey Moyer", rsvp: "no", notes: "" },
  { name: "Rachel & Jay Amato", rsvp: "yes", notes: "" },
  { name: "Emily & Patrick Bisceglia", rsvp: "yes", notes: "" },
  { name: "Maggie & Matt Crisafi", rsvp: "yes", notes: "" },
  { name: "Amanda & Dave Seibert", rsvp: "yes", notes: "" },
  { name: "Jenny & Andrew Palmer", rsvp: "yes", notes: "" },
  { name: "Kristina & David Lee", rsvp: "invited", notes: "Page viewed, no response yet" },
  { name: "Rachel & Matt Nilson", rsvp: "yes", notes: "" },
  { name: "Brit & Paul Trible", rsvp: "invited", notes: "Email opened, no response yet" },
  { name: "Morgan & Manish Patel", rsvp: "yes", notes: "" },
  { name: "Emily & Brian Wood", rsvp: "yes", notes: "" },
  { name: "Jen & Bahnsen Miller", rsvp: "yes", notes: "" },
  { name: "Cathy & Drew Shiembob", rsvp: "yes", notes: "" },
  { name: "Kelsey & Kevin Alas", rsvp: "yes", notes: "" },
  { name: "Amanda & Devin OMalley", rsvp: "yes", notes: "" },
  { name: "Gracie & Richard Graham", rsvp: "yes", notes: "" },
  { name: "Krista & Brendan Donohoe", rsvp: "yes", notes: "" },
  { name: "Laura & Ryan Considine", rsvp: "yes", notes: "" },
  { name: "Alexis & Gustavo Martirosian", rsvp: "yes", notes: "" },
  { name: "William & Blair Adams", rsvp: "invited", notes: "Page viewed, no response yet" },
  { name: "Amanda & Quentin Ward", rsvp: "yes", notes: "" },
  { name: "Catherine & Keith Muth", rsvp: "yes", notes: "" },
  { name: "Bailey & Kevin Carson", rsvp: "yes", notes: "" },
];

const STORAGE_GUESTS = "am40-guests";

/* ---------- string lights ---------- */

function renderBulbs() {
  const el = document.getElementById("bulbs");
  const count = 18;
  for (let i = 0; i < count; i++) {
    const b = document.createElement("span");
    b.style.animationDelay = `${(i * 0.18).toFixed(2)}s`;
    el.appendChild(b);
  }
}

/* ---------- countdown ---------- */

function tickCountdown() {
  const now = new Date();
  let diff = PARTY_DATE - now;
  const els = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };
  if (diff <= 0) {
    els.days.textContent = "🎉";
    els.hours.textContent = "";
    els.mins.textContent = "";
    els.secs.textContent = "";
    return;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -= days * 1000 * 60 * 60 * 24;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const mins = Math.floor(diff / (1000 * 60));
  diff -= mins * 1000 * 60;
  const secs = Math.floor(diff / 1000);

  els.days.textContent = String(days);
  els.hours.textContent = String(hours).padStart(2, "0");
  els.mins.textContent = String(mins).padStart(2, "0");
  els.secs.textContent = String(secs).padStart(2, "0");
}

/* ---------- task state (synced live via Firestore) ---------- */

const TASKS_DOC = doc(db, "state", "tasks");
let taskState = {};

function renderTeams() {
  const grid = document.getElementById("team-grid");
  grid.innerHTML = "";

  TEAMS.forEach((team) => {
    const card = document.createElement("article");
    card.className = "team-card";

    const tasksHtml = team.tasks
      .map((task, i) => {
        const id = `${team.id}-${i}`;
        const checked = taskState[id] ? "checked" : "";
        return `
          <li>
            <input type="checkbox" id="${id}" data-team="${team.id}" ${checked} />
            <label for="${id}">${task}</label>
          </li>`;
      })
      .join("");

    card.innerHTML = `
      <div class="team-card__head">
        <span class="team-card__icon">${team.icon}</span>
        <span class="team-card__name">${team.name}</span>
      </div>
      ${team.note ? `<div class="team-card__note">${team.note}</div>` : ""}
      <ul class="task-list">${tasksHtml}</ul>
      ${
        team.anchorLink
          ? `<a class="card-link" href="${team.anchorLink.href}">${team.anchorLink.label}</a>`
          : ""
      }
    `;

    grid.appendChild(card);
  });
}

function setupTeamHandlers() {
  const grid = document.getElementById("team-grid");
  grid.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      setDoc(TASKS_DOC, { [e.target.id]: e.target.checked }, { merge: true }).catch((err) =>
        console.error("Failed to save task state", err)
      );
    }
  });
}

function watchTasks() {
  onSnapshot(
    TASKS_DOC,
    (snap) => {
      taskState = snap.exists() ? snap.data() : {};
      renderTeams();
      updateOverallProgress();
    },
    (err) => console.error("Task sync error", err)
  );
}

function updateOverallProgress() {
  const totalTasks = TEAMS.reduce((sum, t) => sum + t.tasks.length, 0);
  const done = TEAMS.reduce((sum, t) => {
    return sum + t.tasks.filter((_, i) => taskState[`${t.id}-${i}`]).length;
  }, 0);
  const pct = totalTasks ? Math.round((done / totalTasks) * 100) : 0;
  document.getElementById("overall-fill").style.width = `${pct}%`;
  document.getElementById("overall-count").textContent = `${done} / ${totalTasks} tasks`;
}

/* ---------- notes & suggestions, per section (synced live via Firestore) ---------- */

// Sections (beyond the general board) that get their own notes widget.
const NOTE_SECTIONS = [
  { id: "detail-flowers", label: "Flowers & Decor" },
  { id: "grazing-table", label: "Grazing Table" },
  { id: "bar-cocktails", label: "Cocktail Menu" },
  { id: "bar-setup", label: "Bar Setup" },
  { id: "detail-cake", label: "Cake" },
  { id: "detail-setup", label: "Setup" },
  { id: "detail-pinata", label: "Piñata" },
  { id: "setup-logistics", label: "Yard Map & Logistics" },
  { id: "timeline", label: "Day-Of Timeline" },
];

// "Seen" watermark for showing NEW badges — updated once per page load, after the
// first snapshot renders, so this visit still sees badges for anything posted
// since the *previous* visit.
const NOTES_SEEN_KEY = "am40-notes-seen-at";
const notesSeenAt = Number(localStorage.getItem(NOTES_SEEN_KEY) || 0);
let notesSeenAtWritten = false;

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

  // General / catch-all board at the top of the page.
  const generalDocs = topLevel.filter((d) => !d.data().section || d.data().section === "general");
  const list = document.getElementById("notes-list");
  const empty = document.getElementById("notes-empty");
  if (!generalDocs.length) {
    list.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    list.innerHTML = generalDocs.map((d) => noteCardHtml(d, countReplies(allDocs, d.id))).join("");
  }

  // Per-section widgets.
  NOTE_SECTIONS.forEach((sec) => {
    const widget = document.querySelector(`.section-notes[data-section="${sec.id}"]`);
    if (!widget) return;
    const docsForSection = topLevel.filter((d) => d.data().section === sec.id);
    const listEl = widget.querySelector("[data-notes-list]");
    listEl.innerHTML = docsForSection.length
      ? docsForSection.map((d) => noteCardHtml(d, countReplies(allDocs, d.id))).join("")
      : '<p class="notes-empty-inline">No notes yet for this section.</p>';

    // Count this section's notes AND any replies to them for the badge/auto-open.
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

function setupNotesHandlers() {
  buildSectionNoteWidgets();

  const form = document.getElementById("notes-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("note-name").value.trim();
    const text = document.getElementById("note-text").value.trim();
    if (!name || !text) return;
    addDoc(collection(db, "notes"), { name, text, section: "general", parentId: null, createdAt: serverTimestamp() })
      .then(() => form.reset())
      .catch((err) => console.error("Failed to post note", err));
  });
}

/* ---------- timeline ---------- */

function renderTimeline() {
  const list = document.getElementById("timeline-list");
  list.innerHTML = TIMELINE.map(
    (item) => `
    <li>
      <span class="timeline__time">${item.time}</span>
      <span class="timeline__dot"></span>
      <span class="timeline__body"><strong>${item.title}</strong><span>${item.detail}</span></span>
    </li>`
  ).join("");
}

/* ---------- guest list ---------- */

function loadGuests() {
  try {
    const raw = localStorage.getItem(STORAGE_GUESTS);
    if (raw === null) return DEFAULT_GUESTS.slice();
    return JSON.parse(raw) || [];
  } catch {
    return DEFAULT_GUESTS.slice();
  }
}

function saveGuests(guests) {
  localStorage.setItem(STORAGE_GUESTS, JSON.stringify(guests));
}

function renderGuests() {
  const guests = loadGuests();
  const tbody = document.getElementById("guest-tbody");
  const empty = document.getElementById("guest-empty");

  tbody.innerHTML = guests
    .map(
      (g, i) => `
      <tr data-idx="${i}">
        <td>${escapeHtml(g.name)}</td>
        <td>
          <select class="rsvp-select" data-rsvp="${g.rsvp}">
            <option value="invited" ${g.rsvp === "invited" ? "selected" : ""}>Invited</option>
            <option value="yes" ${g.rsvp === "yes" ? "selected" : ""}>Yes</option>
            <option value="maybe" ${g.rsvp === "maybe" ? "selected" : ""}>Maybe</option>
            <option value="no" ${g.rsvp === "no" ? "selected" : ""}>No</option>
          </select>
        </td>
        <td>${escapeHtml(g.notes || "")}</td>
        <td><button class="guest-remove" title="Remove">✕</button></td>
      </tr>`
    )
    .join("");

  empty.style.display = guests.length ? "none" : "block";

  const summary = document.getElementById("guest-summary");
  const HEADCOUNT_MULTIPLIER = 2; // each row is a couple
  const yes = guests.filter((g) => g.rsvp === "yes").length * HEADCOUNT_MULTIPLIER;
  const maybe = guests.filter((g) => g.rsvp === "maybe").length * HEADCOUNT_MULTIPLIER;
  const no = guests.filter((g) => g.rsvp === "no").length * HEADCOUNT_MULTIPLIER;
  const total = guests.length * HEADCOUNT_MULTIPLIER;
  summary.innerHTML = `
    <span class="chip"><strong>${total}</strong> total</span>
    <span class="chip"><strong>${yes}</strong> yes</span>
    <span class="chip"><strong>${maybe}</strong> maybe</span>
    <span class="chip"><strong>${no}</strong> no</span>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setupGuestHandlers() {
  const form = document.getElementById("guest-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("guest-name").value.trim();
    if (!name) return;
    const rsvp = document.getElementById("guest-rsvp").value;
    const notes = document.getElementById("guest-notes").value.trim();
    const guests = loadGuests();
    guests.push({ name, rsvp, notes });
    saveGuests(guests);
    form.reset();
    renderGuests();
  });

  document.getElementById("bulk-add-btn").addEventListener("click", () => {
    const textarea = document.getElementById("bulk-names");
    const names = textarea.value
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) return;
    const guests = loadGuests();
    names.forEach((name) => guests.push({ name, rsvp: "invited", notes: "" }));
    saveGuests(guests);
    textarea.value = "";
    renderGuests();
  });

  const tbody = document.getElementById("guest-tbody");
  tbody.addEventListener("click", (e) => {
    if (!e.target.matches(".guest-remove")) return;
    const idx = Number(e.target.closest("tr").dataset.idx);
    const guests = loadGuests();
    guests.splice(idx, 1);
    saveGuests(guests);
    renderGuests();
  });

  tbody.addEventListener("change", (e) => {
    if (!e.target.matches(".rsvp-select")) return;
    const idx = Number(e.target.closest("tr").dataset.idx);
    const guests = loadGuests();
    guests[idx].rsvp = e.target.value;
    saveGuests(guests);
    renderGuests();
  });
}

/* ---------- init ---------- */

renderBulbs();
tickCountdown();
setInterval(tickCountdown, 1000);

setupTeamHandlers();
watchTasks();
setupNotesHandlers();
watchNotes();
renderTimeline();
renderGuests();
setupGuestHandlers();
