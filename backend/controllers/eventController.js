const pool = require("../config/db");
const emailService = require("../services/emailService");
const qr = require("qrcode");

// @desc    Get all events (with filters, sorting, search, pagination)
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  const {
    search,
    department,
    category,
    status,
    sort,
    page = 1,
    limit = 100,
  } = req.query;

  try {
    let sql = `
      SELECT e.*, 
             COALESCE(COUNT(r.id), 0) AS registrations
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
    `;

    const conditions = [];
    const params = [];

    // Search query
    if (search) {
      conditions.push(
        "(e.title LIKE ? OR e.description LIKE ? OR e.organizer LIKE ? OR e.venue LIKE ?)",
      );
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard, wildcard);
    }

    // Filters
    if (department) {
      conditions.push("e.department = ?");
      params.push(department);
    }
    if (category) {
      conditions.push("e.category = ?");
      params.push(category);
    }
    if (status) {
      // Direct filter if status specified (upcoming, ongoing, expired)
      const todayStr = new Date().toISOString().split("T")[0];
      if (status === "upcoming") {
        conditions.push("e.event_date > ?");
        params.push(todayStr);
      } else if (status === "ongoing") {
        conditions.push("e.event_date = ?");
        params.push(todayStr);
      } else if (status === "expired") {
        conditions.push("e.event_date < ?");
        params.push(todayStr);
      }
    }

    // Role check: Students should only see 'approved' events (Event Approval Workflow)
    // Admins can see all event statuses (pending/approved/rejected)
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    if (authHeader && authHeader.startsWith("Bearer")) {
      try {
        const token = authHeader.split(" ")[1];
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "campuspulse_super_secret_key_123!",
        );
        const [users] = await pool.execute(
          "SELECT role FROM users WHERE id = ?",
          [decoded.id],
        );
        if (users.length > 0 && users[0].role === "admin") {
          isAdmin = true;
        }
      } catch (e) {
        // Ignore parsing error, treat as student/guest
      }
    }

    if (!isAdmin) {
      conditions.push("e.status = 'approved'");
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " GROUP BY e.id";

    // Sorting
    let orderBy = "e.event_date ASC"; // default sorting
    if (sort) {
      if (sort === "date_desc") orderBy = "e.event_date DESC";
      if (sort === "popularity") orderBy = "registrations DESC";
      if (sort === "created") orderBy = "e.created_at DESC";
      if (sort === "capacity") orderBy = "e.capacity DESC";
    }
    sql += ` ORDER BY ${orderBy}`;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const [rows] = await pool.execute(sql, params);

    // Map rows to match frontend properties (e.g. title -> name, event_date -> date, event_time -> time)
    const formattedEvents = rows.map((e) => ({
      id: String(e.id),
      name: e.title,
      description: e.description,
      department: e.department,
      category: e.category,
      organizer: e.organizer,
      venue: e.venue,
      date: e.event_date
        ? new Date(e.event_date).toISOString().split("T")[0]
        : "",
      time: e.event_time ? e.event_time.slice(0, 5) : "12:00",
      capacity: e.capacity,
      banner_image: e.banner_image,
      color: e.color,
      status: e.status,
      registrations: parseInt(e.registrations) || 0,
    }));

    res.status(200).json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents,
    });
  } catch (err) {
    console.error("Get Events Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during event list retrieval",
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  const eventId = req.params.id;

  try {
    // 1. Fetch Event with registration count
    const [events] = await pool.execute(
      `
      SELECT e.*, 
             COALESCE((SELECT COUNT(*) FROM registrations WHERE event_id = e.id), 0) AS registrations
      FROM events e
      WHERE e.id = ?
    `,
      [eventId],
    );

    if (events.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const event = events[0];

    // 2. Fetch Comments
    const [comments] = await pool.execute(
      `
      SELECT ec.id, ec.comment, ec.created_at, u.name as user_name, u.role as user_role, u.profile_image
      FROM event_comments ec
      JOIN users u ON ec.user_id = u.id
      WHERE ec.event_id = ?
      ORDER BY ec.created_at DESC
    `,
      [eventId],
    );

    // 3. Fetch check-in/registration status of the requester
    let isRegistered = false;
    let isBookmarked = false;
    let registrationId = null;
    let attended = false;
    let ticketCode = null;
    let qrCodeBase64 = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      try {
        const token = authHeader.split(" ")[1];
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "campuspulse_super_secret_key_123!",
        );

        // check registration
        const [regs] = await pool.execute(
          "SELECT id, attended, ticket_code FROM registrations WHERE user_id = ? AND event_id = ?",
          [decoded.id, eventId],
        );
        if (regs.length > 0) {
          isRegistered = true;
          registrationId = regs[0].id;
          attended = regs[0].attended === 1;
          ticketCode = regs[0].ticket_code;

          try {
            const qrPayload = JSON.stringify({
              ticketId: regs[0].id,
              eventId: event.id,
              studentId: decoded.id,
              eventName: event.title
            });
            qrCodeBase64 = await qr.toDataURL(qrPayload);
          } catch (qrErr) {
            console.error("QR Code generation failed in getEventById:", qrErr);
          }
        }

        // check bookmark
        const [bkmarks] = await pool.execute(
          "SELECT id FROM bookmarks WHERE user_id = ? AND event_id = ?",
          [decoded.id, eventId],
        );
        isBookmarked = bkmarks.length > 0;
      } catch (e) {
        // Ignore token errors
      }
    }

    // Map keys to frontend format
    const formattedEvent = {
      id: String(event.id),
      name: event.title,
      description: event.description,
      department: event.department,
      category: event.category,
      organizer: event.organizer,
      venue: event.venue,
      date: event.event_date
        ? new Date(event.event_date).toISOString().split("T")[0]
        : "",
      time: event.event_time ? event.event_time.slice(0, 5) : "12:00",
      capacity: event.capacity,
      banner_image: event.banner_image,
      color: event.color,
      status: event.status,
      registrations: parseInt(event.registrations) || 0,
      comments: comments.map((c) => ({
        id: c.id,
        comment: c.comment,
        created_at: c.created_at,
        userName: c.user_name,
        userRole: c.user_role,
        userProfileImage: c.profile_image,
      })),
      isRegistered,
      isBookmarked,
      registrationId,
      attended,
      ticket_code: ticketCode,
      qr_code_base64: qrCodeBase64,
    };

    res.status(200).json({
      success: true,
      event: formattedEvent,
    });
  } catch (err) {
    console.error("Get Event By ID Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error retrieving event details",
    });
  }
};

