const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const pool = require('../config/db');

// @desc    Upload Event Banner
// @route   POST /api/upload/event-banner
// @access  Private (Admin only)
router.post('/event-banner', protect, adminOnly, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a banner image file' });
    }

    // Build static URL to access the uploaded file
    const fileUrl = `/uploads/banners/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Event banner uploaded successfully',
      fileUrl
    });
  } catch (err) {
    console.error('Event Banner Upload Error:', err);
    res.status(500).json({ success: false, message: 'Server error during banner upload' });
  }
});

// @desc    Upload User Profile Picture
// @route   POST /api/upload/profile
// @access  Private
router.post('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an avatar image file' });
    }

    const userId = req.user.id;
    const fileUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user profile in the database
    await pool.execute('UPDATE users SET profile_image = ? WHERE id = ?', [fileUrl, userId]);

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      fileUrl
    });
  } catch (err) {
    console.error('Profile Upload Error:', err);
    res.status(500).json({ success: false, message: 'Server error during profile picture upload' });
  }
});

module.exports = router;
