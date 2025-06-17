const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = require('docx')
const fs = require('fs')

/**
 * Generate database implementation documentation in DOCX format
 * Based on Prisma schema models
 */
async function generateDatabaseImplementationDocx() {
    // Database models with their field implementations
    const models = [
        {
            name: 'User',
            description: 'Tabel untuk menyimpan data pengguna sistem',
            primaryKey: 'id',
            foreignKey: '',
            fieldCount: 11,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id pengguna', type: 'int(10)', null: 'No' },
                { name: 'name', description: 'Field mengidentifikasi nama pengguna', type: 'varchar(191)', null: 'No' },
                { name: 'email', description: 'Field mengidentifikasi email pengguna', type: 'varchar(191)', null: 'No' },
                { name: 'phone', description: 'Field mengidentifikasi nomor telepon pengguna', type: 'varchar(191)', null: 'Yes' },
                { name: 'whatsappPhone', description: 'Field mengidentifikasi nomor WhatsApp pengguna', type: 'varchar(191)', null: 'Yes' },
                { name: 'passwordHash', description: 'Field mengidentifikasi hash password pengguna', type: 'varchar(191)', null: 'Yes' },
                { name: 'role', description: 'Field mengidentifikasi peran pengguna', type: 'enum', null: 'No' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif pengguna', type: 'boolean', null: 'No' },
                { name: 'loginEnabled', description: 'Field mengidentifikasi izin login pengguna', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' },
                { name: 'updatedAt', description: 'Field mengidentifikasi waktu pembaruan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'Material',
            description: 'Tabel untuk menyimpan data material/bahan baku',
            primaryKey: 'id',
            foreignKey: '',
            fieldCount: 15,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id material', type: 'int(10)', null: 'No' },
                { name: 'name', description: 'Field mengidentifikasi nama material', type: 'varchar(191)', null: 'No' },
                { name: 'description', description: 'Field mengidentifikasi deskripsi material', type: 'varchar(191)', null: 'Yes' },
                { name: 'code', description: 'Field mengidentifikasi kode material', type: 'varchar(191)', null: 'No' },
                { name: 'unit', description: 'Field mengidentifikasi satuan material', type: 'varchar(191)', null: 'No' },
                { name: 'qtyOnHand', description: 'Field mengidentifikasi jumlah stok tersedia', type: 'decimal(10,3)', null: 'No' },
                { name: 'minStock', description: 'Field mengidentifikasi stok minimum', type: 'decimal(10,3)', null: 'No' },
                { name: 'maxStock', description: 'Field mengidentifikasi stok maksimum', type: 'decimal(10,3)', null: 'No' },
                { name: 'reorderPoint', description: 'Field mengidentifikasi titik pemesanan ulang', type: 'decimal(10,3)', null: 'No' },
                { name: 'reorderQty', description: 'Field mengidentifikasi jumlah pemesanan ulang', type: 'decimal(10,3)', null: 'No' },
                { name: 'location', description: 'Field mengidentifikasi lokasi penyimpanan', type: 'varchar(191)', null: 'Yes' },
                { name: 'attributeType', description: 'Field mengidentifikasi jenis atribut material', type: 'varchar(191)', null: 'Yes' },
                { name: 'attributeValue', description: 'Field mengidentifikasi nilai atribut material', type: 'varchar(191)', null: 'Yes' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif material', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'Product',
            description: 'Tabel untuk menyimpan data produk',
            primaryKey: 'id',
            foreignKey: 'materialId, productColorId, productVariationId',
            fieldCount: 15,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id produk', type: 'int(10)', null: 'No' },
                { name: 'name', description: 'Field mengidentifikasi nama produk', type: 'varchar(191)', null: 'No' },
                { name: 'code', description: 'Field mengidentifikasi kode produk', type: 'varchar(191)', null: 'No' },
                { name: 'materialId', description: 'Field mengidentifikasi id material dasar', type: 'int(10)', null: 'Yes' },
                { name: 'productColorId', description: 'Field mengidentifikasi id warna produk', type: 'int(10)', null: 'Yes' },
                { name: 'productVariationId', description: 'Field mengidentifikasi id variasi produk', type: 'int(10)', null: 'Yes' },
                { name: 'category', description: 'Field mengidentifikasi kategori produk', type: 'varchar(191)', null: 'Yes' },
                { name: 'price', description: 'Field mengidentifikasi harga produk', type: 'decimal(15,2)', null: 'Yes' },
                { name: 'qtyOnHand', description: 'Field mengidentifikasi jumlah stok produk', type: 'int(10)', null: 'No' },
                { name: 'unit', description: 'Field mengidentifikasi satuan produk', type: 'varchar(191)', null: 'No' },
                { name: 'description', description: 'Field mengidentifikasi deskripsi produk', type: 'varchar(191)', null: 'Yes' },
                { name: 'defaultTarget', description: 'Field mengidentifikasi target produksi default', type: 'int(10)', null: 'No' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif produk', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' },
                { name: 'updatedAt', description: 'Field mengidentifikasi waktu pembaruan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'Order',
            description: 'Tabel untuk menyimpan data pesanan',
            primaryKey: 'id',
            foreignKey: 'userId, workerId, workerContactId',
            fieldCount: 15,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id pesanan', type: 'int(10)', null: 'No' },
                { name: 'orderNumber', description: 'Field mengidentifikasi nomor pesanan', type: 'varchar(191)', null: 'No' },
                { name: 'status', description: 'Field mengidentifikasi status pesanan', type: 'enum', null: 'No' },
                { name: 'targetPcs', description: 'Field mengidentifikasi target jumlah produksi', type: 'int(10)', null: 'No' },
                { name: 'completedPcs', description: 'Field mengidentifikasi jumlah yang telah selesai', type: 'int(10)', null: 'No' },
                { name: 'customerNote', description: 'Field mengidentifikasi catatan pelanggan', type: 'varchar(191)', null: 'Yes' },
                { name: 'dueDate', description: 'Field mengidentifikasi tanggal jatuh tempo', type: 'datetime', null: 'Yes' },
                { name: 'userId', description: 'Field mengidentifikasi id pengguna', type: 'int(10)', null: 'No' },
                { name: 'workerId', description: 'Field mengidentifikasi id pekerja', type: 'int(10)', null: 'Yes' },
                { name: 'workerContactId', description: 'Field mengidentifikasi id kontak pekerja', type: 'int(10)', null: 'Yes' },
                { name: 'description', description: 'Field mengidentifikasi deskripsi pesanan', type: 'varchar(191)', null: 'Yes' },
                { name: 'priority', description: 'Field mengidentifikasi prioritas pesanan', type: 'enum', null: 'No' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif pesanan', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' },
                { name: 'updatedAt', description: 'Field mengidentifikasi waktu pembaruan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'OrderProduct',
            description: 'Tabel untuk menyimpan detail produk dalam pesanan',
            primaryKey: 'id',
            foreignKey: 'orderId, productId',
            fieldCount: 10,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id item pesanan', type: 'int(10)', null: 'No' },
                { name: 'orderId', description: 'Field mengidentifikasi id pesanan', type: 'int(10)', null: 'No' },
                { name: 'productId', description: 'Field mengidentifikasi id produk', type: 'int(10)', null: 'No' },
                { name: 'quantity', description: 'Field mengidentifikasi jumlah produk', type: 'int(10)', null: 'No' },
                { name: 'unitPrice', description: 'Field mengidentifikasi harga per unit', type: 'decimal(15,2)', null: 'Yes' },
                { name: 'totalPrice', description: 'Field mengidentifikasi total harga', type: 'decimal(15,2)', null: 'Yes' },
                { name: 'notes', description: 'Field mengidentifikasi catatan item', type: 'varchar(191)', null: 'Yes' },
                { name: 'completedQty', description: 'Field mengidentifikasi jumlah yang selesai', type: 'int(10)', null: 'No' },
                { name: 'status', description: 'Field mengidentifikasi status item pesanan', type: 'enum', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'MaterialMovement',
            description: 'Tabel untuk menyimpan pergerakan material/inventory',
            primaryKey: 'id',
            foreignKey: 'materialId, orderId, userId, purchaseLogId',
            fieldCount: 13,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id pergerakan material', type: 'int(10)', null: 'No' },
                { name: 'materialId', description: 'Field mengidentifikasi id material', type: 'int(10)', null: 'No' },
                { name: 'orderId', description: 'Field mengidentifikasi id pesanan', type: 'int(10)', null: 'Yes' },
                { name: 'userId', description: 'Field mengidentifikasi id pengguna', type: 'int(10)', null: 'No' },
                { name: 'purchaseLogId', description: 'Field mengidentifikasi id log pembelian', type: 'int(10)', null: 'Yes' },
                { name: 'movementType', description: 'Field mengidentifikasi jenis pergerakan', type: 'enum', null: 'No' },
                { name: 'quantity', description: 'Field mengidentifikasi jumlah pergerakan', type: 'decimal(10,3)', null: 'No' },
                { name: 'unit', description: 'Field mengidentifikasi satuan', type: 'varchar(191)', null: 'No' },
                { name: 'costPerUnit', description: 'Field mengidentifikasi harga per unit', type: 'decimal(15,2)', null: 'Yes' },
                { name: 'totalCost', description: 'Field mengidentifikasi total biaya', type: 'decimal(15,2)', null: 'Yes' },
                { name: 'notes', description: 'Field mengidentifikasi catatan pergerakan', type: 'varchar(191)', null: 'Yes' },
                { name: 'qtyAfter', description: 'Field mengidentifikasi jumlah setelah pergerakan', type: 'decimal(10,3)', null: 'No' },
                { name: 'movementDate', description: 'Field mengidentifikasi tanggal pergerakan', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'ProgressReport',
            description: 'Tabel untuk menyimpan laporan kemajuan pekerjaan',
            primaryKey: 'id',
            foreignKey: 'orderId, orderProductId, productId, userId',
            fieldCount: 8,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id laporan kemajuan', type: 'int(10)', null: 'No' },
                { name: 'orderId', description: 'Field mengidentifikasi id pesanan', type: 'int(10)', null: 'Yes' },
                { name: 'orderProductId', description: 'Field mengidentifikasi id item pesanan', type: 'int(10)', null: 'Yes' },
                { name: 'productId', description: 'Field mengidentifikasi id produk', type: 'int(10)', null: 'Yes' },
                { name: 'userId', description: 'Field mengidentifikasi id pengguna pelapor', type: 'int(10)', null: 'No' },
                { name: 'reportText', description: 'Field mengidentifikasi teks laporan', type: 'varchar(191)', null: 'No' },
                { name: 'photoPath', description: 'Field mengidentifikasi path foto laporan', type: 'varchar(191)', null: 'Yes' },
                { name: 'percentage', description: 'Field mengidentifikasi persentase kemajuan', type: 'int(10)', null: 'No' }
            ]
        },
        {
            name: 'ProductProgressReport',
            description: 'Tabel untuk menyimpan detail kemajuan produk',
            primaryKey: 'id',
            foreignKey: 'progressReportId, productId, orderProductId',
            fieldCount: 10,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id kemajuan produk', type: 'int(10)', null: 'No' },
                { name: 'progressReportId', description: 'Field mengidentifikasi id laporan kemajuan', type: 'int(10)', null: 'No' },
                { name: 'productId', description: 'Field mengidentifikasi id produk', type: 'int(10)', null: 'No' },
                { name: 'orderProductId', description: 'Field mengidentifikasi id item pesanan', type: 'int(10)', null: 'Yes' },
                { name: 'itemsCompleted', description: 'Field mengidentifikasi jumlah item selesai', type: 'int(10)', null: 'No' },
                { name: 'itemsTarget', description: 'Field mengidentifikasi target jumlah item', type: 'int(10)', null: 'No' },
                { name: 'status', description: 'Field mengidentifikasi status kemajuan', type: 'varchar(191)', null: 'No' },
                { name: 'notes', description: 'Field mengidentifikasi catatan kemajuan', type: 'varchar(191)', null: 'Yes' },
                { name: 'completionDate', description: 'Field mengidentifikasi tanggal penyelesaian', type: 'datetime', null: 'Yes' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'ProductProgressPhoto',
            description: 'Tabel untuk menyimpan foto kemajuan produk',
            primaryKey: 'id',
            foreignKey: 'productProgressReportId',
            fieldCount: 10,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id foto kemajuan', type: 'int(10)', null: 'No' },
                { name: 'productProgressReportId', description: 'Field mengidentifikasi id laporan kemajuan produk', type: 'int(10)', null: 'No' },
                { name: 'photoPath', description: 'Field mengidentifikasi path file foto', type: 'varchar(191)', null: 'No' },
                { name: 'thumbnailPath', description: 'Field mengidentifikasi path thumbnail foto', type: 'varchar(191)', null: 'Yes' },
                { name: 'description', description: 'Field mengidentifikasi deskripsi foto', type: 'varchar(191)', null: 'Yes' },
                { name: 'uploadDate', description: 'Field mengidentifikasi tanggal upload', type: 'datetime', null: 'No' },
                { name: 'fileSize', description: 'Field mengidentifikasi ukuran file', type: 'int(10)', null: 'Yes' },
                { name: 'mimeType', description: 'Field mengidentifikasi tipe MIME file', type: 'varchar(191)', null: 'Yes' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif foto', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'ProductPhoto',
            description: 'Tabel untuk menyimpan foto produk',
            primaryKey: 'id',
            foreignKey: 'productId',
            fieldCount: 11,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id foto produk', type: 'int(10)', null: 'No' },
                { name: 'productId', description: 'Field mengidentifikasi id produk', type: 'int(10)', null: 'No' },
                { name: 'photoPath', description: 'Field mengidentifikasi path file foto', type: 'varchar(191)', null: 'No' },
                { name: 'thumbnailPath', description: 'Field mengidentifikasi path thumbnail foto', type: 'varchar(191)', null: 'Yes' },
                { name: 'description', description: 'Field mengidentifikasi deskripsi foto', type: 'varchar(191)', null: 'Yes' },
                { name: 'isPrimary', description: 'Field mengidentifikasi foto utama', type: 'boolean', null: 'No' },
                { name: 'sortOrder', description: 'Field mengidentifikasi urutan tampil foto', type: 'int(10)', null: 'No' },
                { name: 'fileSize', description: 'Field mengidentifikasi ukuran file', type: 'int(10)', null: 'Yes' },
                { name: 'mimeType', description: 'Field mengidentifikasi tipe MIME file', type: 'varchar(191)', null: 'Yes' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif foto', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'ProductColour',
            description: 'Tabel untuk menyimpan data warna produk',
            primaryKey: 'id',
            foreignKey: '',
            fieldCount: 5,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id warna produk', type: 'int(10)', null: 'No' },
                { name: 'colorName', description: 'Field mengidentifikasi nama warna', type: 'varchar(191)', null: 'No' },
                { name: 'colorCode', description: 'Field mengidentifikasi kode warna', type: 'varchar(191)', null: 'Yes' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif warna', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'ProductVariation',
            description: 'Tabel untuk menyimpan data variasi produk',
            primaryKey: 'id',
            foreignKey: '',
            fieldCount: 6,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id variasi produk', type: 'int(10)', null: 'No' },
                { name: 'variationType', description: 'Field mengidentifikasi jenis variasi', type: 'varchar(191)', null: 'No' },
                { name: 'variationValue', description: 'Field mengidentifikasi nilai variasi', type: 'varchar(191)', null: 'No' },
                { name: 'priceAdjustment', description: 'Field mengidentifikasi penyesuaian harga', type: 'decimal(15,2)', null: 'Yes' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif variasi', type: 'boolean', null: 'No' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        },
        {
            name: 'PurchaseLog',
            description: 'Tabel untuk menyimpan log pembelian material',
            primaryKey: 'id',
            foreignKey: 'materialId',
            fieldCount: 14,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id log pembelian', type: 'int(10)', null: 'No' },
                { name: 'materialId', description: 'Field mengidentifikasi id material', type: 'int(10)', null: 'No' },
                { name: 'supplier', description: 'Field mengidentifikasi nama supplier', type: 'varchar(191)', null: 'No' },
                { name: 'quantity', description: 'Field mengidentifikasi jumlah pembelian', type: 'decimal(10,3)', null: 'No' },
                { name: 'unit', description: 'Field mengidentifikasi satuan', type: 'varchar(191)', null: 'No' },
                { name: 'pricePerUnit', description: 'Field mengidentifikasi harga per unit', type: 'decimal(15,2)', null: 'No' },
                { name: 'totalCost', description: 'Field mengidentifikasi total biaya', type: 'decimal(15,2)', null: 'No' },
                { name: 'purchaseDate', description: 'Field mengidentifikasi tanggal pembelian', type: 'datetime', null: 'No' },
                { name: 'invoiceNumber', description: 'Field mengidentifikasi nomor faktur', type: 'varchar(191)', null: 'Yes' },
                { name: 'receiptPath', description: 'Field mengidentifikasi path file struk', type: 'varchar(191)', null: 'Yes' },
                { name: 'notes', description: 'Field mengidentifikasi catatan pembelian', type: 'varchar(191)', null: 'Yes' },
                { name: 'status', description: 'Field mengidentifikasi status pembelian', type: 'enum', null: 'No' },
                { name: 'deliveryDate', description: 'Field mengidentifikasi tanggal pengiriman', type: 'datetime', null: 'Yes' },
                { name: 'receivedQuantity', description: 'Field mengidentifikasi jumlah yang diterima', type: 'decimal(10,3)', null: 'Yes' }
            ]
        },
        {
            name: 'Contact',
            description: 'Tabel untuk menyimpan data kontak',
            primaryKey: 'id',
            foreignKey: '',
            fieldCount: 10,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id kontak', type: 'int(10)', null: 'No' },
                { name: 'name', description: 'Field mengidentifikasi nama kontak', type: 'varchar(191)', null: 'No' },
                { name: 'phone', description: 'Field mengidentifikasi nomor telepon', type: 'varchar(191)', null: 'Yes' },
                { name: 'whatsappPhone', description: 'Field mengidentifikasi nomor WhatsApp', type: 'varchar(191)', null: 'Yes' },
                { name: 'email', description: 'Field mengidentifikasi email kontak', type: 'varchar(191)', null: 'Yes' },
                { name: 'address', description: 'Field mengidentifikasi alamat kontak', type: 'varchar(191)', null: 'Yes' },
                { name: 'contactType', description: 'Field mengidentifikasi jenis kontak', type: 'enum', null: 'No' },
                { name: 'company', description: 'Field mengidentifikasi nama perusahaan', type: 'varchar(191)', null: 'Yes' },
                { name: 'notes', description: 'Field mengidentifikasi catatan kontak', type: 'varchar(191)', null: 'Yes' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif kontak', type: 'boolean', null: 'No' }
            ]
        },
        {
            name: 'ContactNote',
            description: 'Tabel untuk menyimpan catatan kontak',
            primaryKey: 'id',
            foreignKey: 'contactId, orderId, purchaseLogId, createdBy',
            fieldCount: 12,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id catatan kontak', type: 'int(10)', null: 'No' },
                { name: 'contactId', description: 'Field mengidentifikasi id kontak', type: 'int(10)', null: 'No' },
                { name: 'orderId', description: 'Field mengidentifikasi id pesanan', type: 'int(10)', null: 'Yes' },
                { name: 'purchaseLogId', description: 'Field mengidentifikasi id log pembelian', type: 'int(10)', null: 'Yes' },
                { name: 'createdBy', description: 'Field mengidentifikasi id pembuat catatan', type: 'int(10)', null: 'No' },
                { name: 'noteType', description: 'Field mengidentifikasi jenis catatan', type: 'enum', null: 'No' },
                { name: 'subject', description: 'Field mengidentifikasi subjek catatan', type: 'varchar(191)', null: 'Yes' },
                { name: 'content', description: 'Field mengidentifikasi isi catatan', type: 'text', null: 'No' },
                { name: 'followUpDate', description: 'Field mengidentifikasi tanggal tindak lanjut', type: 'datetime', null: 'Yes' },
                { name: 'isImportant', description: 'Field mengidentifikasi tingkat kepentingan', type: 'boolean', null: 'No' },
                { name: 'tags', description: 'Field mengidentifikasi tag catatan', type: 'varchar(191)', null: 'Yes' },
                { name: 'attachmentPath', description: 'Field mengidentifikasi path file lampiran', type: 'varchar(191)', null: 'Yes' }
            ]
        },
        {
            name: 'OrderLink',
            description: 'Tabel untuk menyimpan link sharing pesanan',
            primaryKey: 'id',
            foreignKey: 'orderId, userId',
            fieldCount: 7,
            fields: [
                { name: 'id', description: 'Field mengidentifikasi id link pesanan', type: 'int(10)', null: 'No' },
                { name: 'orderId', description: 'Field mengidentifikasi id pesanan', type: 'int(10)', null: 'No' },
                { name: 'userId', description: 'Field mengidentifikasi id pengguna', type: 'int(10)', null: 'No' },
                { name: 'linkToken', description: 'Field mengidentifikasi token link', type: 'varchar(191)', null: 'No' },
                { name: 'isActive', description: 'Field mengidentifikasi status aktif link', type: 'boolean', null: 'No' },
                { name: 'expiresAt', description: 'Field mengidentifikasi waktu kadaluarsa', type: 'datetime', null: 'Yes' },
                { name: 'createdAt', description: 'Field mengidentifikasi waktu pembuatan data', type: 'datetime', null: 'No' }
            ]
        }
    ]

    // Create the document
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // Title
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'IMPLEMENTASI BASIS DATA WAREHOUSE MANAGEMENT SYSTEM',
                            bold: true,
                            size: 28
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),

                // Generate tables for each model
                ...models.map((model, index) => {
                    const modelNumber = index + 1

                    return [
                        // Model description paragraph
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `${modelNumber}. Tabel ${model.name}: ${model.description}`,
                                    size: 24
                                })
                            ],
                            spacing: { before: 300, after: 200 }
                        }),

                        // Model details
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Primary Key`,
                                    italics: true,
                                    size: 22
                                }),
                                new TextRun({
                                    text: `: ${model.primaryKey}`,
                                    size: 22
                                })
                            ],
                            spacing: { after: 100 }
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Foreign Key`,
                                    italics: true,
                                    size: 22
                                }),
                                new TextRun({
                                    text: `: ${model.foreignKey || '-'}`,
                                    size: 22
                                })
                            ],
                            spacing: { after: 100 }
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Jumlah Field`,
                                    italics: true,
                                    size: 22
                                }),
                                new TextRun({
                                    text: `: ${model.fieldCount}`,
                                    size: 22
                                })
                            ],
                            spacing: { after: 200 }
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Untuk implementasi basis data Tabel ${model.name} dapat dilihat pada Tabel 4.${modelNumber + 20}.`,
                                    size: 22
                                })
                            ],
                            spacing: { after: 200 }
                        }),

                        // Table title
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Tabel 4.${modelNumber + 20} Implementasi basis data Tabel ${model.name}`,
                                    size: 22,
                                    bold: true
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }),

                        // Implementation table
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                // Header row
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({
                                                children: [new TextRun({ text: 'Nama Field', bold: true, italics: true, size: 20 })],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            width: { size: 20, type: WidthType.PERCENTAGE },
                                            shading: { fill: 'D3D3D3' }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({
                                                children: [new TextRun({ text: 'Deskripsi', bold: true, size: 20 })],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            shading: { fill: 'D3D3D3' }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({
                                                children: [new TextRun({ text: 'Tipe', bold: true, size: 20 })],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            width: { size: 20, type: WidthType.PERCENTAGE },
                                            shading: { fill: 'D3D3D3' }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({
                                                children: [new TextRun({ text: 'Null', bold: true, size: 20 })],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            width: { size: 10, type: WidthType.PERCENTAGE },
                                            shading: { fill: 'D3D3D3' }
                                        })
                                    ]
                                }),
                                // Data rows
                                ...model.fields.map(field =>
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [new Paragraph({
                                                    children: [new TextRun({ text: field.name, size: 18 })],
                                                    alignment: AlignmentType.LEFT
                                                })],
                                                width: { size: 20, type: WidthType.PERCENTAGE }
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({
                                                    children: [
                                                        new TextRun({ text: 'Field', italics: true, size: 18 }),
                                                        new TextRun({ text: ` ${field.description.replace('Field ', '')}`, size: 18 })
                                                    ],
                                                    alignment: AlignmentType.LEFT
                                                })],
                                                width: { size: 50, type: WidthType.PERCENTAGE }
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({
                                                    children: [new TextRun({ text: field.type, size: 18 })],
                                                    alignment: AlignmentType.CENTER
                                                })],
                                                width: { size: 20, type: WidthType.PERCENTAGE }
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({
                                                    children: [new TextRun({ text: field.null, size: 18 })],
                                                    alignment: AlignmentType.CENTER
                                                })],
                                                width: { size: 10, type: WidthType.PERCENTAGE }
                                            })
                                        ]
                                    })
                                )
                            ]
                        }),

                        new Paragraph({
                            text: '',
                            spacing: { after: 400 }
                        })
                    ]
                }).flat()
            ]
        }]
    })

    // Generate and save the document
    try {
        const buffer = await Packer.toBuffer(doc)
        const outputPath = 'server/docs-log/implementasi-database-wms.docx'

        fs.writeFileSync(outputPath, buffer)
        console.log(`✅ Database implementation documentation berhasil dibuat: ${outputPath}`)

        return outputPath
    } catch (error) {
        console.error('❌ Error generating database documentation:', error)
        throw error
    }
}

// Run the function
generateDatabaseImplementationDocx()
    .then(path => {
        console.log(`📄 File DOCX berhasil disimpan di: ${path}`)
    })
    .catch(error => {
        console.error('Error:', error)
    }) 