const express = require('express');
const router = express.Router();
const regController = require('../controllers/regController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// Public route to view/print certificate
router.get('/:id/certificate', regController.getCertificate);

// Protected routes (Student bookings)
router.post('/', protect, regController.registerEvent);
router.delete('/:eventId', protect, regController.cancelRegistration);
router.get('/my', protect, regController.getMyRegistrations);

// Admin-only management routes
router.get('/', protect, adminOnly, regController.getAllRegistrations);
router.get('/event/:eventId', protect, adminOnly, regController.getEventRegistrations);
router.put('/:id/attendance', protect, adminOnly, regController.markAttendance);

module.exports = router;
