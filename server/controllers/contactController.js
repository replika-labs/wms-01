const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to invalidate orders-management workers cache when worker data changes
const invalidateOrdersManagementWorkersCache = async () => {
  try {
    // Make internal API call to clear the cache
    const fetch = require('node-fetch');
    const baseURL = process.env.BASE_URL || 'http://localhost:8080';

    await fetch(`${baseURL}/api/orders-management/cache/clear-workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Orders-Management workers cache invalidated successfully');
  } catch (error) {
    console.warn('⚠️ Failed to invalidate orders-management workers cache:', error.message);
    // Don't throw error - cache invalidation failure should not break contact operations
  }
};

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
  if (type && type !== 'all' && ['supplier', 'worker', 'customer', 'other'].includes(type)) {
    where.contactType = type.toUpperCase();
  }
  if (isActive !== 'all') where.isActive = isActive === 'true';

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get contacts with pagination
  const [contacts, totalCount] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
      take: parseInt(limit),
      skip: offset
    }),
    prisma.contact.count({ where })
  ]);

  // Get statistics for filters
  const typeStats = await prisma.contact.groupBy({
    by: ['contactType'],
    _count: {
      _all: true
    },
    _sum: {
      isActive: true
    }
  });

  const formattedTypeStats = typeStats.reduce((acc, stat) => {
    acc[stat.contactType] = {
      total: stat._count._all,
      active: stat._sum?.isActive || 0
    };
    return acc;
  }, {});

  res.json({
    contacts,
    pagination: {
      total: totalCount,
      pages: Math.ceil(totalCount / parseInt(limit)),
      current: parseInt(page),
      limit: parseInt(limit)
    },
    filters: {
      typeStats: formattedTypeStats
    }
  });
});

// @desc    Get single contact by ID
// @route   GET /api/contacts/:id
// @access  Private
const getContactById = asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: {
      id: parseInt(req.params.id),
      isActive: true
    },
    include: {
      contactNotes: {
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true
            }
          },
          purchaseLog: {
            select: {
              id: true,
              purchasedDate: true,
              supplier: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
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
  const existingContact = await prisma.contact.findFirst({
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
    const contact = await prisma.contact.create({
      data: {
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
      }
    });

    // Invalidate orders-management tailors cache if a tailor was created
    if (type === 'tailor') {
      await invalidateOrdersManagementTailorsCache();
    }

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      contact
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contact',
      error: error.message
    });
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

  const contactId = parseInt(req.params.id);

  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        isActive: true
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Check for duplicate name within same type if name or type is being changed
    if (name && name !== contact.name && type && type !== contact.type) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          name,
          type,
          isActive: true,
          id: { not: contactId }
        }
      });

      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: `${type} with name "${name}" already exists`
        });
      }
    }

    const originalType = contact.type;

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        name: name || contact.name,
        type: type || contact.type,
        email: email !== undefined ? email : contact.email,
        phone: phone !== undefined ? phone : contact.phone,
        whatsappPhone: whatsappPhone !== undefined ? whatsappPhone : contact.whatsappPhone,
        address: address !== undefined ? address : contact.address,
        company: company !== undefined ? company : contact.company,
        position: position !== undefined ? position : contact.position,
        notes: notes !== undefined ? notes : contact.notes
      }
    });

    // Invalidate orders-management tailors cache if a tailor was updated or type changed
    if (originalType === 'tailor' || updatedContact.type === 'tailor') {
      await invalidateOrdersManagementTailorsCache();
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      contact: updatedContact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.message
    });
  }
});

// @desc    Delete contact (soft delete)
// @route   DELETE /api/contacts/:id
// @access  Private
const deleteContact = asyncHandler(async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        isActive: true
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Soft delete
    await prisma.contact.update({
      where: { id: contactId },
      data: { isActive: false }
    });

    // Invalidate orders-management tailors cache if a tailor was deleted
    if (contact.type === 'tailor') {
      await invalidateOrdersManagementTailorsCache();
    }

    res.json({
      success: true,
      message: `Contact "${contact.name}" deleted successfully`,
      contact: {
        id: contact.id,
        name: contact.name,
        type: contact.type,
        isActive: false
      }
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message
    });
  }
});

// @desc    Toggle contact active status
// @route   PATCH /api/contacts/:id/toggle-status
// @access  Private
const toggleContactStatus = asyncHandler(async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: { isActive: !contact.isActive }
    });

    // Invalidate orders-management tailors cache if a tailor status was changed
    if (contact.type === 'tailor') {
      await invalidateOrdersManagementTailorsCache();
    }

    res.json({
      success: true,
      message: `Contact ${updatedContact.isActive ? 'activated' : 'deactivated'} successfully`,
      contact: {
        id: updatedContact.id,
        name: updatedContact.name,
        type: updatedContact.type,
        isActive: updatedContact.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling contact status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle contact status',
      error: error.message
    });
  }
});

// @desc    Get contacts by type
// @route   GET /api/contacts/type/:type
// @access  Private
const getContactsByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { includeInactive = 'false' } = req.query;

  if (!['supplier', 'tailor', 'internal'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid contact type'
    });
  }

  try {
    const whereClause = { type };
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error(`Error fetching ${type} contacts:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${type} contacts`,
      error: error.message
    });
  }
});

// @desc    Search contacts by name
// @route   GET /api/contacts/search/:searchTerm
// @access  Private
const searchContacts = asyncHandler(async (req, res) => {
  const { searchTerm } = req.params;
  const { type } = req.query;

  try {
    const whereClause = {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      },
      isActive: true
    };

    if (type && ['supplier', 'tailor', 'internal'].includes(type)) {
      whereClause.type = type;
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: 20 // Limit results
    });

    res.json({
      success: true,
      contacts,
      searchTerm,
      count: contacts.length
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search contacts',
      error: error.message
    });
  }
});

// @desc    Add contact note
// @route   POST /api/contacts/:id/notes
// @access  Private
const addContactNote = asyncHandler(async (req, res) => {
  const { content, orderId, purchaseLogId } = req.body;
  const contactId = parseInt(req.params.id);

  if (!content) {
    return res.status(400).json({
      success: false,
      message: 'Note content is required'
    });
  }

  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        isActive: true
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const noteData = {
      content,
      contactId,
      createdBy: req.user.id
    };

    if (orderId) noteData.orderId = parseInt(orderId);
    if (purchaseLogId) noteData.purchaseLogId = parseInt(purchaseLogId);

    const note = await prisma.contactNote.create({
      data: noteData,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      note
    });
  } catch (error) {
    console.error('Error adding contact note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
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
  addContactNote
}; 