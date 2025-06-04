const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Inventaris = sequelize.define('Inventaris', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  qty: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'inventaris',
  timestamps: true,
});

module.exports = Inventaris; 