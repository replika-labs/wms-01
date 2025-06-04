const { sequelize } = require('./config/database');
const { Material, FabricType } = require('./models');

async function seedMaterialsData() {
    try {
        console.log('Seeding enhanced Materials data...');
        
        // Clear existing materials first
        await Material.destroy({ where: {} });
        
        // Sample enhanced materials data
        const materialsData = [
            {
                name: 'Premium Silk Rose Gold Fabric',
                fabricTypeColor: 'SILK-ROSE GOLD',
                purchaseDate: '2025-01-15',
                numberOfRolls: 3,
                totalUnits: 60,
                unit: 'meter',
                store: 'Hijabertex',
                image: 'https://example.com/silk-rose-gold.jpg',
                price: 125000,
                qtyOnHand: 45,
                safetyStock: 10,
                description: 'Premium quality silk fabric in rose gold color for luxury hijabs'
            },
            {
                name: 'Elegant Silver Silk Material',
                fabricTypeColor: 'SILK-SILVER',
                purchaseDate: '2025-01-20',
                numberOfRolls: 2,
                totalUnits: 40,
                unit: 'meter',
                store: 'Fabric Paradise',
                image: 'https://example.com/silk-silver.jpg',
                price: 115000,
                qtyOnHand: 35,
                safetyStock: 8,
                description: 'Elegant silver silk fabric perfect for formal wear'
            },
            {
                name: 'Cotton Navy Blue Fabric',
                fabricTypeColor: 'COTTON-NAVY BLUE',
                purchaseDate: '2025-01-10',
                numberOfRolls: 5,
                totalUnits: 100,
                unit: 'meter',
                store: 'Cotton World',
                image: 'https://example.com/cotton-navy.jpg',
                price: 45000,
                qtyOnHand: 85,
                safetyStock: 15,
                description: 'High-quality cotton fabric in navy blue for casual wear'
            },
            {
                name: 'Polyester Black Fabric',
                fabricTypeColor: 'POLYESTER-BLACK',
                purchaseDate: '2025-01-25',
                numberOfRolls: 4,
                totalUnits: 80,
                unit: 'meter',
                store: 'Modern Textiles',
                image: 'https://example.com/polyester-black.jpg',
                price: 35000,
                qtyOnHand: 70,
                safetyStock: 12,
                description: 'Durable polyester fabric in classic black'
            },
            {
                name: 'Chiffon Pink Fabric',
                fabricTypeColor: 'CHIFFON-PINK',
                purchaseDate: '2025-01-18',
                numberOfRolls: 3,
                totalUnits: 45,
                unit: 'meter',
                store: 'Delicate Fabrics',
                image: 'https://example.com/chiffon-pink.jpg',
                price: 85000,
                qtyOnHand: 40,
                safetyStock: 5,
                description: 'Soft and flowing chiffon fabric in beautiful pink'
            },
            {
                name: 'Linen Beige Natural Fabric',
                fabricTypeColor: 'LINEN-BEIGE',
                purchaseDate: '2025-01-12',
                numberOfRolls: 2,
                totalUnits: 30,
                unit: 'meter',
                store: 'Natural Textiles',
                image: 'https://example.com/linen-beige.jpg',
                price: 95000,
                qtyOnHand: 25,
                safetyStock: 5,
                description: 'Natural linen fabric in neutral beige tone'
            },
            {
                name: 'Satin White Fabric',
                fabricTypeColor: 'SATIN-WHITE',
                purchaseDate: '2025-01-22',
                numberOfRolls: 3,
                totalUnits: 50,
                unit: 'meter',
                store: 'Luxury Fabrics',
                image: 'https://example.com/satin-white.jpg',
                price: 105000,
                qtyOnHand: 45,
                safetyStock: 8,
                description: 'Luxurious satin fabric in pure white'
            },
            {
                name: 'Velvet Burgundy Fabric',
                fabricTypeColor: 'VELVET-BURGUNDY',
                purchaseDate: '2025-01-08',
                numberOfRolls: 2,
                totalUnits: 25,
                unit: 'meter',
                store: 'Premium Textiles',
                image: 'https://example.com/velvet-burgundy.jpg',
                price: 155000,
                qtyOnHand: 20,
                safetyStock: 3,
                description: 'Rich velvet fabric in deep burgundy color'
            },
            {
                name: 'Georgette Cream Fabric',
                fabricTypeColor: 'GEORGETTE-CREAM',
                purchaseDate: '2025-01-14',
                numberOfRolls: 4,
                totalUnits: 60,
                unit: 'meter',
                store: 'Elegant Fabrics',
                image: 'https://example.com/georgette-cream.jpg',
                price: 75000,
                qtyOnHand: 55,
                safetyStock: 10,
                description: 'Lightweight georgette fabric in cream color'
            },
            {
                name: 'Denim Blue Fabric',
                fabricTypeColor: 'DENIM-BLUE',
                purchaseDate: '2025-01-16',
                numberOfRolls: 6,
                totalUnits: 120,
                unit: 'meter',
                store: 'Casual Textiles',
                image: 'https://example.com/denim-blue.jpg',
                price: 55000,
                qtyOnHand: 100,
                safetyStock: 20,
                description: 'Classic denim fabric in traditional blue'
            }
        ];

        // Create materials with auto-generated codes
        for (const materialData of materialsData) {
            try {
                const material = await Material.create(materialData);
                console.log(`✓ Created material: ${material.name} with code: ${material.code}`);
            } catch (error) {
                console.error(`✗ Failed to create material ${materialData.name}:`, error.message);
            }
        }

        console.log('\n✅ Enhanced Materials data seeding completed!');
        
        // Display summary
        const totalMaterials = await Material.count();
        console.log(`📊 Total materials in database: ${totalMaterials}`);
        
        // Show some examples with generated codes
        const sampleMaterials = await Material.findAll({ 
            limit: 3,
            attributes: ['name', 'code', 'fabricTypeColor', 'totalUnits', 'store', 'purchaseDate']
        });
        
        console.log('\n📋 Sample materials with auto-generated codes:');
        sampleMaterials.forEach(material => {
            console.log(`  • ${material.name}`);
            console.log(`    Code: ${material.code}`);
            console.log(`    Fabric: ${material.fabricTypeColor}`);
            console.log(`    Store: ${material.store}`);
            console.log(`    Units: ${material.totalUnits}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error seeding materials data:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the seeder
seedMaterialsData(); 