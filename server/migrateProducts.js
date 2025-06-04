const { sequelize } = require('./config/database');

async function migrateProducts() {
    try {
        console.log('Starting Product migration...');
        
        // Check existing columns first
        console.log('Checking existing columns...');
        const [existingColumns] = await sequelize.query('DESCRIBE products');
        const columnNames = existingColumns.map(col => col.Field);
        console.log('Existing columns:', columnNames);

        // Add new columns to products table one by one
        if (!columnNames.includes('materialId')) {
            console.log('Adding materialId column...');
            await sequelize.query(`
                ALTER TABLE products 
                ADD COLUMN materialId INTEGER NULL COMMENT 'Reference to base material'
            `);
            console.log('✓ materialId column added');
        } else {
            console.log('✓ materialId column already exists');
        }

        if (!columnNames.includes('category')) {
            console.log('Adding category column...');
            await sequelize.query(`
                ALTER TABLE products 
                ADD COLUMN category VARCHAR(255) NULL COMMENT 'Product category'
            `);
            console.log('✓ category column added');
        } else {
            console.log('✓ category column already exists');
        }

        if (!columnNames.includes('price')) {
            console.log('Adding price column...');
            await sequelize.query(`
                ALTER TABLE products 
                ADD COLUMN price DECIMAL(10,2) NULL COMMENT 'Base price'
            `);
            console.log('✓ price column added');
        } else {
            console.log('✓ price column already exists');
        }

        // Create product_colours table
        console.log('Creating product_colours table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS product_colours (
                id INTEGER AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(255) NOT NULL COMMENT 'Color code (e.g., RD, BL, GR)',
                colourName VARCHAR(255) NOT NULL COMMENT 'Color name (e.g., Red, Blue, Green)',
                notes TEXT COMMENT 'Additional notes about this color variant',
                productId INTEGER NOT NULL COMMENT 'Reference to the parent product',
                isActive TINYINT(1) DEFAULT 1,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE KEY unique_product_colour_code (productId, code)
            ) ENGINE=InnoDB
        `);
        console.log('✓ product_colours table created');

        // Create product_variations table
        console.log('Creating product_variations table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS product_variations (
                id INTEGER AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(255) NOT NULL COMMENT 'Variation code (e.g., S, M, L, XL)',
                size VARCHAR(255) NOT NULL COMMENT 'Size or variation name',
                additionalPrice DECIMAL(10,2) DEFAULT 0 COMMENT 'Additional price for this variation',
                productId INTEGER NOT NULL COMMENT 'Reference to the parent product',
                isActive TINYINT(1) DEFAULT 1,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE KEY unique_product_variation_code (productId, code)
            ) ENGINE=InnoDB
        `);
        console.log('✓ product_variations table created');

        // Add foreign key constraint for materialId (if not exists)
        try {
            await sequelize.query(`
                ALTER TABLE products 
                ADD CONSTRAINT fk_products_materialId 
                FOREIGN KEY (materialId) REFERENCES materials(id) ON DELETE SET NULL
            `);
            console.log('✓ Foreign key constraint added');
        } catch (error) {
            if (error.original && error.original.code === 'ER_DUP_KEYNAME') {
                console.log('✓ Foreign key constraint already exists');
            } else {
                console.log('⚠ Could not add foreign key constraint:', error.message);
            }
        }

        console.log('\n✅ Product migration completed successfully!');
        
        // Verify the structure
        console.log('\n📋 Verifying table structures...');
        const [productsStructure] = await sequelize.query('DESCRIBE products');
        console.log('Products table columns:', productsStructure.map(col => col.Field));
        
        const [tables] = await sequelize.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Available tables:', tableNames);
        
        if (tableNames.includes('product_colours')) {
            console.log('✓ product_colours table exists');
        }
        if (tableNames.includes('product_variations')) {
            console.log('✓ product_variations table exists');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the migration
migrateProducts(); 