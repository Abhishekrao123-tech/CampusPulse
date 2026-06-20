const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const emailService = require('../services/emailService');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'campuspulse_super_secret_key_123!', {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// @desc    Register a user (Student)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, department, year } = req.body;

  try {
    // Basic verification
    if (!name || !email || !password || !department) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save User
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, department, year, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, department, year || '1', 'student']
    );

    const userId = result.insertId;
    const token = generateToken(userId);

    // Fetch new user info
    const [users] = await pool.execute('SELECT id, name, email, department, year, role, profile_image FROM users WHERE id = ?', [userId]);

    res.status(201).json({
      success: true,
      token,
      user: users[0]
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Login a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check user in database
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        year: user.year,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Logout User
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  // In pure JWT token systems, logout is mostly handled client-side by destroying the token.
  // We can return a success indicator.
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get currently logged in user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const { name, department, year } = req.body;
  const userId = req.user.id;

  try {
    await pool.execute(
      'UPDATE users SET name = ?, department = ?, year = ? WHERE id = ?',
      [name || req.user.name, department || req.user.department, year || req.user.year, userId]
    );

    const [rows] = await pool.execute('SELECT id, name, email, department, year, role, profile_image FROM users WHERE id = ?', [userId]);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: rows[0]
    });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ success: false, message: 'Server error during profile update' });
  }
};

// @desc    Request forgot password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email address' });
    }

    const [users] = await pool.execute('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // Don't leak whether a user exists for security, but return success
      return res.status(200).json({ success: true, message: 'If email exists, a reset link has been sent' });
    }

    const user = users[0];

    // Generate crypto token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Set expiration to 1 hour
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 1);

    await pool.execute('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [resetToken, expireDate, user.id]);

    // Send email reset link
    // Build reset link (pointing to frontend reset password handler)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const resetUrl = `${protocol}://${host}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await emailService.sendResetPasswordEmail(user.email, user.name, resetUrl);

    res.status(200).json({
      success: true,
      message: 'If email exists, a reset link has been sent'
    });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ success: false, message: 'Server error during password reset request' });
  }
};

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    if (!email || !token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please fill in all details' });
    }

    // Verify token validity & expiration
    const [users] = await pool.execute(
      'SELECT id, name, reset_expires FROM users WHERE email = ? AND reset_token = ?',
      [email, token]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    const user = users[0];
    const now = new Date();
    const expireTime = new Date(user.reset_expires);

    if (now > expireTime) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Clear reset tokens & update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [newPasswordHash, user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};
