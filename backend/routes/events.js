const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// Public routes
router.get('/', eventController.getEvents);
router.get('/bookmarks/my', protect, eventController.getMyBookmarks); // placed before /:id to avoid collision
router.get('/:id', eventController.getEventById);

// Protected routes (Admin-only event management)
router.post('/', protect, adminOnly, eventController.createEvent);
router.put('/:id', protect, adminOnly, eventController.updateEvent);
router.delete('/:id', protect, adminOnly, eventController.deleteEvent);
router.put('/:id/approve', protect, adminOnly, eventController.approveEvent);

// Protected user interactions (bookmarks, comments)
router.post('/:id/bookmark', protect, eventController.toggleBookmark);
router.post('/:id/comments', protect, eventController.addComment);

module.exports = router;