// @desc    Create an event
// @route   POST /api/events
// @access  Private (Admin only)
exports.createEvent = async (req, res) => {
  const {
    name,
    description,
    department,
    category,
    organizer,
    venue,
    date,
    time,
    capacity,
    color,
  } = req.body;
  const createdBy = req.user.id;

  try {
    if (
      !name ||
      !description ||
      !department ||
      !category ||
      !date ||
      !time ||
      !capacity
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // If an admin creates the event, it is auto-approved. If not, it could be 'pending'
    const status = req.user.role === "admin" ? "approved" : "pending";

    const [result] = await pool.execute(
      `INSERT INTO events (title, description, department, category, organizer, venue, event_date, event_time, capacity, color, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        department,
        category,
        organizer || "CS Club",
        venue,
        date,
        time,
        capacity,
        color || "#a855f7",
        status,
        createdBy,
      ],
    );

    const newEventId = result.insertId;

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      eventId: newEventId,
    });
  } catch (err) {
    console.error("Create Event Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error creating event" });
  }
};

// @desc    Update event details
// @route   PUT /api/events/:id
// @access  Private (Admin only)
exports.updateEvent = async (req, res) => {
  const eventId = req.params.id;
  const {
    name,
    description,
    department,
    category,
    organizer,
    venue,
    date,
    time,
    capacity,
    color,
    status,
  } = req.body;

  try {
    // Check if event exists
    const [existing] = await pool.execute(
      "SELECT title FROM events WHERE id = ?",
      [eventId],
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const updates = [];
    const params = [];

    if (name) {
      updates.push("title = ?");
      params.push(name);
    }
    if (description) {
      updates.push("description = ?");
      params.push(description);
    }
    if (department) {
      updates.push("department = ?");
      params.push(department);
    }
    if (category) {
      updates.push("category = ?");
      params.push(category);
    }
    if (organizer) {
      updates.push("organizer = ?");
      params.push(organizer);
    }
    if (venue) {
      updates.push("venue = ?");
      params.push(venue);
    }
    if (date) {
      updates.push("event_date = ?");
      params.push(date);
    }
    if (time) {
      updates.push("event_time = ?");
      params.push(time);
    }
    if (capacity) {
      updates.push("capacity = ?");
      params.push(capacity);
    }
    if (color) {
      updates.push("color = ?");
      params.push(color);
    }
    if (status) {
      updates.push("status = ?");
      params.push(status);
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Please specify details to update" });
    }

    params.push(eventId);
    await pool.execute(
      `UPDATE events SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    // Notify registered users (Bonus: Nodemailer notification on update)
    const [registrants] = await pool.execute(
      `
      SELECT u.id, u.name, u.email 
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
    `,
      [eventId],
    );

    const formattedUpdates = {};
    if (date) formattedUpdates["Date"] = date;
    if (time) formattedUpdates["Time"] = time;
    if (venue) formattedUpdates["Venue"] = venue;

    if (Object.keys(formattedUpdates).length > 0 && registrants.length > 0) {
      for (const r of registrants) {
        await emailService.sendEventUpdateEmail(
          r.email,
          r.name,
          existing[0].title,
          formattedUpdates,
        );

        // Add to Notifications Table (push alert)
        await pool.execute(
          "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
          [
            r.id,
            "Event Updated",
            `The event "${existing[0].title}" you registered for has been updated.`,
          ],
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
    });
  } catch (err) {
    console.error("Update Event Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error updating event" });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Admin only)
exports.deleteEvent = async (req, res) => {
  const eventId = req.params.id;

  try {
    const [existing] = await pool.execute(
      "SELECT title FROM events WHERE id = ?",
      [eventId],
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Get registrants to notify before deleting
    const [registrants] = await pool.execute(
      `
      SELECT u.id as user_id, u.name, u.email 
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
    `,
      [eventId],
    );

    // Send notifications (Bonus: email & DB alert on cancellation)
    for (const r of registrants) {
      await emailService.sendEventCancellationEmail(
        r.email,
        r.name,
        existing[0].title,
      );
      await pool.execute(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [
          r.user_id,
          "Event Cancelled",
          `The event "${existing[0].title}" has been cancelled.`,
        ],
      );
    }

    // Cascade deletion of bookmarks, registrations, comments are handled by DB cascade constraints!
    await pool.execute("DELETE FROM events WHERE id = ?", [eventId]);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (err) {
    console.error("Delete Event Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error deleting event" });
  }
};

// @desc    Approve/Reject an event (Event Approval Workflow)
// @route   PUT /api/events/:id/approve
// @access  Private (Admin only)
exports.approveEvent = async (req, res) => {
  const eventId = req.params.id;
  const { status } = req.body; // approved / rejected

  try {
    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const [rows] = await pool.execute(
      "SELECT title, created_by FROM events WHERE id = ?",
      [eventId],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    await pool.execute("UPDATE events SET status = ? WHERE id = ?", [
      status,
      eventId,
    ]);

    // Notify event creator (if it was created by someone else)
    const creatorId = rows[0].created_by;
    if (creatorId) {
      await pool.execute(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [
          creatorId,
          "Event Approval Status",
          `Your event proposal "${rows[0].title}" has been ${status}.`,
        ],
      );
    }

    res.status(200).json({
      success: true,
      message: `Event status updated to ${status}`,
    });
  } catch (err) {
    console.error("Approve Event Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error approving event" });
  }
};

// @desc    Toggle Bookmark for an event
// @route   POST /api/events/:id/bookmark
// @access  Private
exports.toggleBookmark = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if event exists
    const [events] = await pool.execute("SELECT id FROM events WHERE id = ?", [
      eventId,
    ]);
    if (events.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Check if already bookmarked
    const [existing] = await pool.execute(
      "SELECT id FROM bookmarks WHERE user_id = ? AND event_id = ?",
      [userId, eventId],
    );

    if (existing.length > 0) {
      // Remove bookmark
      await pool.execute(
        "DELETE FROM bookmarks WHERE user_id = ? AND event_id = ?",
        [userId, eventId],
      );
      return res.status(200).json({
        success: true,
        isBookmarked: false,
        message: "Bookmark removed",
      });
    } else {
      // Add bookmark
      await pool.execute(
        "INSERT INTO bookmarks (user_id, event_id) VALUES (?, ?)",
        [userId, eventId],
      );
      return res
        .status(201)
        .json({ success: true, isBookmarked: true, message: "Bookmark added" });
    }
  } catch (err) {
    console.error("Toggle Bookmark Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during bookmark toggle" });
  }
};

// @desc    Get user bookmarked events
// @route   GET /api/events/bookmarks/my
// @access  Private
exports.getMyBookmarks = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.execute(
      `
      SELECT e.*, 
             COALESCE((SELECT COUNT(*) FROM registrations WHERE event_id = e.id), 0) AS registrations
      FROM bookmarks b
      JOIN events e ON b.event_id = e.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `,
      [userId],
    );

    const formattedEvents = rows.map((e) => ({
      id: String(e.id),
      name: e.title,
      description: e.description,
      department: e.department,
      category: e.category,
      organizer: e.organizer,
      venue: e.venue,
      date: e.event_date
        ? new Date(e.event_date).toISOString().split("T")[0]
        : "",
      time: e.event_time ? e.event_time.slice(0, 5) : "12:00",
      capacity: e.capacity,
      banner_image: e.banner_image,
      color: e.color,
      status: e.status,
      registrations: parseInt(e.registrations) || 0,
    }));

    res.status(200).json({
      success: true,
      events: formattedEvents,
    });
  } catch (err) {
    console.error("Get Bookmarks Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error retrieving bookmarks" });
  }
};

// @desc    Add comment to event
// @route   POST /api/events/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;
  const { comment } = req.body;

  try {
    if (!comment || comment.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Comment text cannot be empty" });
    }

    // Check if event exists
    const [events] = await pool.execute("SELECT id FROM events WHERE id = ?", [
      eventId,
    ]);
    if (events.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Add comment
    const [result] = await pool.execute(
      "INSERT INTO event_comments (event_id, user_id, comment) VALUES (?, ?, ?)",
      [eventId, userId, comment],
    );

    const [newComment] = await pool.execute(
      `
      SELECT ec.id, ec.comment, ec.created_at, u.name as user_name, u.role as user_role, u.profile_image
      FROM event_comments ec
      JOIN users u ON ec.user_id = u.id
      WHERE ec.id = ?
    `,
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      comment: {
        id: newComment[0].id,
        comment: newComment[0].comment,
        created_at: newComment[0].created_at,
        userName: newComment[0].user_name,
        userRole: newComment[0].user_role,
        userProfileImage: newComment[0].profile_image,
      },
    });
  } catch (err) {
    console.error("Add Comment Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error adding comment" });
  }
};
