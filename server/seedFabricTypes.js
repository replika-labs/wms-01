const { sequelize } = require('./config/database');
const { FabricType } = require('./models');

async function seedFabricTypes() {
    try {
        console.log('Seeding FabricType data...');
        
        // Initial fabric type data based on Excel examples and common fabric types
        const fabricTypeData = [
            // From Excel examples
            { fabricName: 'SILK-ROSE GOLD', fabricCode: 'PSK-RSGD', description: 'Premium silk fabric in rose gold color' },
            { fabricName: 'SILK-SILVER', fabricCode: 'PSK-SLVR', description: 'Premium silk fabric in silver color' },
            
            // Additional common fabric types for demo
            { fabricName: 'COTTON-NAVY BLUE', fabricCode: 'CTN-NVY', description: 'Cotton fabric in navy blue color' },
            { fabricName: 'COTTON-BLACK', fabricCode: 'CTN-BLK', description: 'Cotton fabric in black color' },
            { fabricName: 'COTTON-WHITE', fabricCode: 'CTN-WHT', description: 'Cotton fabric in white color' },
            { fabricName: 'POLYESTER-RED', fabricCode: 'PLY-RED', description: 'Polyester fabric in red color' },
            { fabricName: 'POLYESTER-PURPLE', fabricCode: 'PLY-PPL', description: 'Polyester fabric in purple color' },
            { fabricName: 'LINEN-WHITE', fabricCode: 'LNN-WHT', description: 'Linen fabric in white color' },
            { fabricName: 'LINEN-BEIGE', fabricCode: 'LNN-BGE', description: 'Linen fabric in beige color' },
            { fabricName: 'SILK-EMERALD GREEN', fabricCode: 'PSK-EMR', description: 'Premium silk fabric in emerald green color' },
            { fabricName: 'SILK-GOLD', fabricCode: 'PSK-GLD', description: 'Premium silk fabric in gold color' },
            { fabricName: 'DENIM-BLUE', fabricCode: 'DNM-BLU', description: 'Denim fabric in blue color' },
            { fabricName: 'SATIN-PINK', fabricCode: 'STN-PNK', description: 'Satin fabric in pink color' },
            { fabricName: 'VELVET-MAROON', fabricCode: 'VLT-MRN', description: 'Velvet fabric in maroon color' },
            { fabricName: 'CHIFFON-CREAM', fabricCode: 'CHF-CRM', description: 'Chiffon fabric in cream color' }
        ];
        
        // Check if any fabric types already exist
        const existingCount = await FabricType.count();
        
        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing fabric types. Skipping seed...`);
            return;
        }
        
        // Insert fabric types
        const createdFabricTypes = await FabricType.bulkCreate(fabricTypeData, {
            ignoreDuplicates: true
        });
        
        console.log(`✅ Successfully seeded ${createdFabricTypes.length} fabric types:`);
        createdFabricTypes.forEach(ft => {
            console.log(`   - ${ft.fabricName} → ${ft.fabricCode}`);
        });
        
    } catch (error) {
        console.error('❌ Error seeding fabric types:', error);
        throw error;
    }
}

// Run seeder if called directly
if (require.main === module) {
    seedFabricTypes()
        .then(() => {
            console.log('✅ Seeding completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { seedFabricTypes }; 