const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function fixThumbnail() {
  try {
    const originalImagePath = path.join(__dirname, 'uploads/products/3206 D - Copy - Copy_1747974700545.jpg');
    const thumbnailDir = path.join(__dirname, 'uploads/products/thumbnails');
    const thumbnailPath = path.join(thumbnailDir, '3206 D - Copy - Copy_1747974700545_thumb.jpg');
    
    console.log('🔧 Fixing missing thumbnail...');
    console.log('Original:', originalImagePath);
    console.log('Thumbnail:', thumbnailPath);
    
    // Check if original file exists
    if (!fs.existsSync(originalImagePath)) {
      console.error('❌ Original image not found');
      return;
    }
    
    // Ensure thumbnail directory exists
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
      console.log('📁 Created thumbnails directory');
    }
    
    // Generate thumbnail
    await sharp(originalImagePath)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
      
    console.log('✅ Thumbnail generated successfully!');
    
    // Verify thumbnail exists
    if (fs.existsSync(thumbnailPath)) {
      const stats = fs.statSync(thumbnailPath);
      console.log(`📊 Thumbnail size: ${stats.size} bytes`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing thumbnail:', error);
  }
}

fixThumbnail(); 