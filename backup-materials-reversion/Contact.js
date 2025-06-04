const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    },
    comment: 'Contact name'
  },
  type: {
    type: DataTypes.ENUM('supplier', 'tailor', 'internal'),
    allowNull: false,
    validate: {
      isIn: [['supplier', 'tailor', 'internal']]
    },
    comment: 'Contact type - supplier, tailor, or internal'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: 'Email address'
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Phone number'
  },
  whatsappPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'WhatsApp phone number'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Physical address'
  },
  company: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Company name'
  },
  position: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Position/role in company'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'General notes about contact'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Active status'
  }
}, {
  tableName: 'contacts',
  timestamps: true,
  indexes: [
    {
      name: 'idx_contacts_type',
      fields: ['type']
    },
    {
      name: 'idx_contacts_name',
      fields: ['name']
    },
    {
      name: 'idx_contacts_active',
      fields: ['isActive']
    }
  ]
});

// Instance methods
Contact.prototype.getDisplayName = function() {
  return this.company ? `${this.name} (${this.company})` : this.name;
};

Contact.prototype.getWhatsAppUrl = function() {
  if (!this.whatsappPhone) return null;
  const cleanPhone = this.whatsappPhone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
};

Contact.prototype.toggleActive = function() {
  return this.update({ isActive: !this.isActive });
};

// Static methods
Contact.findByType = function(type, includeInactive = false) {
  const where = { type };
  if (!includeInactive) {
    where.isActive = true;
  }
  
  return this.findAll({
    where,
    order: [['name', 'ASC']]
  });
};

Contact.searchByName = function(searchTerm, type = null) {
  const where = {
    isActive: true,
    [sequelize.Op.or]: [
      { name: { [sequelize.Op.like]: `%${searchTerm}%` } },
      { company: { [sequelize.Op.like]: `%${searchTerm}%` } }
    ]
  };
  
  if (type) {
    where.type = type;
  }
  
  return this.findAll({
    where,
    order: [['name', 'ASC']]
  });
};

Contact.getStatsByType = function() {
  return this.findAll({
    attributes: [
      'type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN isActive = true THEN 1 END')), 'activeCount']
    ],
    group: ['type'],
    raw: true
  });
};

Contact.getSuppliers = function() {
  return this.findByType('supplier');
};

Contact.getTailors = function() {
  return this.findByType('tailor');
};

Contact.getInternalContacts = function() {
  return this.findByType('internal');
};

module.exports = Contact; 