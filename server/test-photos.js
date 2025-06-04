const { Product, ProductPhoto, Material } = require('./models');

async function testPhotos() {
  try {
    console.log('🔍 Testing Product-Photo relationship...');
    
    // Test 1: Replicate the exact API query
    const products = await Product.findAll({
      include: [
        { 
          model: Material,
          attributes: ['id', 'name', 'code']
        },
        {
          model: ProductPhoto,
          as: 'photos',
          attributes: ['id', 'photoUrl', 'thumbnailUrl', 'isMainPhoto', 'sortOrder'],
          where: { isActive: true },
          required: false,
          order: [['isMainPhoto', 'DESC'], ['sortOrder', 'ASC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Found ${products.length} products`);
    
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log(`📄 Product: ${firstProduct.name}`);
      console.log(`📸 Photos count: ${firstProduct.photos ? firstProduct.photos.length : 0}`);
      
      if (firstProduct.photos && firstProduct.photos.length > 0) {
        console.log('📷 Photo URLs:');
        firstProduct.photos.forEach((photo, index) => {
          console.log(`  ${index + 1}. Photo URL: ${photo.photoUrl}`);
          console.log(`     Thumbnail: ${photo.thumbnailUrl}`);
          console.log(`     Main: ${photo.isMainPhoto}`);
        });
      } else {
        console.log('❌ No photos found for this product');
      }
      
      // Full product JSON to see actual API response
      console.log('\n📝 Full API response format:');
      console.log(JSON.stringify(firstProduct, null, 2));
    }
    
    // Test 2: Check photo table directly
    const allPhotos = await ProductPhoto.findAll();
    console.log(`📸 Total photos in database: ${allPhotos.length}`);
    
    if (allPhotos.length > 0) {
      console.log('First photo:', allPhotos[0].toJSON());
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

testPhotos(); 