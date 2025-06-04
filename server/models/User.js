const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  whatsappPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'WhatsApp phone number for user communication'
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('admin', 'penjahit'),
    allowNull: false,
    defaultValue: 'penjahit',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  loginEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User; 