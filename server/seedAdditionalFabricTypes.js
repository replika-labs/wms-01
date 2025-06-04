const { sequelize } = require('./config/database');
const { FabricType } = require('./models');

async function seedAdditionalFabricTypes() {
    try {
        console.log('Seeding additional FabricType data...');
        
        // Additional fabric type data for the materials
        const additionalFabricTypeData = [
            { fabricName: 'CHIFFON-PINK', fabricCode: 'CHF-PNK', description: 'Chiffon fabric in pink color' },
            { fabricName: 'LINEN-BEIGE', fabricCode: 'LIN-BGE', description: 'Linen fabric in beige color' },
            { fabricName: 'SATIN-WHITE', fabricCode: 'STN-WHT', description: 'Satin fabric in white color' },
            { fabricName: 'VELVET-BURGUNDY', fabricCode: 'VLV-BRG', description: 'Velvet fabric in burgundy color' },
            { fabricName: 'GEORGETTE-CREAM', fabricCode: 'GRG-CRM', description: 'Georgette fabric in cream color' },
            { fabricName: 'DENIM-BLUE', fabricCode: 'DNM-BLU', description: 'Denim fabric in blue color' }
        ];

        for (const fabricTypeData of additionalFabricTypeData) {
            try {
                // Check if fabric type already exists
                const existing = await FabricType.findOne({ 
                    where: { fabricName: fabricTypeData.fabricName } 
                });
                
                if (!existing) {
                    const fabricType = await FabricType.create(fabricTypeData);
                    console.log(`✓ Created fabric type: ${fabricType.fabricName} → ${fabricType.fabricCode}`);
                } else {
                    console.log(`⚠ Fabric type already exists: ${fabricTypeData.fabricName}`);
                }
            } catch (error) {
                console.error(`✗ Failed to create fabric type ${fabricTypeData.fabricName}:`, error.message);
            }
        }

        console.log('\n✅ Additional FabricType data seeding completed!');
        
        // Display summary
        const totalFabricTypes = await FabricType.count();
        console.log(`📊 Total fabric types in database: ${totalFabricTypes}`);

    } catch (error) {
        console.error('❌ Error seeding additional fabric types:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the seeder
seedAdditionalFabricTypes(); 