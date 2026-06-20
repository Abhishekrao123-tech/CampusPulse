/* ═══════════════════════════════════════════════
   CAMPUSPULSE — services/api.js
   Fetch client wrapping backend Express API
   Handles authentication token headers and mappings.
   ═══════════════════════════════════════════════ */

"use strict";

const BACKEND_URL =
  localStorage.getItem("cp_backend_url") ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5050"
    : "https://campuspulse-production-e334.up.railway.app");

const BASE_URL = `${BACKEND_URL}/api`;

// Helper to construct headers with JWT
function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("cp_jwt_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle Fetch responses
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || "Something went wrong";
    throw new Error(errorMsg);
  }
  return data;
}

// Global API object exposed to window
window.API = {
  getBackendUrl() {
    return BACKEND_URL;
  },

  // ── AUTHENTICATION ──
  async login(email, password) {
    const data = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    }).then(handleResponse);

    if (data.success && data.token) {
      localStorage.setItem("cp_jwt_token", data.token);
      localStorage.setItem("cp_current_user", JSON.stringify(data.user));
    }
    return data;
  },

  async signup(userData) {
    const data = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        password: userData.password,
        department: userData.dept,
        year: userData.year || "1",
      }),
    }).then(handleResponse);

    if (data.success && data.token) {
      localStorage.setItem("cp_jwt_token", data.token);
      localStorage.setItem("cp_current_user", JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: getHeaders(),
      }).then(handleResponse);
    } catch (e) {
      // Proceed even if backend logout fails
    }
    localStorage.removeItem("cp_jwt_token");
    localStorage.removeItem("cp_current_user");
    return { success: true };
  },

  async getMe() {
    return fetch(`${BASE_URL}/auth/me`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async updateProfile(profileData) {
    const data = await fetch(`${BASE_URL}/auth/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        name: profileData.name,
        department: profileData.dept,
        year: profileData.year,
      }),
    }).then(handleResponse);

    if (data.success && data.user) {
      localStorage.setItem("cp_current_user", JSON.stringify(data.user));
    }
    return data;
  },

  async forgotPassword(email) {
    return fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    }).then(handleResponse);
  },

  async resetPassword(email, token, newPassword) {
    return fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, token, newPassword }),
    }).then(handleResponse);
  },

  // ── EVENTS ──
  async fetchEvents(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.department)
      queryParams.append("department", filters.department);
    if (filters.category) queryParams.append("category", filters.category);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.sort) queryParams.append("sort", filters.sort);

    return fetch(`${BASE_URL}/events?${queryParams.toString()}`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async fetchEventById(id) {
    return fetch(`${BASE_URL}/events/${id}`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async createEvent(eventData) {
    return fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    }).then(handleResponse);
  },

  async updateEvent(id, eventData) {
    return fetch(`${BASE_URL}/events/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    }).then(handleResponse);
  },

  async deleteEvent(id) {
    return fetch(`${BASE_URL}/events/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async approveEvent(id, status) {
    return fetch(`${BASE_URL}/events/${id}/approve`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status }), // approved / rejected
    }).then(handleResponse);
  },

  // ── BOOKMARKS ──
  async toggleBookmark(eventId) {
    return fetch(`${BASE_URL}/events/${eventId}/bookmark`, {
      method: "POST",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async fetchMyBookmarks() {
    return fetch(`${BASE_URL}/events/bookmarks/my`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // ── COMMENTS ──
  async addComment(eventId, commentText) {
    return fetch(`${BASE_URL}/events/${eventId}/comments`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ comment: commentText }),
    }).then(handleResponse);
  },

  // ── REGISTRATIONS & ATTENDANCE ──
  async registerEvent(eventId) {
    return fetch(`${BASE_URL}/registrations`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ eventId }),
    }).then(handleResponse);
  },

  async cancelRegistration(eventId) {
    return fetch(`${BASE_URL}/registrations/${eventId}`, {
      method: "DELETE",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async fetchMyRegistrations() {
    return fetch(`${BASE_URL}/registrations/my`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async fetchAllRegistrations() {
    return fetch(`${BASE_URL}/registrations`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async fetchEventRegistrations(eventId) {
    return fetch(`${BASE_URL}/registrations/event/${eventId}`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async markAttendance(registrationId, attended) {
    return fetch(`${BASE_URL}/registrations/${registrationId}/attendance`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ attended }),
    }).then(handleResponse);
  },

  getCertificateUrl(registrationId) {
    return `${BASE_URL}/registrations/${registrationId}/certificate`;
  },

  // ── NOTIFICATIONS ──
  async fetchNotifications() {
    return fetch(`${BASE_URL}/notifications`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async markNotificationAsRead(id) {
    return fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: "PUT",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // ── ADMIN STATS ──
  async fetchDashboardStats() {
    return fetch(`${BASE_URL}/admin/dashboard`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  async fetchAnalytics() {
    return fetch(`${BASE_URL}/admin/analytics`, {
      method: "GET",
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // ── FILE UPLOADS (using multipart/form-data) ──
  async uploadEventBanner(file) {
    const formData = new FormData();
    formData.append("banner", file);

    const token = localStorage.getItem("cp_jwt_token");
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/upload/event-banner`, {
      method: "POST",
      headers: headers,
      body: formData,
    });
    return handleResponse(response);
  },

  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append("avatar", file);

    const token = localStorage.getItem("cp_jwt_token");
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/upload/profile`, {
      method: "POST",
      headers: headers,
      body: formData,
    });
    return handleResponse(response);
  },
};
