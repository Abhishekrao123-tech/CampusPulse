/* ═══════════════════════════════════════════════
   CAMPUSPULSE — script.js
   Frontend client connected to real Node.js/Express API.
   ═══════════════════════════════════════════════ */

"use strict";

/* ══════════════════════════════════════════════
   1. CONSTANTS & CONFIG
   ══════════════════════════════════════════════ */
const APP_VERSION = "1.1.0";

const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Chemical",
  "Business Administration",
  "Arts & Design",
  "Mathematics",
  "Physics",
  "Biotechnology",
];

const CATEGORIES = [
  "Hackathon",
  "Workshop",
  "Cultural",
  "Sports",
  "Seminar",
  "Tech Talk",
  "Competition",
  "Fest",
  "Networking",
  "Exhibition",
];

const EVENT_EMOJIS = {
  Hackathon: "💻",
  Workshop: "🔧",
  Cultural: "🎭",
  Sports: "🏆",
  Seminar: "🎓",
  "Tech Talk": "🎙️",
  Competition: "🥇",
  Fest: "🎉",
  Networking: "🤝",
  Exhibition: "🖼️",
};

/* ── Date and display helpers ── */
function getEventStatus(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ev = new Date(dateStr);
  ev.setHours(0, 0, 0, 0);
  if (ev < today) return "expired";
  if (ev.getTime() === today.getTime()) return "ongoing";
  return "upcoming";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const parts = timeStr.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ══════════════════════════════════════════════
   2. STATE MANAGER
   ══════════════════════════════════════════════ */
const State = {
  currentUser: null,
  searchQuery: "",
  filterDept: "",
  filterCat: "",
  filterStatus: "",
  filterSort: "date_asc",
  listView: false,
  pendingDeleteId: null,
  viewingEventId: null,
  activeStudentTab: "sdOverview",
  activeAdminTab: "adOverview",
};

/* ══════════════════════════════════════════════
   3. TOAST NOTIFICATIONS
   ══════════════════════════════════════════════ */
function showToast(type = "info", title = "", message = "", duration = 4000) {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ""}
    </div>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;

  toast
    .querySelector(".toast-close")
    .addEventListener("click", () => removeToast(toast));
  container.appendChild(toast);

  const timer = setTimeout(() => removeToast(toast), duration);
  toast._timer = timer;
}

function removeToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.add("removing");
  toast.addEventListener("animationend", () => toast.remove(), { once: true });
}

/* ══════════════════════════════════════════════
   4. MODAL HELPERS
   ══════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("active");
  document.body.style.overflow = "";
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay.active").forEach((m) => {
    m.classList.remove("active");
  });
  document.body.style.overflow = "";
}

/* ══════════════════════════════════════════════
   5. VIEW ROUTER
   ══════════════════════════════════════════════ */
function navigateTo(viewId) {
  // Hide all views
  document.querySelectorAll(".view").forEach((v) => {
    v.style.display = "none";
    v.classList.remove("active");
  });

  const target = document.getElementById(viewId);
  if (!target) return;
  target.style.display = "block";
  target.classList.add("active");

  // Update active nav links
  document.querySelectorAll(".nav-link").forEach((l) => {
    l.classList.toggle("active", l.dataset.view === viewId);
  });

  // Refresh relevant data
  if (viewId === "publicView") renderPublicEvents();
  if (viewId === "studentDashboard") refreshStudentDashboard();
  if (viewId === "adminDashboard") refreshAdminDashboard();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ══════════════════════════════════════════════
   6. PUBLIC EVENT RENDERING
   ══════════════════════════════════════════════ */
async function renderPublicEvents() {
  const grid = document.getElementById("eventsGrid");
  const empty = document.getElementById("eventsEmpty");
  const countEl = document.getElementById("eventsCount");

  try {
    const res = await API.fetchEvents({
      search: State.searchQuery,
      department: State.filterDept,
      category: State.filterCat,
      status: State.filterStatus,
      sort: State.filterSort,
    });

    const events = res.events || [];
    countEl.textContent = events.length;

    if (!events.length) {
      grid.innerHTML = "";
      empty.style.display = "flex";
      updateHeroStats(events);
      return;
    }
    empty.style.display = "none";

    if (State.listView) {
      grid.classList.add("list-view");
    } else {
      grid.classList.remove("list-view");
    }

    grid.innerHTML = events.map((e) => buildEventCard(e)).join("");

    // Attach card event listeners
    grid.querySelectorAll(".event-card-view-btn").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openEventDetails(btn.dataset.id);
      });
    });

    grid.querySelectorAll(".event-card-reg-btn").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handleRegisterClick(btn.dataset.id);
      });
    });

    grid.querySelectorAll(".event-card").forEach((card) => {
      card.addEventListener("click", () => openEventDetails(card.dataset.id));
    });

    // Update hero stats dynamically
    updateHeroStats(events);
  } catch (err) {
    showToast("error", "Failed to fetch events", err.message);
  }
}

function buildEventCard(ev) {
  const status = getEventStatus(ev.date);
  const emoji = EVENT_EMOJIS[ev.category] || "🎯";
  const isReg = ev.isRegistered || false;
  const isFull = ev.registrations >= ev.capacity;
  const expired = status === "expired";

  // Check state directly if logged in user has registration
  const isUserReg = State.currentUser ? ev.isRegistered : false;

  return `
    <div class="event-card" data-id="${ev.id}">
      <div class="event-card-banner" style="background:linear-gradient(135deg,${ev.color}cc,${ev.color}44)">
        <span class="event-status-badge badge-${status}">${status}</span>
        <span class="event-banner-emoji">${emoji}</span>
      </div>
      <div class="event-card-body">
        <span class="event-card-cat">${ev.category}</span>
        <h3 class="event-card-title">${ev.name}</h3>
        <div class="event-card-meta">
          <span class="event-meta-item">📅 ${formatDate(ev.date)}</span>
          <span class="event-meta-item">📍 ${ev.venue}</span>
          <span class="event-meta-item">👥 ${ev.registrations}/${ev.capacity}</span>
        </div>
        <div class="event-card-footer">
          <button class="btn btn-ghost btn-sm event-card-view-btn" data-id="${ev.id}">View Details</button>
          ${
            !expired
              ? State.currentUser && State.currentUser.role === "admin"
                ? `<button class="btn btn-ghost btn-sm" disabled>Admin Mode</button>`
                : `<button class="btn btn-sm event-card-reg-btn ${isReg ? "btn-ghost" : "btn-primary"}" data-id="${ev.id}" ${isFull && !isReg ? "disabled" : ""}>
                ${isReg ? "✓ Registered" : isFull ? "Full" : "Register"}
               </button>`
              : `<button class="btn btn-ghost btn-sm" disabled>Expired</button>`
          }
        </div>
      </div>
    </div>`;
}

