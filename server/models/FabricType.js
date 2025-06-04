const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const FabricType = sequelize.define('FabricType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fabricName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'e.g., SILK-ROSE GOLD, COTTON-NAVY BLUE'
  },
  fabricCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'e.g., PSK-RSGD, CTN-NVY'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'fabric_types',
  timestamps: true,
});

// Class methods for lookup functionality
FabricType.findByFabricName = async function(fabricName) {
  const fabricType = await this.findOne({
    where: { 
      fabricName: fabricName,
      isActive: true 
    }
  });
  return fabricType ? fabricType.fabricCode : null;
};

FabricType.searchByName = async function(searchTerm) {
  return await this.findAll({
    where: {
      fabricName: {
        [require('sequelize').Op.iLike]: `%${searchTerm}%`
      },
      isActive: true
    },
    order: [['fabricName', 'ASC']]
  });
};

module.exports = FabricType; 