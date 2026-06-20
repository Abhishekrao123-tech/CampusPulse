const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('🧪 Starting CampusPulse Database Integration Check...\n');

  try {
    // 1. Check Connection
    const connection = await pool.getConnection();
    console.log('✅ Connection to MySQL established successfully.');
    connection.release();

    // 2. Validate users table and insert a test student if not exists
    const testEmail = 'test_student@campuspulse.edu';
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [testEmail]);
    let studentId;

    if (existing.length > 0) {
      studentId = existing[0].id;
      console.log(`ℹ️ Test student already exists with ID: ${studentId}`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);
      const [res] = await pool.execute(
        'INSERT INTO users (name, email, password_hash, department, year, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['Test Student', testEmail, hash, 'Computer Science', '1', 'student']
      );
      studentId = res.insertId;
      console.log(`✅ Test student inserted with ID: ${studentId}`);
    }

    // 3. Insert a test event
    const [events] = await pool.execute('SELECT id FROM events WHERE title = ?', ['Test Hackathon']);
    let eventId;

    if (events.length > 0) {
      eventId = events[0].id;
      console.log(`ℹ️ Test event already exists with ID: ${eventId}`);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const [res] = await pool.execute(
        `INSERT INTO events (title, description, department, category, organizer, venue, event_date, event_time, capacity, color, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Test Hackathon', 'A test hackathon event details.', 'Computer Science', 'Hackathon', 'CS Club', 'Lab A', today, '10:00:00', 50, '#a855f7', 'approved', null]
      );
      eventId = res.insertId;
      console.log(`✅ Test event inserted with ID: ${eventId}`);
    }

    // 4. Test Registration
    const [existingReg] = await pool.execute(
      'SELECT id FROM registrations WHERE user_id = ? AND event_id = ?',
      [studentId, eventId]
    );

    if (existingReg.length > 0) {
      console.log(`ℹ️ Test registration already exists.`);
    } else {
      const [res] = await pool.execute(
        'INSERT INTO registrations (user_id, event_id, ticket_code) VALUES (?, ?, ?)',
        [studentId, eventId, `TKT-TEST-${Date.now()}`]
      );
      console.log(`✅ Test registration recorded successfully.`);
    }

    // 5. Test comments
    const [resComment] = await pool.execute(
      'INSERT INTO event_comments (event_id, user_id, comment) VALUES (?, ?, ?)',
      [eventId, studentId, 'Looking forward to this event!']
    );
    console.log(`✅ Test comment inserted successfully.`);

    // 6. Test bookmarks
    const [existingBmark] = await pool.execute(
      'SELECT id FROM bookmarks WHERE user_id = ? AND event_id = ?',
      [studentId, eventId]
    );
    if (existingBmark.length === 0) {
      await pool.execute('INSERT INTO bookmarks (user_id, event_id) VALUES (?, ?)', [studentId, eventId]);
      console.log(`✅ Test bookmark inserted successfully.`);
    }

    // 7. Test feedback
    await pool.execute(
      'INSERT INTO event_feedback (user_id, event_id, rating, feedback) VALUES (?, ?, ?, ?)',
      [studentId, eventId, 5, 'Awesome mock test event feedback!']
    );
    console.log(`✅ Test feedback inserted successfully.`);

    // 8. Test notifications
    await pool.execute(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [studentId, 'Test Notice', 'Welcome to CampusPulse verification check notification.']
    );
    console.log(`✅ Test notification inserted successfully.`);

    // Clean up comments, bookmarks, feedbacks, notifications, and registrations for the test student
    console.log('\n🧹 Cleaning up test data...');
    await pool.execute('DELETE FROM event_comments WHERE user_id = ?', [studentId]);
    await pool.execute('DELETE FROM bookmarks WHERE user_id = ?', [studentId]);
    await pool.execute('DELETE FROM event_feedback WHERE user_id = ?', [studentId]);
    await pool.execute('DELETE FROM notifications WHERE user_id = ?', [studentId]);
    await pool.execute('DELETE FROM registrations WHERE user_id = ?', [studentId]);
    await pool.execute('DELETE FROM events WHERE id = ?', [eventId]);
    await pool.execute('DELETE FROM users WHERE id = ?', [studentId]);
    console.log('✅ Cleanup finished.');

    console.log('\n🎉 ALL DATABASE INTEGRATION CHECKS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Integration Check Failed:', err.message);
    process.exit(1);
  }
}

runTests();