function updateHeroStats(events) {
  const upcoming = events.filter(
    (e) => getEventStatus(e.date) === "upcoming",
  ).length;
  const depts = new Set(events.map((e) => e.department)).size;
  animateCount("heroTotalEvents", events.length);
  animateCount("heroUpcoming", upcoming);
  animateCount("heroDepts", depts);
}

function animateCount(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  const start = 0;
  const duration = 600;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.floor(p * target);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

/* ══════════════════════════════════════════════
   7. EVENT DETAILS MODAL (Comments & Tickets)
   ══════════════════════════════════════════════ */
async function openEventDetails(eventId) {
  try {
    const res = await API.fetchEventById(eventId);
    const ev = res.event;
    if (!ev) return;
    State.viewingEventId = eventId;

    const status = getEventStatus(ev.date);
    const emoji = EVENT_EMOJIS[ev.category] || "🎯";
    const isReg = ev.isRegistered;
    const isFull = ev.registrations >= ev.capacity;
    const expired = status === "expired";

    // Header & Info
    document.getElementById("modalBanner").style.background =
      `linear-gradient(135deg,${ev.color}cc,${ev.color}44)`;
    document.getElementById("modalBanner").textContent = emoji;
    document.getElementById("modalBanner").style.fontSize = "3.5rem";
    document.getElementById("modalBanner").style.display = "flex";
    document.getElementById("modalBanner").style.alignItems = "center";
    document.getElementById("modalBanner").style.justifyContent = "center";

    document.getElementById("modalCat").textContent = ev.category;
    document.getElementById("modalTitle").textContent = ev.name;
    document.getElementById("modalDesc").textContent = ev.description;
    document.getElementById("modalDate").textContent = formatDate(ev.date);
    document.getElementById("modalTime").textContent = formatTime(ev.time);
    document.getElementById("modalVenue").textContent = ev.venue;
    document.getElementById("modalDept").textContent = ev.department;
    document.getElementById("modalCapacity").textContent =
      `${ev.registrations} / ${ev.capacity} registered`;
    document.getElementById("modalOrganizer").textContent = ev.organizer;

    // Bookmark Styling
    const bmarkBtn = document.getElementById("modalBookmarkBtn");
    if (State.currentUser) {
      bmarkBtn.style.display = "block";
      if (ev.isBookmarked) {
        bmarkBtn.textContent = "★ Bookmarked";
        bmarkBtn.className = "btn btn-primary";
        bmarkBtn.style.background = "var(--clr-purple-d)";
      } else {
        bmarkBtn.textContent = "☆ Bookmark";
        bmarkBtn.className = "btn btn-ghost";
        bmarkBtn.style.background = "transparent";
      }
    } else {
      bmarkBtn.style.display = "none";
    }

    // Actions button configuration
    const actionsEl = document.getElementById("modalActions");
    if (expired) {
      actionsEl.innerHTML = `<span style="color:var(--clr-text-muted);font-size:.875rem;">This event has ended.</span>`;
    } else if (State.currentUser && State.currentUser.role === "admin") {
      actionsEl.innerHTML = `<button class="btn btn-primary btn-lg" id="modalEditBtn">Edit Event</button>`;
      document.getElementById("modalEditBtn").addEventListener("click", () => {
        closeAllModals();
        openEditEventModal(eventId);
      });
    } else if (isReg) {
      actionsEl.innerHTML = `
        <span style="color:var(--clr-green);font-weight:600;display:flex;align-items:center;gap:6px;">✅ Registered!</span>
        <button class="btn btn-ghost" id="modalUnregBtn" style="color:var(--clr-red); border-color:var(--clr-red)">Cancel Booking</button>`;
      document.getElementById("modalUnregBtn").addEventListener("click", () => {
        handleUnregister(eventId);
      });
    } else {
      actionsEl.innerHTML = `<button class="btn btn-primary btn-lg" id="modalRegisterBtn" ${isFull ? "disabled" : ""}>${isFull ? "Event Full" : "Register Now"}</button>`;
      if (!isFull) {
        document
          .getElementById("modalRegisterBtn")
          .addEventListener("click", () => {
            handleRegisterClick(eventId);
          });
      }
    }

    // QR Ticket / Certificate Section (Bonus features)
    const ticketSection = document.getElementById("modalTicketSection");
    const certSection = document.getElementById("modalCertificateSection");

    if (isReg && State.currentUser && State.currentUser.role === "student") {
      ticketSection.style.display = "block";
      document.getElementById("modalTicketCode").textContent =
        ev.ticket_code || "TKT-PENDING";

      if (ev.qr_code_base64) {
        document.getElementById("modalTicketQr").innerHTML = `
          <img src="${ev.qr_code_base64}" alt="QR Ticket" style="width:128px; height:128px; border-radius:4px;" />
        `;
      } else {
        document.getElementById("modalTicketQr").innerHTML = `
          <div style="width:128px; height:128px; display:flex; align-items:center; justify-content:center; background:#fee2e2; color:#ef4444; font-size:0.75rem; border-radius:4px; border:1px solid #fca5a5; padding:8px; text-align:center;">
            ⚠️ QR Code generation failed. Please use Ticket Code below.
          </div>
        `;
      }

      // Certificate Generation check (if attended is true)
      if (ev.attended) {
        certSection.style.display = "block";
        document.getElementById("modalDownloadCertBtn").href =
          API.getCertificateUrl(ev.registrationId);
      } else {
        certSection.style.display = "none";
      }
    } else {
      ticketSection.style.display = "none";
      certSection.style.display = "none";
    }

    // Comments Section (Bonus feature)
    const commentsList = document.getElementById("modalCommentsList");
    const commentsCount = document.getElementById("modalCommentsCount");
    const commentForm = document.getElementById("commentForm");
    const commentHint = document.getElementById("commentLoginHint");

    const comments = ev.comments || [];
    commentsCount.textContent = comments.length;

    if (comments.length === 0) {
      commentsList.innerHTML = `<p style="font-size:0.8rem; color:var(--clr-text-dim); text-align:center; padding:10px 0;">No comments yet. Start the conversation!</p>`;
    } else {
      commentsList.innerHTML = comments
        .map(
          (c) => `
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: var(--r-sm); border: 1px solid var(--clr-border2);">
          <div style="display:flex; justify-content:space-between; margin-bottom: 4px; font-size: 0.78rem;">
            <span style="font-weight: 600; color: var(--clr-purple-l);">${c.userName} 
              <span style="font-size:0.65rem; font-weight:normal; padding: 1px 5px; border-radius:3px; background:rgba(255,255,255,0.05); text-transform:uppercase;">${c.userRole}</span>
            </span>
            <span style="color: var(--clr-text-dim);">${formatDate(c.created_at.split("T")[0])}</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--clr-text); line-height:1.4;">${c.comment}</p>
        </div>
      `,
        )
        .join("");
    }

    if (State.currentUser) {
      commentForm.style.display = "flex";
      commentHint.style.display = "none";
    } else {
      commentForm.style.display = "none";
      commentHint.style.display = "block";
    }

    openModal("eventDetailsModal");
  } catch (err) {
    showToast("error", "Error loading details", err.message);
  }
}

/* ══════════════════════════════════════════════
   8. REGISTRATION & BOOKMARK HANDLERS
   ══════════════════════════════════════════════ */
async function handleRegisterClick(eventId) {
  if (!State.currentUser) {
    closeAllModals();
    showToast(
      "info",
      "Login required",
      "Please log in to register for events.",
    );
    openModal("loginModal");
    return;
  }

  if (State.currentUser.role !== "student") {
    showToast(
      "error",
      "Access denied",
      "Only students can register for events.",
    );
    return;
  }

  try {
    const res = await API.registerEvent(eventId);
    showToast(
      "success",
      "Registered!",
      "Your ticket has been sent to your email.",
    );

    // Refresh views dynamically across dashboards
    await syncAllData(eventId);
  } catch (err) {
    showToast("error", "Registration failed", err.message);
  }
}

async function handleUnregister(eventId) {
  if (!confirm("Are you sure you want to cancel your registration?")) return;
  try {
    await API.cancelRegistration(eventId);
    showToast("info", "Cancelled", "Your event booking has been cancelled.");

    // Refresh views dynamically across dashboards
    await syncAllData(eventId);
  } catch (err) {
    showToast("error", "Cancellation failed", err.message);
  }
}

async function handleBookmarkClick() {
  if (!State.viewingEventId) return;
  try {
    const res = await API.toggleBookmark(State.viewingEventId);
    showToast(
      "success",
      res.isBookmarked ? "Bookmarked!" : "Removed Bookmark",
      res.message,
    );
    openEventDetails(State.viewingEventId);
    if (State.activeStudentTab === "sdMyEvents") refreshStudentDashboard();
  } catch (err) {
    showToast("error", "Bookmark operation failed", err.message);
  }
}

async function handleCommentSubmit() {
  const input = document.getElementById("commentInput");
  const commentText = input.value.trim();
  if (!commentText || !State.viewingEventId) return;

  try {
    await API.addComment(State.viewingEventId, commentText);
    input.value = "";
    openEventDetails(State.viewingEventId);
  } catch (err) {
    showToast("error", "Failed to post comment", err.message);
  }
}

/* ══════════════════════════════════════════════
   9. STUDENT DASHBOARD
   ══════════════════════════════════════════════ */
async function refreshStudentDashboard() {
  if (!State.currentUser) return;
  const user = State.currentUser;

  // Header display
  document.getElementById("studentWelcome").textContent =
    `Welcome back, ${user.name.split(" ")[0]}!`;

  try {
    const res = await API.fetchMyRegistrations();
    const regEvents = res.registrations || [];

    // Calculate metrics
    const upcoming = regEvents.filter(
      (e) => getEventStatus(e.date) === "upcoming",
    ).length;
    const completed = regEvents.filter(
      (e) => getEventStatus(e.date) === "expired",
    ).length;
    const ongoing = regEvents.filter(
      (e) => getEventStatus(e.date) === "ongoing",
    ).length;

    document.getElementById("sdTotalReg").textContent = regEvents.length;
    document.getElementById("sdUpcoming").textContent = upcoming;
    document.getElementById("sdCompleted").textContent = completed;
    document.getElementById("sdOngoing").textContent = ongoing;

    // Render registered lists
    const miniList = document.getElementById("sdUpcomingList");
    const upcomingRegs = regEvents
      .filter(
        (e) =>
          getEventStatus(e.date) === "upcoming" ||
          getEventStatus(e.date) === "ongoing",
      )
      .slice(0, 5);

    if (upcomingRegs.length) {
      miniList.innerHTML = upcomingRegs
        .map(
          (ev) => `
        <div class="mini-event-card">
          <div class="mini-event-dot" style="background:${ev.color}"></div>
          <div class="mini-event-info" style="cursor:pointer;" onclick="openEventDetails('${ev.id}')">
            <div class="mini-event-name">${ev.name}</div>
            <div class="mini-event-meta">${formatDate(ev.date)} · ${ev.venue} · ${ev.department}</div>
          </div>
          <span class="tbl-badge ${getEventStatus(ev.date)}">${getEventStatus(ev.date)}</span>
        </div>
      `,
        )
        .join("");
    } else {
      miniList.innerHTML = `
        <div class="empty-state" style="padding:24px 0">
          <div class="empty-icon">📭</div>
          <p style="color:var(--clr-text-muted)">No upcoming registered events.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="navigateTo('publicView')">Browse Events</button>
        </div>
      `;
    }

    // Registered Events Table
    const tbody = document.getElementById("myEventsBody");
    const tableEmpty = document.getElementById("myEventsEmpty");

    if (!regEvents.length) {
      tbody.innerHTML = "";
      tableEmpty.style.display = "block";
    } else {
      tableEmpty.style.display = "none";
      tbody.innerHTML = regEvents
        .map((ev) => {
          const status = getEventStatus(ev.date);
          return `
          <tr>
            <td><strong>${ev.name}</strong></td>
            <td>${ev.department}</td>
            <td>${formatDate(ev.date)}</td>
            <td><span class="tbl-badge ${status}">${status}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="openEventDetails('${ev.id}')">View</button>
              ${ev.attended ? `<a href="${API.getCertificateUrl(ev.registration_id)}" target="_blank" class="btn btn-primary btn-sm" style="font-size:0.75rem; padding:4px 8px; margin-left:5px;">🎓 Cert</a>` : ""}
              ${status !== "expired" ? `<button class="btn btn-ghost btn-sm" style="color:var(--clr-red)" onclick="handleUnregister('${ev.id}')">Unregister</button>` : ""}
            </td>
          </tr>
        `;
        })
        .join("");
    }

    // Profile Details population
    document.getElementById("profileAvatarLg").textContent =
      user.name[0].toUpperCase();
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileNameInput").value = user.name;
    document.getElementById("profileEmailInput").value = user.email;
    document.getElementById("profileDeptInput").value = user.department || "";
    document.getElementById("profileYearInput").value = user.year || "1";
  } catch (err) {
    showToast("error", "Failed to refresh dashboard", err.message);
  }
}

/* ══════════════════════════════════════════════
   10. ADMIN DASHBOARD & ANALYTICS
   ══════════════════════════════════════════════ */
async function refreshAdminDashboard() {
  try {
    // 1. Fetch KPI Stats
    const statsRes = await API.fetchDashboardStats();
    const stats = statsRes.stats;

    document.getElementById("adTotalEvents").textContent = stats.totalEvents;
    document.getElementById("adUpcoming").textContent = stats.totalEvents; // mapped fallback
    document.getElementById("adTotalRegs").textContent =
      stats.totalRegistrations;
    document.getElementById("adActiveDepts").textContent = stats.activeDepts;

    // 2. Fetch Events for Admin table
    const eventsRes = await API.fetchEvents({});
    const events = eventsRes.events || [];

    // Fetch all registrations
    const regsRes = await API.fetchAllRegistrations();
    const registrations = regsRes.registrations || [];

    // Get unique departments
    const uniqueDepartments = Array.from(
      new Set(events.map((e) => e.department)),
    );

    // Fetch analytics data
    const analyticsRes = await API.fetchAnalytics();
    const analyticsData = analyticsRes.analytics;

    // Console logs required by Priority 5:
    console.log("EVENTS", events);
    console.log("REGISTRATIONS", registrations);
    console.log("DEPARTMENTS", uniqueDepartments);
    console.log("ANALYTICS_DATA", analyticsData);

    // Debug logs required by Priority 1:
    console.log("DEBUG: Total Events:", events.length);
    console.log("DEBUG: Unique Departments:", uniqueDepartments);
    const eventsPerDept = {};
    events.forEach((e) => {
      eventsPerDept[e.department] = (eventsPerDept[e.department] || 0) + 1;
    });
    console.log("DEBUG: Events per Department:", eventsPerDept);

    // Recent events table (Overview tab)
    const recentBody = document.getElementById("recentEventsBody");
    recentBody.innerHTML = events
      .slice(-6)
      .reverse()
      .map(
        (ev) => `
        <tr>
          <td><strong>${ev.name}</strong></td>
          <td>${ev.department}</td>
          <td>${formatDate(ev.date)}</td>
          <td><span class="tbl-badge ${getEventStatus(ev.date)}">${getEventStatus(ev.date)}</span></td>
          <td>${ev.registrations}</td>
        </tr>
      `,
      )
      .join("");

    // All events table (Events tab)
    const adminEventsBody = document.getElementById("adminEventsBody");
    const adminEventsEmpty = document.getElementById("adminEventsEmpty");

    if (!events.length) {
      adminEventsBody.innerHTML = "";
      adminEventsEmpty.style.display = "block";
    } else {
      adminEventsEmpty.style.display = "none";
      adminEventsBody.innerHTML = events
        .map(
          (ev) => `
        <tr>
          <td><strong>${ev.name}</strong></td>
          <td>${ev.department}</td>
          <td>${ev.category}</td>
          <td>${formatDate(ev.date)}</td>
          <td><span class="tbl-badge ${getEventStatus(ev.date)}">${getEventStatus(ev.date)}</span></td>
          <td>${ev.registrations}/${ev.capacity}</td>
          <td>
            <button class="table-action-btn edit" title="Edit" onclick="openEditEventModal('${ev.id}')">✏️ Edit</button>
            <button class="table-action-btn del" title="Delete" onclick="openDeleteModal('${ev.id}')">🗑️ Del</button>
            <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size:0.75rem;" onclick="openAttendanceManager('${ev.id}', '${ev.name.replace(/'/g, "\\'")}')">👥 Roll</button>
          </td>
        </tr>
      `,
        )
        .join("");
    }

    // Refresh registrations tab table
    await refreshAdminRegistrations();

    // 3. Fetch analytics & render charts
    await renderAnalytics();
  } catch (err) {
    showToast("error", "Error loading admin details", err.message);
  }
}

async function refreshAdminRegistrations() {
  try {
    const res = await API.fetchAllRegistrations();
    const registrations = res.registrations || [];
    const tbody = document.getElementById("adminRegsBody");
    const empty = document.getElementById("adminRegsEmpty");

    if (registrations.length === 0) {
      tbody.innerHTML = "";
      empty.style.display = "block";
    } else {
      empty.style.display = "none";
      tbody.innerHTML = registrations
        .map(
          (r) => `
        <tr>
          <td><strong>${r.studentName}</strong></td>
          <td>${r.email}</td>
          <td>${r.eventTitle}</td>
          <td>${r.department || "—"}</td>
          <td>${formatDate(r.registeredOn)}</td>
          <td><span class="tbl-badge ${r.status === "Attended" ? "ongoing" : "upcoming"}">${r.status}</span></td>
        </tr>
      `,
        )
        .join("");
    }
  } catch (err) {
    showToast("error", "Error loading registrations", err.message);
  }
}

async function renderAnalytics() {
  try {
    const res = await API.fetchAnalytics();
    const ana = res.analytics;

    // Calculated metrics
    // Calculate average registrations
    const totalEvents =
      parseInt(document.getElementById("adTotalEvents").textContent) || 0;
    const totalRegs =
      parseInt(document.getElementById("adTotalRegs").textContent) || 0;
    const avgReg = totalEvents ? Math.round(totalRegs / totalEvents) : 0;
    document.getElementById("anAvgReg").textContent = avgReg;

    // Find top category
    const cats = Object.entries(ana.registrationsByCategory);
    const topCat = cats.sort((a, b) => b[1] - a[1])[0];
    document.getElementById("anTopCat").textContent = topCat ? topCat[0] : "—";

    // Department Chart
    renderBarChart(
      "deptChart",
      ana.registrationsByDepartment,
      "var(--clr-purple)",
    );

    // Event Popularity Chart
    renderBarChart("regsChart", ana.topEvents, "var(--clr-blue)");
  } catch (err) {
    console.error("Analytics load error:", err);
  }
}

function renderBarChart(containerId, dataObj, color) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((e) => e[1]), 1);
  el.innerHTML = entries
    .map(
      ([label, val]) => `
    <div class="chart-bar-row">
      <span class="chart-bar-label" title="${label}">${label}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${((val / max) * 100).toFixed(1)}%;background:${color}"></div>
      </div>
      <span class="chart-bar-val">${val}</span>
    </div>`,
    )
    .join("");
}

