const qr = require('qrcode');
const pool = require('../config/db');
const emailService = require('../services/emailService');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private (Student only)
exports.registerEvent = async (req, res) => {
  const { eventId } = req.body;
  const userId = req.user.id;

  try {
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    // Role check
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can register for events' });
    }

    // 1. Check if event exists
    const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = events[0];

    // 2. Validate event status / date (Cannot register for expired events)
    const todayStr = new Date().toISOString().split('T')[0];
    const eventDateStr = new Date(event.event_date).toISOString().split('T')[0];
    if (eventDateStr < todayStr) {
      return res.status(400).json({ success: false, message: 'Cannot register for past events' });
    }

    // 3. Check capacity limits
    const [regsCount] = await pool.execute('SELECT COUNT(*) as count FROM registrations WHERE event_id = ?', [eventId]);
    if (regsCount[0].count >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Registration failed: Event is full' });
    }

    // 4. Check duplicate registrations
    const [existing] = await pool.execute(
      'SELECT id FROM registrations WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'You are already registered for this event' });
    }

    // 5. Generate QR code ticket data
    const ticketCode = `TKT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrCodeDataUrl = await qr.toDataURL(ticketCode);

    // 6. Save Registration
    await pool.execute(
      'INSERT INTO registrations (user_id, event_id, ticket_code) VALUES (?, ?, ?)',
      [userId, eventId, ticketCode]
    );

    // 7. Send email notification (Bonus: nodemailer email ticket)
    await emailService.sendRegistrationEmail(req.user.email, req.user.name, event.title, ticketCode, qrCodeDataUrl);

    // 8. Add notification inside system (push alert)
    await pool.execute(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [userId, 'Registration Confirmed', `You have registered for "${event.title}". An email ticket has been sent.`]
    );

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event',
      ticketCode
    });
  } catch (err) {
    console.error('Register Event Error:', err);
    res.status(500).json({ success: false, message: 'Server error during event registration' });
  }
};

// @desc    Cancel event registration
// @route   DELETE /api/registrations/:eventId
// @access  Private (Student only)
exports.cancelRegistration = async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.user.id;

  try {
    const [existing] = await pool.execute(
      'SELECT id FROM registrations WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    await pool.execute('DELETE FROM registrations WHERE user_id = ? AND event_id = ?', [userId, eventId]);

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (err) {
    console.error('Cancel Registration Error:', err);
    res.status(500).json({ success: false, message: 'Server error during cancellation' });
  }
};

// @desc    Get user's registered events
// @route   GET /api/registrations/my
// @access  Private (Student only)
exports.getMyRegistrations = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.execute(`
      SELECT r.id as registration_id, r.registered_at, r.attended, r.ticket_code,
             e.*,
             COALESCE((SELECT COUNT(*) FROM registrations WHERE event_id = e.id), 0) AS registrations
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY e.event_date ASC
    `, [userId]);

    const formattedEvents = rows.map(r => ({
      registration_id: r.registration_id,
      ticket_code: r.ticket_code,
      attended: r.attended === 1,
      registered_at: r.registered_at,
      id: String(r.id),
      name: r.title,
      description: r.description,
      department: r.department,
      category: r.category,
      organizer: r.organizer,
      venue: r.venue,
      date: r.event_date ? new Date(r.event_date).toISOString().split('T')[0] : '',
      time: r.event_time ? r.event_time.slice(0, 5) : '12:00',
      capacity: r.capacity,
      banner_image: r.banner_image,
      color: r.color,
      status: r.status,
      registrations: parseInt(r.registrations) || 0
    }));

    res.status(200).json({
      success: true,
      registrations: formattedEvents
    });
  } catch (err) {
    console.error('Get My Registrations Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving registered events' });
  }
};

// @desc    Get all registrations for a specific event
// @route   GET /api/registrations/event/:eventId
// @access  Private (Admin only)
exports.getEventRegistrations = async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const [rows] = await pool.execute(`
      SELECT r.id as registration_id, r.registered_at, r.attended, r.ticket_code,
             u.id as user_id, u.name as student_name, u.email, u.department, u.year
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY r.registered_at DESC
    `, [eventId]);

    res.status(200).json({
      success: true,
      registrations: rows.map(r => ({
        id: r.registration_id,
        registeredOn: r.registered_at ? new Date(r.registered_at).toISOString().split('T')[0] : '',
        attended: r.attended === 1,
        ticketCode: r.ticket_code,
        studentId: r.user_id,
        studentName: r.student_name,
        email: r.email,
        department: r.department,
        year: r.year
      }))
    });
  } catch (err) {
    console.error('Get Event Registrations Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving event registrations' });
  }
};

// @desc    Mark attendance for a user (Check-in student)
// @route   PUT /api/registrations/:id/attendance
// @access  Private (Admin only)
exports.markAttendance = async (req, res) => {
  const registrationId = req.params.id;
  const { attended } = req.body; // true/false or 1/0

  try {
    if (attended === undefined) {
      return res.status(400).json({ success: false, message: 'Attendance status is required' });
    }

    const attendedVal = attended ? 1 : 0;

    const [rows] = await pool.execute('SELECT id, user_id, event_id FROM registrations WHERE id = ?', [registrationId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration record not found' });
    }

    await pool.execute(
      'UPDATE registrations SET attended = ? WHERE id = ?',
      [attendedVal, registrationId]
    );

    // Notify student about check-in status (push alert)
    const { user_id, event_id } = rows[0];
    const [events] = await pool.execute('SELECT title FROM events WHERE id = ?', [event_id]);
    const eventTitle = events.length > 0 ? events[0].title : 'Event';

    if (attendedVal === 1) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [user_id, 'Checked In Successfully', `You have been checked in for "${eventTitle}". Your certificate is now available.`]
      );
    }

    res.status(200).json({
      success: true,
      message: `Attendance marked as ${attended ? 'Attended' : 'Absent'}`,
      attended: attendedVal === 1
    });
  } catch (err) {
    console.error('Mark Attendance Error:', err);
    res.status(500).json({ success: false, message: 'Server error marking attendance' });
  }
};

// @desc    Generate Printable HTML Certificate
// @route   GET /api/registrations/:id/certificate
// @access  Public (So that it is easily print-friendly or download-friendly)
exports.getCertificate = async (req, res) => {
  const registrationId = req.params.id;

  try {
    // Fetch registration details
    const [rows] = await pool.execute(`
      SELECT r.id, r.attended, r.registered_at, r.ticket_code,
             u.name as student_name, u.department as student_dept, u.year as student_year,
             e.title as event_title, e.event_date, e.category as event_category
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
    `, [registrationId]);

    if (rows.length === 0) {
      return res.status(404).send('<h1>Error 404: Certificate not found</h1>');
    }

    const reg = rows[0];

    // Attendance validation: Certificate is only available if student attended the event
    if (reg.attended !== 1) {
      return res.status(400).send(`
        <div style="font-family: 'Poppins', sans-serif; text-align: center; margin-top: 100px; color: #ef4444;">
          <h1>Certificate Unreleased</h1>
          <p>This certificate is only issued after the administrator marks your attendance as "Attended" for the event.</p>
          <a href="/" style="color: #a855f7; text-decoration: none; font-weight: bold;">Return to CampusPulse</a>
        </div>
      `);
    }

    const formattedDate = new Date(reg.event_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Render beautiful HTML Certificate
    const certificateHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate of Participation — ${reg.student_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #f5f5f7;
            margin: 0;
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 90vh;
            font-family: 'Poppins', sans-serif;
          }
          .cert-container {
            width: 800px;
            height: 560px;
            background-color: #ffffff;
            border: 24px solid #1a1a2e;
            box-shadow: 0 20px 50px rgba(0,0,0,0.15);
            position: relative;
            padding: 40px;
            box-sizing: border-box;
            background-image: radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 80%);
          }
          .cert-border-inner {
            border: 4px double #a855f7;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            padding: 30px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .cert-header {
            margin-top: 10px;
          }
          .cert-logo {
            font-size: 1.8rem;
            font-weight: 800;
            color: #1a1a2e;
            letter-spacing: 2px;
          }
          .cert-logo span {
            color: #a855f7;
          }
          .cert-title {
            font-family: 'Cinzel', serif;
            font-size: 2.5rem;
            font-weight: 700;
            color: #1a1a2e;
            margin: 15px 0 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .cert-subtitle {
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: #9891b0;
            font-weight: 600;
            margin-bottom: 25px;
          }
          .cert-recipient {
            font-family: 'Cinzel', serif;
            font-size: 2.2rem;
            font-weight: 800;
            color: #a855f7;
            margin: 10px 0;
            border-bottom: 2px solid #e2e8f0;
            display: inline-block;
            padding-bottom: 5px;
            min-width: 350px;
          }
          .cert-body {
            font-size: 1.05rem;
            color: #1a1a2e;
            max-width: 580px;
            margin: 0 auto;
            line-height: 1.6;
          }
          .cert-body strong {
            color: #12121a;
          }
          .cert-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 25px;
            padding: 0 40px;
          }
          .signature-box {
            text-align: center;
            width: 180px;
          }
          .signature-line {
            border-top: 1px solid #1a1a2e;
            margin-top: 40px;
            padding-top: 5px;
            font-size: 0.85rem;
            color: #9891b0;
            font-weight: 600;
            text-transform: uppercase;
          }
          .signature-img {
            font-family: 'Cinzel', serif;
            font-weight: bold;
            font-style: italic;
            color: #a855f7;
            font-size: 1.2rem;
          }
          .cert-meta-item {
            font-size: 0.8rem;
            color: #9891b0;
          }
          .print-btn-container {
            position: absolute;
            top: -60px;
            right: 0;
          }
          .print-btn {
            background-color: #a855f7;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(168,85,247,0.3);
            font-family: 'Poppins', sans-serif;
          }
          @media print {
            body {
              background-color: #ffffff;
              padding: 0;
            }
            .print-btn-container {
              display: none;
            }
            .cert-container {
              box-shadow: none;
              border-width: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="print-btn-container">
            <button class="print-btn" onclick="window.print()">Print Certificate</button>
          </div>
          <div class="cert-border-inner">
            <div class="cert-header">
              <div class="cert-logo">⚡ Campus<span>Pulse</span></div>
              <div class="cert-title">Certificate of Completion</div>
              <div class="cert-subtitle">is proudly presented to</div>
            </div>

            <div class="cert-recipient">${reg.student_name}</div>

            <div class="cert-body">
              For active participation and successful completion of the campus ${reg.event_category} event <strong>"${reg.event_title}"</strong> held on <strong>${formattedDate}</strong>, organized by the college campus body.
            </div>

            <div class="cert-footer">
              <div class="signature-box">
                <div class="signature-img">CampusPulse</div>
                <div class="signature-line">Event Registrar</div>
              </div>
              <div class="signature-box">
                <div class="cert-meta-item">Verification Code:</div>
                <div style="font-weight: bold; font-family: monospace; color:#1a1a2e; margin-bottom: 5px;">${reg.ticket_code}</div>
                <div class="signature-line">Authorized Ticket ID</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.status(200).send(certificateHtml);
  } catch (err) {
    console.error('Get Certificate Error:', err);
    res.status(500).send('<h1>Server error loading certificate</h1>');
  }
};

// @desc    Get all registrations
// @route   GET /api/registrations
// @access  Private (Admin only)
exports.getAllRegistrations = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.id as registration_id, r.registered_at, r.attended, r.ticket_code,
             u.name as student_name, u.email, u.department as student_dept,
             e.title as event_title
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      ORDER BY r.registered_at DESC
    `);

    res.status(200).json({
      success: true,
      registrations: rows.map(r => ({
        id: r.registration_id,
        studentName: r.student_name,
        email: r.email,
        eventTitle: r.event_title,
        department: r.student_dept,
        registeredOn: r.registered_at ? new Date(r.registered_at).toISOString().split('T')[0] : '',
        status: r.attended === 1 ? 'Attended' : 'Registered'
      }))
    });
  } catch (err) {
    console.error('Get All Registrations Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving all registrations' });
  }
};
