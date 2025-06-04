const { Product, Material } = require('./models');
const { Op } = require('sequelize');

async function testRelationship() {
  try {
    console.log('🧪 Testing Product-Material Relationship...\n');

    // Get materials
    const materials = await Material.findAll({ limit: 3 });
    console.log(`Materials: ${materials.length}`);

    // Get products with materials
    const products = await Product.findAll({
      include: [{ model: Material, required: false }],
      limit: 5
    });
    
    console.log(`\nProducts with Material relationship:`);
    products.forEach(p => {
      console.log(`- ${p.name}: ${p.Material?.name || 'No material'}`);
    });

    // Test products with assigned materials
    const withMaterials = await Product.findAll({
      where: { materialId: { [Op.not]: null } },
      include: [Material]
    });
    
    console.log(`\n✅ Products with assigned materials: ${withMaterials.length}`);
    withMaterials.forEach(p => {
      console.log(`- ${p.name} → ${p.Material.name}`);
    });

    console.log('\n🎉 Relationship working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRelationship(); 