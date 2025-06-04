const { sequelize } = require('./config/database');

async function runMigration() {
    try {
        console.log('🚀 Creating product_photos table...');
        
        // Create the table directly
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS product_photos (
                id INTEGER AUTO_INCREMENT PRIMARY KEY,
                productId INTEGER NOT NULL,
                photoUrl VARCHAR(500) NOT NULL COMMENT 'URL/path to the main photo',
                thumbnailUrl VARCHAR(500) NULL COMMENT 'URL/path to the thumbnail version',
                isMainPhoto BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'Whether this is the main display photo for the product',
                sortOrder INTEGER DEFAULT 0 NOT NULL COMMENT 'Order for displaying photos (0 = first)',
                originalFileName VARCHAR(255) NULL COMMENT 'Original filename when uploaded',
                fileSize INTEGER NULL COMMENT 'File size in bytes',
                mimeType VARCHAR(100) NULL COMMENT 'MIME type of the file',
                uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT 'When the photo was uploaded',
                isActive BOOLEAN DEFAULT TRUE NOT NULL COMMENT 'Whether the photo is active/visible',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                INDEX idx_product_main (productId, isMainPhoto),
                INDEX idx_product_sort (productId, sortOrder),
                INDEX idx_product_active (productId, isActive)
            ) ENGINE=InnoDB;
        `);

        console.log('✅ product_photos table created successfully!');
        
        // Verify the table
        const [tables] = await sequelize.query('SHOW TABLES LIKE "product_photos"');
        if (tables.length > 0) {
            console.log('✅ Table verified to exist');
            
            // Show table structure
            const [columns] = await sequelize.query('DESCRIBE product_photos');
            console.log('📋 Table structure:');
            columns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

runMigration(); 