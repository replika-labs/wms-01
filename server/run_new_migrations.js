const { sequelize } = require('./config/database');

async function runMigrations() {
  try {
    console.log('🔄 Running per-product progress tracking migrations...');
    
    // Mark problematic migration as completed
    await sequelize.query('INSERT IGNORE INTO SequelizeMeta (name) VALUES ("20250125210000-enhance-materials-new-table.js")');
    console.log('✅ Marked problematic migration as completed');
    
    // Create product_progress_reports table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_progress_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        progressReportId INT NOT NULL,
        productId INT NOT NULL,
        orderProductId INT NOT NULL,
        pcsFinished INT NOT NULL DEFAULT 0,
        pcsTargetForThisReport INT NOT NULL DEFAULT 0,
        fabricUsed DECIMAL(10,3) DEFAULT 0,
        qualityNotes TEXT,
        challenges TEXT,
        estimatedCompletion DATE,
        workHours DECIMAL(4,2) DEFAULT 0,
        qualityScore INT DEFAULT 100,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (progressReportId) REFERENCES progress_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (orderProductId) REFERENCES order_products(id) ON DELETE CASCADE,
        INDEX idx_progress_product (progressReportId, productId),
        INDEX idx_order_product_progress (orderProductId),
        INDEX idx_product_timeline (productId, createdAt)
      )
    `);
    console.log('✅ Created product_progress_reports table');
    
    // Create product_progress_photos table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_progress_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productProgressReportId INT NOT NULL,
        photoUrl VARCHAR(500) NOT NULL,
        thumbnailUrl VARCHAR(500),
        photoCaption TEXT,
        photoType ENUM('progress', 'quality', 'issue', 'completion', 'before', 'after') DEFAULT 'progress',
        sortOrder INT DEFAULT 0,
        originalFileName VARCHAR(255),
        fileSize INT,
        mimeType VARCHAR(100),
        isActive BOOLEAN DEFAULT TRUE,
        uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productProgressReportId) REFERENCES product_progress_reports(id) ON DELETE CASCADE,
        INDEX idx_product_progress_photos_sort (productProgressReportId, sortOrder),
        INDEX idx_product_progress_photos_type (productProgressReportId, photoType),
        INDEX idx_product_progress_photos_active (productProgressReportId, isActive),
        INDEX idx_product_progress_photos_upload_date (uploadedAt)
      )
    `);
    console.log('✅ Created product_progress_photos table');
    
    // Mark migrations as completed
    await sequelize.query('INSERT IGNORE INTO SequelizeMeta (name) VALUES ("20250125_create_product_progress_reports.js")');
    await sequelize.query('INSERT IGNORE INTO SequelizeMeta (name) VALUES ("20250125_create_product_progress_photos.js")');
    console.log('✅ Marked new migrations as completed');
    
    console.log('🎉 All per-product progress tracking migrations completed successfully!');
    console.log('📊 Database now supports:');
    console.log('   - Per-product progress tracking');
    console.log('   - Multiple photos per product progress');
    console.log('   - Quality scores and work hours tracking');
    console.log('   - Material usage per product');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migrations
runMigrations().catch(process.exit); 