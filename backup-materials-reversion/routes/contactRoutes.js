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
  getContactNotes,
  createContactNote,
  getFollowUpReminders
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
router.get('/type/:type', getContactsByType);
router.get('/search/:searchTerm', searchContacts);

// Notes management
router.route('/:id/notes')
  .get(getContactNotes)
  .post(createContactNote);

// Follow-up reminders
router.get('/follow-ups/reminders', getFollowUpReminders);

module.exports = router; 