const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// Apply protection and role checks to all routes
router.use(protect);
router.use(adminOnly);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
