const pool = require('../config/db');

// @desc    Get dashboard metrics (counters)
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Total events count
    const [eventsCount] = await pool.execute('SELECT COUNT(*) as count FROM events');

    // 2. Total students count
    const [studentsCount] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'student'");

    // 3. Total registrations count
    const [regsCount] = await pool.execute('SELECT COUNT(*) as count FROM registrations');

    // 4. Active departments count (with at least 1 event)
    const [deptsCount] = await pool.execute('SELECT COUNT(DISTINCT department) as count FROM events');

    res.status(200).json({
      success: true,
      stats: {
        totalEvents: eventsCount[0].count,
        totalStudents: studentsCount[0].count,
        totalRegistrations: regsCount[0].count,
        activeDepts: deptsCount[0].count
      }
    });
  } catch (err) {
    console.error('Get Dashboard Stats Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard stats' });
  }
};

// @desc    Get analytics chart data (Grouped summaries)
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
exports.getAnalytics = async (req, res) => {
  try {
    // 1. Registrations by Department
    const [deptRows] = await pool.execute(`
      SELECT u.department, COUNT(r.id) as count
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      GROUP BY u.department
      ORDER BY count DESC
    `);
    const deptStats = {};
    deptRows.forEach(row => {
      deptStats[row.department] = parseInt(row.count) || 0;
    });

    // 2. Registrations by Category
    const [catRows] = await pool.execute(`
      SELECT e.category, COUNT(r.id) as count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.category
      ORDER BY count DESC
    `);
    const catStats = {};
    catRows.forEach(row => {
      catStats[row.category] = parseInt(row.count) || 0;
    });

    // 3. Top Events (by registration count)
    const [topEventsRows] = await pool.execute(`
      SELECT e.id, e.title, COUNT(r.id) as registrations
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id
      ORDER BY registrations DESC
      LIMIT 6
    `);
    const topEvents = {};
    topEventsRows.forEach(row => {
      topEvents[row.title] = parseInt(row.registrations) || 0;
    });

    // 4. Monthly Registrations (Timeline check)
    const [monthlyRows] = await pool.execute(`
      SELECT DATE_FORMAT(registered_at, '%Y-%m') as month, COUNT(*) as count
      FROM registrations
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `);
    const monthlyStats = {};
    monthlyRows.forEach(row => {
      monthlyStats[row.month] = parseInt(row.count) || 0;
    });

    res.status(200).json({
      success: true,
      analytics: {
        registrationsByDepartment: deptStats,
        registrationsByCategory: catStats,
        topEvents: topEvents,
        monthlyRegistrations: monthlyStats
      }
    });
  } catch (err) {
    console.error('Get Analytics Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving analytics' });
  }
};
