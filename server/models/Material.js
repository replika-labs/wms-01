const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const moment = require('moment');

const Material = sequelize.define('Material', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Auto-generated using pattern: [FABRIC_CODE]-[TOTAL_UNITS]-[STORE]-[DATE_YYYYMMDD]'
  },
  // New fields for Excel structure
  fabricTypeColor: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., SILK-ROSE GOLD, COTTON-NAVY BLUE (for lookup)'
  },
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Used for code generation (YYYYMMDD format)'
  },
  numberOfRolls: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Number of rolls/pieces'
  },
  totalUnits: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    comment: 'Total units purchased (used in code generation)'
  },
  store: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Store/supplier name (used in code generation)'
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Image URL or file path'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Purchase price per unit'
  },
  // Existing fields
  qtyOnHand: {
    type: DataTypes.DOUBLE,
    defaultValue: 0,
    comment: 'Current stock (mapped from Sisa/Remaining)'
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pcs',
  },
  safetyStock: {
    type: DataTypes.DOUBLE,
    defaultValue: 0,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'materials',
  timestamps: true,
  hooks: {
    beforeCreate: async (material, options) => {
      // Only generate code if all required fields are present
      if (!material.code && material.fabricTypeColor && material.purchaseDate && 
          material.totalUnits && material.store) {
        material.code = await Material.generateCode(material);
      }
      // Set qtyOnHand to totalUnits initially if totalUnits is provided
      if (!material.qtyOnHand && material.totalUnits) {
        material.qtyOnHand = material.totalUnits;
      }
    },
    beforeUpdate: async (material, options) => {
      // Only regenerate code if key fields changed and all required fields are present
      if ((material.changed('fabricTypeColor') || material.changed('totalUnits') || 
          material.changed('store') || material.changed('purchaseDate')) &&
          material.fabricTypeColor && material.purchaseDate && 
          material.totalUnits && material.store) {
        if (!material.dataValues.code || material.code === material._previousDataValues.code) {
          material.code = await Material.generateCode(material);
        }
      }
    }
  }
});

// Static method for code generation
Material.generateCode = async function(materialData) {
  try {
    const { FabricType } = require('./index');
    
    // Get fabric code from lookup
    const fabricCode = await FabricType.findByFabricName(materialData.fabricTypeColor);
    
    if (!fabricCode) {
      throw new Error(`Fabric type "${materialData.fabricTypeColor}" not found in lookup table`);
    }
    
    // Format date as YYYYMMDD
    const formattedDate = moment(materialData.purchaseDate).format('YYYYMMDD');
    
    // Generate code: [FABRIC_CODE]-[TOTAL_UNITS]-[STORE]-[DATE_YYYYMMDD]
    const code = `${fabricCode}-${materialData.totalUnits}-${materialData.store}-${formattedDate}`;
    
    return code;
  } catch (error) {
    console.error('Error generating material code:', error);
    throw error;
  }
};

// Instance method to regenerate code
Material.prototype.regenerateCode = async function() {
  this.code = await Material.generateCode(this);
  return this.code;
};

// Method to update stock
Material.prototype.updateStock = function(quantity, operation = 'add') {
  if (operation === 'add') {
    this.qtyOnHand += quantity;
  } else if (operation === 'subtract') {
    this.qtyOnHand = Math.max(0, this.qtyOnHand - quantity);
  } else {
    this.qtyOnHand = quantity; // set absolute value
  }
  return this.qtyOnHand;
};

// Method to check if stock is below safety level
Material.prototype.isBelowSafetyStock = function() {
  return this.qtyOnHand <= this.safetyStock;
};

module.exports = Material; 