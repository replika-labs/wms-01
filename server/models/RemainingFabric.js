const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RemainingFabric = sequelize.define('RemainingFabric', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  qtyRemaining: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  note: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'remaining_fabrics',
  timestamps: true,
});

module.exports = RemainingFabric; 