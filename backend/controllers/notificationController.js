const pool = require('../config/db');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.execute(
      'SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json({
      success: true,
      notifications: rows.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.is_read === 1,
        createdAt: n.created_at
      }))
    });
  } catch (err) {
    console.error('Get Notifications Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if notification exists and belongs to user
    const [existing] = await pool.execute(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [notificationId]
    );

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    console.error('Mark Notification Read Error:', err);
    res.status(500).json({ success: false, message: 'Server error marking notification read' });
  }
};
