const asyncHandler = require('express-async-handler');
const { Contact, ContactNote, User, Order, PurchaseLog } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all contacts with filtering and pagination
// @route   GET /api/contacts
// @access  Private
const getContacts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    search,
    isActive = 'true',
    sortBy = 'name',
    sortOrder = 'ASC'
  } = req.query;

  // Build where clause
  const where = {};
  
  // Only filter by type if it's a valid type (not 'all' or empty)
  if (type && type !== 'all' && ['supplier', 'tailor', 'internal'].includes(type)) {
    where.type = type;
  }
  if (isActive !== 'all') where.isActive = isActive === 'true';
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { company: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } }
    ];
  }

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get contacts with pagination
  const { count, rows: contacts } = await Contact.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset,
    distinct: true
  });

  // Get statistics for filters
  const typeStats = await Contact.getStatsByType();

  res.json({
    contacts,
    pagination: {
      total: count,
      pages: Math.ceil(count / parseInt(limit)),
      current: parseInt(page),
      limit: parseInt(limit)
    },
    filters: {
      typeStats: typeStats.reduce((acc, stat) => {
        acc[stat.type] = {
          total: parseInt(stat.count),
          active: parseInt(stat.activeCount)
        };
        return acc;
      }, {})
    }
  });
});

// @desc    Get single contact by ID
// @route   GET /api/contacts/:id
// @access  Private
const getContactById = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({
    where: {
      id: req.params.id,
      isActive: true
    },
    include: [
      {
        model: ContactNote,
        as: 'contactNotes',
        include: [
          {
            model: User,
            as: 'CreatedByUser',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber', 'status']
          },
          {
            model: PurchaseLog,
            attributes: ['id', 'purchasedDate', 'supplier']
          }
        ],
        order: [['createdAt', 'DESC']]
      }
    ]
  });

  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }

  res.json(contact);
});

// @desc    Create new contact
// @route   POST /api/contacts
// @access  Private
const createContact = asyncHandler(async (req, res) => {
  const {
    name,
    type,
    email,
    phone,
    whatsappPhone,
    address,
    company,
    position,
    notes
  } = req.body;

  // Validation
  if (!name || !type) {
    res.status(400);
    throw new Error('Name and type are required');
  }

  if (!['supplier', 'tailor', 'internal'].includes(type)) {
    res.status(400);
    throw new Error('Invalid contact type. Must be supplier, tailor, or internal');
  }

  // Check for duplicate name within same type
  const existingContact = await Contact.findOne({
    where: {
      name,
      type,
      isActive: true
    }
  });

  if (existingContact) {
    res.status(400);
    throw new Error(`${type} with name "${name}" already exists`);
  }

  try {
    const contact = await Contact.create({
      name,
      type,
      email,
      phone,
      whatsappPhone,
      address,
      company,
      position,
      notes,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      contact
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500);
    throw new Error('Failed to create contact');
  }
});

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
const updateContact = asyncHandler(async (req, res) => {
  const {
    name,
    type,
    email,
    phone,
    whatsappPhone,
    address,
    company,
    position,
    notes
  } = req.body;

  const contact = await Contact.findOne({
    where: {
      id: req.params.id,
      isActive: true
    }
  });

  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }

  // Validation
  if (name && name !== contact.name && type && type !== contact.type) {
    const existingContact = await Contact.findOne({
      where: {
        name,
        type,
        isActive: true,
        id: { [Op.ne]: req.params.id }
      }
    });

    if (existingContact) {
      res.status(400);
      throw new Error(`${type} with name "${name}" already exists`);
    }
  }

  try {
    await contact.update({
      name: name || contact.name,
      type: type || contact.type,
      email: email !== undefined ? email : contact.email,
      phone: phone !== undefined ? phone : contact.phone,
      whatsappPhone: whatsappPhone !== undefined ? whatsappPhone : contact.whatsappPhone,
      address: address !== undefined ? address : contact.address,
      company: company !== undefined ? company : contact.company,
      position: position !== undefined ? position : contact.position,
      notes: notes !== undefined ? notes : contact.notes
    });

    res.json({
      success: true,
      message: 'Contact updated successfully',
      contact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500);
    throw new Error('Failed to update contact');
  }
});

// @desc    Delete contact (soft delete)
// @route   DELETE /api/contacts/:id
// @access  Private
const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({
    where: {
      id: req.params.id,
      isActive: true
    }
  });

  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }

  try {
    // Soft delete - mark as inactive
    await contact.update({ isActive: false });

    res.json({
      success: true,
      message: `Contact "${contact.name}" deleted successfully`,
      deletedContact: {
        id: contact.id,
        name: contact.name,
        type: contact.type,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500);
    throw new Error('Failed to delete contact');
  }
});

