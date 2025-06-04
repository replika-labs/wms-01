const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'wms_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log
  }
);

async function migrateMaterialsData() {
  try {
    console.log('🚀 Starting materials data migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all data from old materials table
    const [oldMaterials] = await sequelize.query(`
      SELECT * FROM materials ORDER BY id
    `);

    console.log(`📊 Found ${oldMaterials.length} records in materials table`);

    // Process each material record
    for (const material of oldMaterials) {
      console.log(`\n🔄 Processing material ID ${material.id}: ${material.name}`);
      
      // Parse name and color from existing data
      const { name, color, fabricTypeColor } = parseMaterialName(material.name);
      
      // Check if record already exists in materials_new
      const [existingRecords] = await sequelize.query(`
        SELECT id FROM materials_new 
        WHERE name = :name AND color = :color
      `, {
        replacements: { name, color }
      });

      if (existingRecords.length > 0) {
        console.log(`⚠️  Record already exists in materials_new, updating...`);
        
        // Update existing record
        await sequelize.query(`
          UPDATE materials_new SET
            code = :code,
            qtyOnHand = :qtyOnHand,
            safetyStock = :safetyStock,
            price = :price,
            fabricTypeColor = :fabricTypeColor,
            unit = :unit,
            description = :description,
            image = :image,
            updatedAt = NOW()
          WHERE name = :name AND color = :color
        `, {
          replacements: {
            code: material.code,
            qtyOnHand: material.qtyOnHand || 0,
            safetyStock: material.safetyStock || 0,
            price: material.price,
            fabricTypeColor: fabricTypeColor,
            unit: material.unit || 'pcs',
            description: material.description,
            image: material.image,
            name: name,
            color: color
          }
        });
        
        console.log(`✅ Updated existing record`);
      } else {
        // Insert new record
        await sequelize.query(`
          INSERT INTO materials_new (
            name, color, code, qtyOnHand, safetyStock, price, 
            fabricTypeColor, unit, description, image, 
            createdAt, updatedAt
          ) VALUES (
            :name, :color, :code, :qtyOnHand, :safetyStock, :price,
            :fabricTypeColor, :unit, :description, :image,
            NOW(), NOW()
          )
        `, {
          replacements: {
            name: name,
            color: color,
            code: material.code,
            qtyOnHand: material.qtyOnHand || 0,
            safetyStock: material.safetyStock || 0,
            price: material.price,
            fabricTypeColor: fabricTypeColor,
            unit: material.unit || 'pcs',
            description: material.description,
            image: material.image
          }
        });
        
        console.log(`✅ Inserted new record: ${name} - ${color}`);
      }
    }

    // Verify migration results
    const [newCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM materials_new
    `);
    
    console.log(`\n📊 Migration completed!`);
    console.log(`📈 Total records in materials_new: ${newCount[0].count}`);
    
    // Show sample of migrated data
    const [sampleData] = await sequelize.query(`
      SELECT id, name, color, code, qtyOnHand, price 
      FROM materials_new 
      ORDER BY id 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample migrated data:');
    console.table(sampleData);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

function parseMaterialName(fullName) {
  // Parse complex material names into name and color components
  // Examples:
  // "Premium Silk Rose Gold Fabric" -> name: "SILK", color: "ROSE GOLD"
  // "Cotton Navy Blue Fabric" -> name: "COTTON", color: "NAVY BLUE"
  // "Elegant Silver Silk Material" -> name: "SILK", color: "SILVER"
  
  const lowerName = fullName.toLowerCase();
  let name = 'UNKNOWN';
  let color = 'DEFAULT';
  
  // Detect material type
  if (lowerName.includes('silk')) {
    name = 'SILK';
  } else if (lowerName.includes('cotton')) {
    name = 'COTTON';
  } else if (lowerName.includes('polyester')) {
    name = 'POLYESTER';
  } else if (lowerName.includes('linen')) {
    name = 'LINEN';
  } else if (lowerName.includes('wool')) {
    name = 'WOOL';
  }
  
  // Detect color
  if (lowerName.includes('rose gold')) {
    color = 'ROSE GOLD';
  } else if (lowerName.includes('silver')) {
    color = 'SILVER';
  } else if (lowerName.includes('navy blue')) {
    color = 'NAVY BLUE';
  } else if (lowerName.includes('gold')) {
    color = 'GOLD';
  } else if (lowerName.includes('blue')) {
    color = 'BLUE';
  } else if (lowerName.includes('red')) {
    color = 'RED';
  } else if (lowerName.includes('green')) {
    color = 'GREEN';
  } else if (lowerName.includes('black')) {
    color = 'BLACK';
  } else if (lowerName.includes('white')) {
    color = 'WHITE';
  } else if (lowerName.includes('pink')) {
    color = 'PINK';
  } else if (lowerName.includes('purple')) {
    color = 'PURPLE';
  }
  
  // Create fabricTypeColor for compatibility
  const fabricTypeColor = `${name}-${color}`;
  
  return { name, color, fabricTypeColor };
}

// Run migration if called directly
if (require.main === module) {
  migrateMaterialsData()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateMaterialsData, parseMaterialName }; 