/* ══════════════════════════════════════════════
   11. ATTENDANCE ROLL MANAGER (Modal addition)
   ══════════════════════════════════════════════ */
// Create dynamic element inside script for managing event registers on the fly
let activeAttendanceEventId = null;

async function openAttendanceManager(eventId, eventName) {
  activeAttendanceEventId = eventId;

  // Try to find if an attendance modal exists, if not, create one dynamically
  let modal = document.getElementById("attendanceManagerModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "attendanceManagerModal";
    modal.innerHTML = `
      <div class="modal glass large">
        <button class="modal-close" onclick="closeModal('attendanceManagerModal')">✕</button>
        <h2 id="atmEventName">Event Registrations & Attendance</h2>
        <p class="modal-sub">Mark check-in check-boxes to validate ticket admission.</p>
        <div class="table-wrap glass" style="max-height: 350px; overflow-y: auto; margin-top: 16px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department</th>
                <th>Ticket Code</th>
                <th>Registered On</th>
                <th>Attended</th>
              </tr>
            </thead>
            <tbody id="atmStudentBody"></tbody>
          </table>
          <div class="table-empty" id="atmEmpty" style="display:none; padding: 20px;">
            <p>No student has registered for this event yet.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById("atmEventName").textContent =
    `Roll Call: ${eventName}`;
  const tbody = document.getElementById("atmStudentBody");
  const empty = document.getElementById("atmEmpty");

  try {
    const res = await API.fetchEventRegistrations(eventId);
    const regs = res.registrations || [];

    if (regs.length === 0) {
      tbody.innerHTML = "";
      empty.style.display = "block";
    } else {
      empty.style.display = "none";
      tbody.innerHTML = regs
        .map(
          (r) => `
        <tr>
          <td><strong>${r.studentName}</strong><br/><small style="color:var(--clr-text-muted)">${r.email}</small></td>
          <td>${r.department} (Yr ${r.year})</td>
          <td style="font-family:monospace; font-weight:bold;">${r.ticketCode}</td>
          <td>${formatDate(r.registeredOn)}</td>
          <td>
            <input type="checkbox" style="width:18px; height:18px; cursor:pointer;" 
                   ${r.attended ? "checked" : ""} 
                   onclick="toggleAttendance('${r.id}', this.checked)" />
          </td>
        </tr>
      `,
        )
        .join("");
    }

    openModal("attendanceManagerModal");
  } catch (err) {
    showToast("error", "Failed to fetch registrations", err.message);
  }
}

async function toggleAttendance(registrationId, checked) {
  try {
    await API.markAttendance(registrationId, checked);
    showToast("success", "Status updated", `Student attendance marked.`);

    // Refresh all lists and dashboards dynamically
    await syncAllData();
  } catch (err) {
    showToast("error", "Failed to update attendance", err.message);
  }
}

window.openAttendanceManager = openAttendanceManager;
window.toggleAttendance = toggleAttendance;

/* ══════════════════════════════════════════════
   12. CREATE / EDIT / DELETE EVENT MODALS
   ══════════════════════════════════════════════ */
function populateEventForm() {
  const deptSel = document.getElementById("efDept");
  const catSel = document.getElementById("efCat");
  deptSel.innerHTML = DEPARTMENTS.map(
    (d) => `<option value="${d}">${d}</option>`,
  ).join("");
  catSel.innerHTML = CATEGORIES.map(
    (c) => `<option value="${c}">${c}</option>`,
  ).join("");
}

function openCreateEventModal() {
  if (!State.currentUser || State.currentUser.role !== "admin") {
    showToast("error", "Access denied", "Admin privileges required.");
    return;
  }
  populateEventForm();
  document.getElementById("eventFormTitle").textContent = "Create Event";
  document.getElementById("eventFormSubmit").textContent = "Create Event";
  document.getElementById("editingEventId").value = "";
  // clear fields
  ["efName", "efDesc", "efOrganizer", "efVenue", "efCapacity"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("efDate").value = "";
  document.getElementById("efTime").value = "";
  document.getElementById("efColor").value = "#a855f7";
  openModal("eventFormModal");
}

async function openEditEventModal(eventId) {
  if (!State.currentUser || State.currentUser.role !== "admin") {
    showToast("error", "Access denied", "Admin privileges required.");
    return;
  }
  try {
    const res = await API.fetchEventById(eventId);
    const ev = res.event;
    if (!ev) return;

    populateEventForm();
    document.getElementById("eventFormTitle").textContent = "Edit Event";
    document.getElementById("eventFormSubmit").textContent = "Save Changes";
    document.getElementById("editingEventId").value = eventId;

    document.getElementById("efName").value = ev.name;
    document.getElementById("efDesc").value = ev.description;
    document.getElementById("efDept").value = ev.department;
    document.getElementById("efCat").value = ev.category;
    document.getElementById("efOrganizer").value = ev.organizer;
    document.getElementById("efDate").value = ev.date;
    document.getElementById("efTime").value = ev.time;
    document.getElementById("efVenue").value = ev.venue;
    document.getElementById("efCapacity").value = ev.capacity;
    document.getElementById("efColor").value = ev.color;

    openModal("eventFormModal");
  } catch (err) {
    showToast("error", "Failed to retrieve event", err.message);
  }
}

async function handleEventFormSubmit() {
  const id = document.getElementById("editingEventId").value;
  const name = document.getElementById("efName").value.trim();
  const desc = document.getElementById("efDesc").value.trim();
  const dept = document.getElementById("efDept").value;
  const cat = document.getElementById("efCat").value;
  const org = document.getElementById("efOrganizer").value.trim();
  const date = document.getElementById("efDate").value;
  const time = document.getElementById("efTime").value;
  const venue = document.getElementById("efVenue").value.trim();
  const cap = parseInt(document.getElementById("efCapacity").value) || 100;
  const color = document.getElementById("efColor").value;

  if (!name || !desc || !dept || !cat || !date || !time || !venue) {
    showToast("error", "Missing fields", "Please fill in all required fields.");
    return;
  }

  const eventData = {
    name,
    description: desc,
    department: dept,
    category: cat,
    organizer: org || "Admin",
    date,
    time,
    venue,
    capacity: cap,
    color,
  };

  try {
    if (id) {
      await API.updateEvent(id, eventData);
      showToast("success", "Event updated", `"${name}" has been updated.`);
    } else {
      await API.createEvent(eventData);
      showToast("success", "Event created!", `"${name}" is now live.`);
    }

    closeModal("eventFormModal");
    await syncAllData();
  } catch (err) {
    showToast("error", "Operation failed", err.message);
  }
}

async function openDeleteModal(eventId) {
  State.pendingDeleteId = eventId;
  try {
    const res = await API.fetchEventById(eventId);
    const ev = res.event;
    if (!ev) return;
    document.getElementById("deleteEventName").textContent =
      `Are you sure you want to delete "${ev.name}"? This action cannot be undone.`;
    openModal("deleteModal");
  } catch (e) {
    showToast("error", "Error fetching event for deletion");
  }
}

async function confirmDelete() {
  if (!State.pendingDeleteId) return;
  try {
    await API.deleteEvent(State.pendingDeleteId);
    showToast(
      "success",
      "Event deleted",
      "The event has been successfully removed.",
    );
    State.pendingDeleteId = null;
    closeModal("deleteModal");
    await syncAllData();
  } catch (err) {
    showToast("error", "Deletion failed", err.message);
  }
}

/* ══════════════════════════════════════════════
   13. AUTH ACTION HANDLERS
   ══════════════════════════════════════════════ */
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;

  if (!email || !pass) {
    showToast(
      "error",
      "Missing fields",
      "Please enter your email and password.",
    );
    return;
  }

  try {
    const res = await API.login(email, pass);
    State.currentUser = res.user;

    closeModal("loginModal");
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";

    showToast(
      "success",
      `Welcome back, ${res.user.name.split(" ")[0]}!`,
      "Login successful.",
    );
    updateNavForUser(res.user);

    if (res.user.role === "admin") {
      navigateTo("adminDashboard");
    } else {
      navigateTo("studentDashboard");
    }
  } catch (err) {
    showToast("error", "Login failed", err.message);
  }
}

async function handleSignup() {
  const firstName = document.getElementById("signupFirst").value.trim();
  const lastName = document.getElementById("signupLast").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const dept = document.getElementById("signupDept").value;
  const pass = document.getElementById("signupPass").value;
  const confirm = document.getElementById("signupConfirm").value;

  if (!firstName || !lastName || !email || !dept || !pass) {
    showToast("error", "Missing fields", "Please fill in all required fields.");
    return;
  }
  if (pass !== confirm) {
    showToast("error", "Password mismatch", "Passwords do not match.");
    return;
  }

  try {
    const res = await API.signup({
      firstName,
      lastName,
      email,
      password: pass,
      dept,
    });
    State.currentUser = res.user;

    closeModal("signupModal");
    [
      "signupFirst",
      "signupLast",
      "signupEmail",
      "signupPass",
      "signupConfirm",
    ].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("signupDept").value = "";

    showToast(
      "success",
      "Account created!",
      `Welcome to CampusPulse, ${res.user.name.split(" ")[0]}!`,
    );
    updateNavForUser(res.user);
    navigateTo("studentDashboard");
  } catch (err) {
    showToast("error", "Signup failed", err.message);
  }
}

async function handleForgot() {
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) {
    showToast("error", "Enter email", "Please enter your email address.");
    return;
  }

  try {
    const res = await API.forgotPassword(email);
    closeModal("forgotModal");
    document.getElementById("forgotEmail").value = "";
    showToast(
      "success",
      "Reset link processed",
      "If the email is registered, a password reset link has been dispatched.",
    );
  } catch (err) {
    showToast("error", "Failed reset", err.message);
  }
}

async function logout() {
  try {
    await API.logout();
    State.currentUser = null;
    updateNavForUser(null);
    navigateTo("publicView");
    showToast("info", "Logged out", "See you next time!");
  } catch (err) {
    showToast("error", "Logout failed", err.message);
  }
}

function updateNavForUser(user) {
  const guestEl = document.getElementById("guestActions");
  const userEl = document.getElementById("userActions");
  const navStudent = document.getElementById("navStudent");
  const navAdmin = document.getElementById("navAdmin");
  const ddAdmin = document.getElementById("ddAdmin");
  const ddStudent = document.getElementById("ddStudent");

  if (user) {
    guestEl.style.display = "none";
    userEl.style.display = "flex";
    document.getElementById("userNameDisplay").textContent =
      user.name.split(" ")[0];
    document.getElementById("userAvatar").textContent =
      user.name[0].toUpperCase();

    if (user.role === "admin") {
      navAdmin.style.display = "block";
      navStudent.style.display = "none";
      ddAdmin.style.display = "block";
      ddStudent.style.display = "none";
    } else {
      navStudent.style.display = "block";
      navAdmin.style.display = "none";
      ddAdmin.style.display = "none";
      ddStudent.style.display = "block";
    }
  } else {
    guestEl.style.display = "flex";
    userEl.style.display = "none";
    navStudent.style.display = "none";
    navAdmin.style.display = "none";
  }
}

/* ══════════════════════════════════════════════
   14. FILTER POPULATION
   ══════════════════════════════════════════════ */
function populateFilters() {
  const deptSel = document.getElementById("deptFilter");
  deptSel.innerHTML =
    `<option value="">All Departments</option>` +
    DEPARTMENTS.map((d) => `<option value="${d}">${d}</option>`).join("");

  const catSel = document.getElementById("catFilter");
  catSel.innerHTML =
    `<option value="">All Categories</option>` +
    CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");

  const signupDept = document.getElementById("signupDept");
  signupDept.innerHTML =
    `<option value="">Select Department</option>` +
    DEPARTMENTS.map((d) => `<option value="${d}">${d}</option>`).join("");
}

/* ══════════════════════════════════════════════
   15. SIDEBAR TAB BINDINGS
   ══════════════════════════════════════════════ */
function activateDashTab(containerId, tabId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll(".dash-tab").forEach((t) => {
    t.style.display = "none";
    t.classList.remove("active");
  });
  const target = document.getElementById(tabId);
  if (target) {
    target.style.display = "block";
    target.classList.add("active");
  }
}

async function syncAllData(eventId = null) {
  // Clear any potential stale state if needed

  // Refresh event list (public view)
  await renderPublicEvents();

  // Refresh student dashboard if logged in as student
  if (State.currentUser && State.currentUser.role === "student") {
    await refreshStudentDashboard();
  }

  // Refresh admin dashboard if logged in as admin
  if (State.currentUser && State.currentUser.role === "admin") {
    await refreshAdminDashboard();
  }

  // Refresh the specific event details modal if currently open
  if (eventId && State.viewingEventId === eventId) {
    await openEventDetails(eventId);
  }
}

function bindSidebarLinks(sidebarId, dashId, stateKey) {
  const sidebar = document.getElementById(sidebarId);
  if (!sidebar) return;
  sidebar.querySelectorAll(".sidebar-link[data-tab]").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      sidebar
        .querySelectorAll(".sidebar-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      State[stateKey] = link.dataset.tab;
      activateDashTab(dashId, link.dataset.tab);

      if (dashId === "adminDashboard") {
        await refreshAdminDashboard();
      } else if (dashId === "studentDashboard") {
        await refreshStudentDashboard();
      }
    });
  });
}

/* ══════════════════════════════════════════════
   16. THEME TOGGLER (Bonus Feature)
   ══════════════════════════════════════════════ */
function initTheme() {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (!themeToggleBtn) return;

  const isLight = localStorage.getItem("cp_light_theme") === "true";
  if (isLight) {
    document.body.classList.add("light-theme");
    themeToggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("light-theme");
    themeToggleBtn.textContent = "🌙";
  }

  themeToggleBtn.addEventListener("click", () => {
    const lightActive = document.body.classList.toggle("light-theme");
    localStorage.setItem("cp_light_theme", lightActive);
    themeToggleBtn.textContent = lightActive ? "☀️" : "🌙";
    showToast(
      "info",
      "Theme Switched",
      lightActive ? "Light theme activated." : "Dark theme activated.",
    );
  });
}

/* ══════════════════════════════════════════════
   17. GLOBAL EVENT BINDINGS
   ══════════════════════════════════════════════ */
function bindAll() {
  document.getElementById("navBrand").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("publicView");
  });

  /* ── Footer Platform info links ── */
  document.getElementById("footerBrowse").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("publicView");
    document
      .getElementById("eventsSection")
      .scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("footerDepts").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("publicView");
    document
      .getElementById("eventsSection")
      .scrollIntoView({ behavior: "smooth" });
    document.getElementById("deptFilter").focus();
  });
  document.getElementById("footerCalendar").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("publicView");
    document
      .getElementById("eventsSection")
      .scrollIntoView({ behavior: "smooth" });
    showToast(
      "info",
      "Calendar",
      "Browse scheduled events datewise in index lists.",
    );
  });
  document.getElementById("footerAbout").addEventListener("click", (e) => {
    e.preventDefault();
    showToast(
      "info",
      "About CampusPulse",
      "CampusPulse is a college event management platform where students discover and register for workshops, hackathons, and seminars.",
    );
  });
  document.getElementById("footerPrivacy").addEventListener("click", (e) => {
    e.preventDefault();
    showToast(
      "info",
      "Privacy Policy",
      "All transaction data is protected on our local secure relational database server.",
    );
  });
  document.getElementById("footerContact").addEventListener("click", (e) => {
    e.preventDefault();
    showToast(
      "info",
      "Contact support",
      "Reach support at campuspulseevents@gmail.com for any queries or issues.",
    );
  });

  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const v = el.dataset.view;
      if (
        v === "studentDashboard" &&
        (!State.currentUser || State.currentUser.role !== "student")
      ) {
        showToast("info", "Login required", "Please log in as a student.");
        openModal("loginModal");
        return;
      }
      if (
        v === "adminDashboard" &&
        (!State.currentUser || State.currentUser.role !== "admin")
      ) {
        showToast("info", "Login required", "Please log in as admin.");
        openModal("loginModal");
        return;
      }
      navigateTo(v);
    });
  });

  document.getElementById("navHamburger").addEventListener("click", () => {
    document.getElementById("navLinks").classList.toggle("open");
  });

  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
  document
    .getElementById("studentLogout")
    .addEventListener("click", () => logout());
  document
    .getElementById("adminLogout")
    .addEventListener("click", () => logout());

  document.getElementById("userChip").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("userChip").classList.toggle("open");
  });
  document.addEventListener("click", () => {
    document.getElementById("userChip").classList.remove("open");
  });

  /* ── Search inputs ── */
  const heroSearch = document.getElementById("heroSearch");
  heroSearch.addEventListener(
    "input",
    debounce(() => {
      State.searchQuery = heroSearch.value.trim();
      renderPublicEvents();
    }, 350),
  );

  document.getElementById("heroSearchBtn").addEventListener("click", () => {
    State.searchQuery = heroSearch.value.trim();
    renderPublicEvents();
    document
      .getElementById("eventsSection")
      .scrollIntoView({ behavior: "smooth" });
  });

  heroSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("heroSearchBtn").click();
  });

  document.getElementById("deptFilter").addEventListener("change", (e) => {
    State.filterDept = e.target.value;
    renderPublicEvents();
  });
  document.getElementById("catFilter").addEventListener("change", (e) => {
    State.filterCat = e.target.value;
    renderPublicEvents();
  });
  document.getElementById("statusFilter").addEventListener("change", (e) => {
    State.filterStatus = e.target.value;
    renderPublicEvents();
  });

  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    State.searchQuery = "";
    State.filterDept = "";
    State.filterCat = "";
    State.filterStatus = "";
    document.getElementById("heroSearch").value = "";
    document.getElementById("deptFilter").value = "";
    document.getElementById("catFilter").value = "";
    document.getElementById("statusFilter").value = "";
    renderPublicEvents();
  });

  document.getElementById("emptyResetBtn").addEventListener("click", () => {
    document.getElementById("clearFiltersBtn").click();
  });

  document.getElementById("gridViewBtn").addEventListener("click", () => {
    State.listView = false;
    document.getElementById("gridViewBtn").classList.add("active");
    document.getElementById("listViewBtn").classList.remove("active");
    renderPublicEvents();
  });
  document.getElementById("listViewBtn").addEventListener("click", () => {
    State.listView = true;
    document.getElementById("listViewBtn").classList.add("active");
    document.getElementById("gridViewBtn").classList.remove("active");
    renderPublicEvents();
  });

  /* ── Auth Forms triggers ── */
  document
    .getElementById("openLoginBtn")
    .addEventListener("click", () => openModal("loginModal"));
  document
    .getElementById("openSignupBtn")
    .addEventListener("click", () => openModal("signupModal"));

  document.getElementById("switchToSignup").addEventListener("click", (e) => {
    e.preventDefault();
    closeModal("loginModal");
    openModal("signupModal");
  });
  document.getElementById("switchToLogin").addEventListener("click", (e) => {
    e.preventDefault();
    closeModal("signupModal");
    openModal("loginModal");
  });
  document.getElementById("openForgotBtn").addEventListener("click", (e) => {
    e.preventDefault();
    closeModal("loginModal");
    openModal("forgotModal");
  });
  document.getElementById("backToLogin").addEventListener("click", (e) => {
    e.preventDefault();
    closeModal("forgotModal");
    openModal("loginModal");
  });

  document
    .getElementById("loginSubmitBtn")
    .addEventListener("click", handleLogin);
  document
    .getElementById("signupSubmitBtn")
    .addEventListener("click", handleSignup);
  document
    .getElementById("forgotSubmitBtn")
    .addEventListener("click", handleForgot);

  document.getElementById("loginPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  document.getElementById("signupConfirm").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSignup();
  });
  document.getElementById("forgotEmail").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleForgot();
  });

  // Modal dismissal click listeners
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });

  /* ── Comments & Bookmarks handlers inside Event Details ── */
  document
    .getElementById("modalBookmarkBtn")
    .addEventListener("click", handleBookmarkClick);
  document
    .getElementById("submitCommentBtn")
    .addEventListener("click", handleCommentSubmit);
  document.getElementById("commentInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleCommentSubmit();
  });
  document.getElementById("commentLoginLink").addEventListener("click", (e) => {
    e.preventDefault();
    closeModal("eventDetailsModal");
    openModal("loginModal");
  });

  /* ── Admin triggers ── */
  document
    .getElementById("createEventBtn")
    .addEventListener("click", openCreateEventModal);
  document
    .getElementById("createEventBtn2")
    .addEventListener("click", openCreateEventModal);
  document
    .getElementById("eventFormSubmit")
    .addEventListener("click", handleEventFormSubmit);
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", confirmDelete);

  /* ── Sidebars tab links init ── */
  bindSidebarLinks("studentSidebar", "studentDashboard", "activeStudentTab");
  document
    .getElementById("studentSidebarToggle")
    .addEventListener("click", () => {
      document.getElementById("studentSidebar").classList.toggle("open");
    });

  bindSidebarLinks("adminSidebar", "adminDashboard", "activeAdminTab");
  document
    .getElementById("adminSidebarToggle")
    .addEventListener("click", () => {
      document.getElementById("adminSidebar").classList.toggle("open");
    });

  /* ── Profile Update Save ── */
  document
    .getElementById("saveProfileBtn")
    .addEventListener("click", async () => {
      if (!State.currentUser) return;
      const name = document.getElementById("profileNameInput").value.trim();
      const dept = document.getElementById("profileDeptInput").value.trim();
      const year = document.getElementById("profileYearInput").value;

      if (!name) {
        showToast("error", "Name required", "Please enter your name.");
        return;
      }

      try {
        const res = await API.updateProfile({ name, dept, year });
        State.currentUser = res.user;

        updateNavForUser(State.currentUser);
        refreshStudentDashboard();
        showToast("success", "Saved", "Profile details updated.");
      } catch (err) {
        showToast("error", "Update failed", err.message);
      }
    });

  window.addEventListener("scroll", () => {
    document
      .getElementById("navbar")
      .classList.toggle("scrolled", window.scrollY > 20);
  });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ══════════════════════════════════════════════
   18. BOOT & SESSION RESTORATION
   ══════════════════════════════════════════════ */
async function init() {
  // Theme check
  initTheme();

  // Try to restore user session from API if token exists
  const token = localStorage.getItem("cp_jwt_token");
  if (token) {
    try {
      const res = await API.getMe();
      State.currentUser = res.user;
      updateNavForUser(res.user);
    } catch (err) {
      console.warn("Session restore failed, clearing token...", err.message);
      localStorage.removeItem("cp_jwt_token");
      localStorage.removeItem("cp_current_user");
    }
  }

  // Populate filters
  populateFilters();

  // Bind event listeners
  bindAll();

  // Trigger main public event page render
  renderPublicEvents();

  // Hide loader spinner
  setTimeout(() => {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.classList.add("hidden");
      setTimeout(() => spinner.remove(), 500);
    }
  }, 400);

  console.log(`✅ CampusPulse v${APP_VERSION} initialized.`);
}

document.addEventListener("DOMContentLoaded", init);

// Expose handlers to window for inline onclick template handlers
window.openEventDetails = openEventDetails;
window.handleUnregister = handleUnregister;
window.openEditEventModal = openEditEventModal;
window.openDeleteModal = openDeleteModal;
