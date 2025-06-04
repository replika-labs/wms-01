const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProgressReport = sequelize.define('ProgressReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  pcsFinished: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resiPengiriman: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  note: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tailorName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reportedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'progress_reports',
  timestamps: false,
});

module.exports = ProgressReport; 