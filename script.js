// AM's 40th — Party HQ
// The guest list ships pre-seeded with the current RSVPs; edits after that persist to
// localStorage on this device only. Checked tasks work the same way.

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

const STORAGE_TASKS = "am40-tasks";
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

/* ---------- task state ---------- */

function loadTaskState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_TASKS)) || {};
  } catch {
    return {};
  }
}

function saveTaskState(state) {
  localStorage.setItem(STORAGE_TASKS, JSON.stringify(state));
}

function renderTeams() {
  const grid = document.getElementById("team-grid");
  const state = loadTaskState();

  TEAMS.forEach((team) => {
    const card = document.createElement("article");
    card.className = "team-card";

    const tasksHtml = team.tasks
      .map((task, i) => {
        const id = `${team.id}-${i}`;
        const checked = state[id] ? "checked" : "";
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

  grid.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      const state = loadTaskState();
      state[e.target.id] = e.target.checked;
      saveTaskState(state);
      updateOverallProgress();
    }
  });
}

function updateOverallProgress() {
  const state = loadTaskState();
  const totalTasks = TEAMS.reduce((sum, t) => sum + t.tasks.length, 0);
  const done = TEAMS.reduce((sum, t) => {
    return (
      sum +
      t.tasks.filter((_, i) => state[`${t.id}-${i}`]).length
    );
  }, 0);
  const pct = totalTasks ? Math.round((done / totalTasks) * 100) : 0;
  document.getElementById("overall-fill").style.width = `${pct}%`;
  document.getElementById("overall-count").textContent = `${done} / ${totalTasks} tasks`;
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

renderTeams();
updateOverallProgress();
renderTimeline();
renderGuests();
setupGuestHandlers();
