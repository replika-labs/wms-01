const express = require('express');
const router = express.Router();
const {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  toggleContactStatus,
  getContactsByType,
  searchContacts,
  addContactNote
} = require('../controllers/contactController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Main CRUD routes
router.route('/')
  .get(getContacts)
  .post(createContact);

router.route('/:id')
  .get(getContactById)
  .put(updateContact)
  .delete(deleteContact);

// Status management
router.put('/:id/toggle-status', toggleContactStatus);

// Filter and search routes
router.get('/type/:contactType', getContactsByType);
router.get('/search/:searchTerm', searchContacts);

// Notes management
router.post('/:id/notes', addContactNote);

// Placeholder routes for future implementation
router.get('/:id/notes', (req, res) => {
  res.status(501).json({
    message: 'Get contact notes functionality temporarily disabled during Prisma migration',
    error: 'Not Implemented'
  });
});

router.get('/follow-ups/reminders', (req, res) => {
  res.status(501).json({
    message: 'Follow-up reminders functionality temporarily disabled during Prisma migration',
    error: 'Not Implemented'
  });
});

module.exports = router; 