// @desc    Toggle contact active status
// @route   PUT /api/contacts/:id/toggle-status
// @access  Private
const toggleContactStatus = asyncHandler(async (req, res) => {
  const contact = await Contact.findByPk(req.params.id);

  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }

  try {
    await contact.toggleActive();

    res.json({
      success: true,
      message: `Contact ${contact.isActive ? 'activated' : 'deactivated'} successfully`,
      contact: {
        id: contact.id,
        name: contact.name,
        type: contact.type,
        isActive: contact.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling contact status:', error);
    res.status(500);
    throw new Error('Failed to toggle contact status');
  }
});

// @desc    Get contacts by type
// @route   GET /api/contacts/type/:type
// @access  Private
const getContactsByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { includeInactive = false } = req.query;

  if (!['supplier', 'tailor', 'internal'].includes(type)) {
    res.status(400);
    throw new Error('Invalid contact type');
  }

  try {
    const contacts = await Contact.findByType(type, includeInactive === 'true');
    
    res.json({
      type,
      count: contacts.length,
      contacts
    });
  } catch (error) {
    console.error('Error fetching contacts by type:', error);
    res.status(500);
    throw new Error('Failed to fetch contacts');
  }
});

// @desc    Search contacts
// @route   GET /api/contacts/search/:searchTerm
// @access  Private
const searchContacts = asyncHandler(async (req, res) => {
  const { searchTerm } = req.params;
  const { type } = req.query;

  try {
    const contacts = await Contact.searchByName(searchTerm, type || null);
    
    res.json({
      searchTerm,
      type: type || 'all',
      count: contacts.length,
      contacts
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500);
    throw new Error('Failed to search contacts');
  }
});

// @desc    Get contact notes
// @route   GET /api/contacts/:id/notes
// @access  Private
const getContactNotes = asyncHandler(async (req, res) => {
  const { noteType } = req.query;

  try {
    const notes = await ContactNote.findByContact(req.params.id, noteType || null);
    
    res.json({
      contactId: req.params.id,
      noteType: noteType || 'all',
      count: notes.length,
      notes
    });
  } catch (error) {
    console.error('Error fetching contact notes:', error);
    res.status(500);
    throw new Error('Failed to fetch contact notes');
  }
});

// @desc    Create contact note
// @route   POST /api/contacts/:id/notes
// @access  Private
const createContactNote = asyncHandler(async (req, res) => {
  const {
    orderId,
    purchaseLogId,
    noteType = 'general',
    title,
    note,
    priority = 'medium',
    isFollowUpRequired = false,
    followUpDate
  } = req.body;

  // Validation
  if (!note) {
    res.status(400);
    throw new Error('Note content is required');
  }

  // Verify contact exists
  const contact = await Contact.findOne({
    where: {
      id: req.params.id,
      isActive: true
    }
  });

  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }

  try {
    const contactNote = await ContactNote.create({
      contactId: req.params.id,
      orderId: orderId || null,
      purchaseLogId: purchaseLogId || null,
      noteType,
      title,
      note,
      priority,
      isFollowUpRequired,
      followUpDate: followUpDate || null,
      createdBy: req.user.id
    });

    // Fetch the created note with includes
    const createdNote = await ContactNote.findByPk(contactNote.id, {
      include: [
        {
          model: User,
          as: 'CreatedByUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Order,
          attributes: ['id', 'orderNumber', 'status']
        },
        {
          model: PurchaseLog,
          attributes: ['id', 'purchasedDate', 'supplier']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Contact note created successfully',
      note: createdNote
    });
  } catch (error) {
    console.error('Error creating contact note:', error);
    res.status(500);
    throw new Error('Failed to create contact note');
  }
});

// @desc    Get follow-up reminders
// @route   GET /api/contacts/follow-ups/reminders
// @access  Private
const getFollowUpReminders = asyncHandler(async (req, res) => {
  const { type = 'all', daysAhead = 3 } = req.query;

  try {
    let overdue = [];
    let dueSoon = [];

    if (type === 'all' || type === 'overdue') {
      overdue = await ContactNote.getOverdueFollowUps();
    }

    if (type === 'all' || type === 'due-soon') {
      dueSoon = await ContactNote.getDueSoonFollowUps(parseInt(daysAhead));
    }

    res.json({
      overdue: {
        count: overdue.length,
        notes: overdue
      },
      dueSoon: {
        count: dueSoon.length,
        notes: dueSoon,
        daysAhead: parseInt(daysAhead)
      }
    });
  } catch (error) {
    console.error('Error fetching follow-up reminders:', error);
    res.status(500);
    throw new Error('Failed to fetch follow-up reminders');
  }
});

module.exports = {
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
}; 