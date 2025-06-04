const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ContactNote = sequelize.define('ContactNote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'contacts',
      key: 'id'
    },
    comment: 'Reference to contact'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    },
    comment: 'Reference to order (if note is order-related)'
  },
  purchaseLogId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_logs',
      key: 'id'
    },
    comment: 'Reference to purchase log (if note is purchase-related)'
  },
  noteType: {
    type: DataTypes.ENUM('general', 'order', 'purchase', 'performance', 'communication'),
    defaultValue: 'general',
    allowNull: false,
    validate: {
      isIn: [['general', 'order', 'purchase', 'performance', 'communication']]
    },
    comment: 'Type of note'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Note title/subject'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 5000]
    },
    comment: 'Note content'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false,
    validate: {
      isIn: [['low', 'medium', 'high', 'urgent']]
    },
    comment: 'Note priority level'
  },
  isFollowUpRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether follow-up is required'
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true,
      isAfterToday(value) {
        if (value && this.isFollowUpRequired) {
          const inputDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          inputDate.setHours(0, 0, 0, 0);
          
          if (inputDate < today) {
            throw new Error('Follow-up date cannot be in the past');
          }
        }
      }
    },
    comment: 'Follow-up due date'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created the note'
  }
}, {
  tableName: 'contact_notes',
  timestamps: true,
  indexes: [
    {
      name: 'idx_contact_notes_contact',
      fields: ['contactId']
    },
    {
      name: 'idx_contact_notes_order',
      fields: ['orderId']
    },
    {
      name: 'idx_contact_notes_purchase',
      fields: ['purchaseLogId']
    },
    {
      name: 'idx_contact_notes_type',
      fields: ['noteType']
    },
    {
      name: 'idx_contact_notes_creator',
      fields: ['createdBy']
    },
    {
      name: 'idx_contact_notes_followup',
      fields: ['followUpDate']
    }
  ]
});

// Instance methods
ContactNote.prototype.isOverdue = function() {
  if (!this.isFollowUpRequired || !this.followUpDate) return false;
  return new Date() > new Date(this.followUpDate);
};

ContactNote.prototype.isDueSoon = function(daysAhead = 3) {
  if (!this.isFollowUpRequired || !this.followUpDate) return false;
  const today = new Date();
  const dueDate = new Date(this.followUpDate);
  const timeDiff = dueDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff <= daysAhead && daysDiff >= 0;
};

ContactNote.prototype.markFollowUpComplete = function() {
  return this.update({
    isFollowUpRequired: false,
    followUpDate: null
  });
};

// Static methods
ContactNote.findByContact = function(contactId, noteType = null) {
  const where = { contactId };
  if (noteType) {
    where.noteType = noteType;
  }
  
  return this.findAll({
    where,
    include: [
      {
        association: 'CreatedByUser',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

ContactNote.findByOrder = function(orderId) {
  return this.findAll({
    where: { orderId },
    include: [
      {
        association: 'Contact',
        attributes: ['id', 'name', 'type']
      },
      {
        association: 'CreatedByUser',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

ContactNote.findByPurchaseLog = function(purchaseLogId) {
  return this.findAll({
    where: { purchaseLogId },
    include: [
      {
        association: 'Contact',
        attributes: ['id', 'name', 'type']
      },
      {
        association: 'CreatedByUser',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

ContactNote.getOverdueFollowUps = function() {
  return this.findAll({
    where: {
      isFollowUpRequired: true,
      followUpDate: {
        [sequelize.Op.lt]: new Date()
      }
    },
    include: [
      {
        association: 'Contact',
        attributes: ['id', 'name', 'type', 'whatsappPhone']
      },
      {
        association: 'CreatedByUser',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['followUpDate', 'ASC']]
  });
};

ContactNote.getDueSoonFollowUps = function(daysAhead = 3) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);
  
  return this.findAll({
    where: {
      isFollowUpRequired: true,
      followUpDate: {
        [sequelize.Op.between]: [today, futureDate]
      }
    },
    include: [
      {
        association: 'Contact',
        attributes: ['id', 'name', 'type', 'whatsappPhone']
      },
      {
        association: 'CreatedByUser',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['followUpDate', 'ASC']]
  });
};

module.exports = ContactNote; 