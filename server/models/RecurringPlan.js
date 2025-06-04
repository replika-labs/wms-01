const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RecurringPlan = sequelize.define('RecurringPlan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  frequency: {
    type: DataTypes.ENUM('WEEKLY', 'MONTHLY'),
    allowNull: false,
  },
  dayOfWeek: {
    type: DataTypes.ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'),
    allowNull: true,
  },
  dayOfMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nextRun: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'recurring_plans',
  timestamps: true,
});

module.exports = RecurringPlan; 