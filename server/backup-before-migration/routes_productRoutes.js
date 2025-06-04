const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProductPhotos } = require('../middleware/uploadMiddleware');
const { Product, Material, ProductColour, ProductVariation, ProductPhoto } = require('../models'); // Import Product model and related models
const {
  getProductColours,
  getProductColourById,
  createProductColour,
  updateProductColour,
  deleteProductColour
} = require('../controllers/productColourController');
const {
  getProductVariations,
  getProductVariationById,
  createProductVariation,
  updateProductVariation,
  deleteProductVariation
} = require('../controllers/productVariationController');

const router = express.Router();

// GET /api/products - Get all products with main photo (protected by middleware protect)
router.get('/', protect, asyncHandler(async (req, res) => {
  const products = await Product.findAll({
    include: [
      { 
        model: Material,
        attributes: ['id', 'name', 'code']
      },
      { 
        model: ProductColour,
        as: 'colours',
        attributes: ['id', 'code', 'colourName']
      },
      { 
        model: ProductVariation,
        as: 'variations',
        attributes: ['id', 'code', 'size', 'additionalPrice']
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
  res.status(200).json(products);
}));

// GET /api/products/:id - Get single product by ID with all photos (protected by middleware protect)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [
      { 
        model: Material,
        attributes: ['id', 'name', 'code']
      },
      { 
        model: ProductColour,
        as: 'colours',
        attributes: ['id', 'code', 'colourName', 'notes']
      },
      { 
        model: ProductVariation,
        as: 'variations',
        attributes: ['id', 'code', 'size', 'additionalPrice']
      },
      {
        model: ProductPhoto,
        as: 'photos',
        attributes: ['id', 'photoUrl', 'thumbnailUrl', 'isMainPhoto', 'sortOrder', 'originalFileName'],
        where: { isActive: true },
        required: false,
        order: [['isMainPhoto', 'DESC'], ['sortOrder', 'ASC']]
      }
    ]
  });
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }
  res.status(200).json(product);
}));

// POST /api/products - Create new product with photos (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, uploadProductPhotos, asyncHandler(async (req, res) => {
  const { 
    name, 
    code, 
    materialId, 
    category, 
    price, 
    qtyOnHand, 
    unit, 
    description, 
    defaultTarget, 
    isActive 
  } = req.body;

  // Validate required fields
  if (!name || !code) {
    res.status(400).json({ 
      success: false, 
      message: 'Nama dan kode produk harus diisi' 
    });
    return;
  }

  // Validate material exists if provided
  if (materialId) {
    const material = await Material.findByPk(materialId);
    if (!material) {
      res.status(400).json({ 
        success: false, 
        message: 'Material tidak ditemukan' 
      });
      return;
    }
  }

  // Check if code is unique
  const existingProduct = await Product.findOne({ where: { code } });
  if (existingProduct) {
    res.status(400).json({ 
      success: false, 
      message: 'Kode produk sudah digunakan' 
    });
    return;
  }

  // Create product
  const newProduct = await Product.create({
    name,
    code,
    materialId: materialId || null,
    category: category || null,
    price: price || null,
    qtyOnHand: qtyOnHand || 0,
    unit: unit || 'pcs',
    description,
    defaultTarget: defaultTarget || 0,
    isActive: isActive !== undefined ? isActive : true
  });

  // Add photos if uploaded
  if (req.processedImages && req.processedImages.length > 0) {
    const photoPromises = req.processedImages.map(photoData => 
      ProductPhoto.create({
        productId: newProduct.id,
        ...photoData
      })
    );
    await Promise.all(photoPromises);
  }

  // Fetch the created product with associations including photos
  const productWithAssociations = await Product.findByPk(newProduct.id, {
    include: [
      { model: Material, attributes: ['id', 'name', 'code'] },
      { 
        model: ProductPhoto, 
        as: 'photos', 
        attributes: ['id', 'photoUrl', 'thumbnailUrl', 'isMainPhoto', 'sortOrder'],
        where: { isActive: true },
        required: false,
        order: [['isMainPhoto', 'DESC'], ['sortOrder', 'ASC']]
      }
    ]
  });

  res.status(201).json(productWithAssociations);
}));

// PUT /api/products/:id - Update product (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    code, 
    materialId, 
    category, 
    price, 
    qtyOnHand, 
    unit, 
    description, 
    defaultTarget, 
    isActive 
  } = req.body;
  
  const product = await Product.findByPk(id);
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }

  // Validate material exists if being updated
  if (materialId && materialId !== product.materialId) {
    const material = await Material.findByPk(materialId);
    if (!material) {
      res.status(400).json({ 
        success: false, 
        message: 'Material tidak ditemukan' 
      });
      return;
    }
  }

  // Check if code is unique if being updated
  if (code && code !== product.code) {
    const existingProduct = await Product.findOne({ where: { code } });
    if (existingProduct) {
      res.status(400).json({ 
        success: false, 
        message: 'Kode produk sudah digunakan' 
      });
      return;
    }
  }

  // Update product
  await product.update({ 
    name: name || product.name,
    code: code !== undefined ? code : product.code,
    materialId: materialId !== undefined ? materialId : product.materialId,
    category: category !== undefined ? category : product.category,
    price: price !== undefined ? price : product.price,
    qtyOnHand: qtyOnHand !== undefined ? qtyOnHand : product.qtyOnHand,
    unit: unit || product.unit,
    description: description !== undefined ? description : product.description,
    defaultTarget: defaultTarget !== undefined ? defaultTarget : product.defaultTarget,
    isActive: isActive !== undefined ? isActive : product.isActive
  });

  // Fetch updated product with associations
  const updatedProduct = await Product.findByPk(id, {
    include: [{ model: Material, attributes: ['id', 'name', 'code'] }]
  });
  
  res.status(200).json(updatedProduct);
}));

// DELETE /api/products/:id - Delete product (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByPk(id);
  
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }

  await product.destroy();
  res.status(204).send();
}));

// Product Colour Routes
router.get('/:productId/colours', protect, getProductColours);
router.get('/:productId/colours/:id', protect, getProductColourById);
router.post('/:productId/colours', protect, createProductColour);
router.put('/:productId/colours/:id', protect, updateProductColour);
router.delete('/:productId/colours/:id', protect, deleteProductColour);

// Product Variation Routes
router.get('/:productId/variations', protect, getProductVariations);
router.get('/:productId/variations/:id', protect, getProductVariationById);
router.post('/:productId/variations', protect, createProductVariation);
router.put('/:productId/variations/:id', protect, updateProductVariation);
router.delete('/:productId/variations/:id', protect, deleteProductVariation);

// Product Photo Management Routes
// POST /api/products/:id/photos - Upload additional photos to existing product
router.post('/:id/photos', protect, adminOnly, uploadProductPhotos, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const product = await Product.findByPk(id);
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }

  if (!req.processedImages || req.processedImages.length === 0) {
    res.status(400).json({ message: 'No photos uploaded' });
    return;
  }

  // Get current highest sort order for this product
  const maxSortOrder = await ProductPhoto.max('sortOrder', {
    where: { productId: id, isActive: true }
  });

  // Add photos with incremented sort order
  const photoPromises = req.processedImages.map((photoData, index) => 
    ProductPhoto.create({
      productId: id,
      ...photoData,
      sortOrder: (maxSortOrder || 0) + index + 1
    })
  );
  
  const newPhotos = await Promise.all(photoPromises);
  
  res.status(201).json(newPhotos);
}));

// PUT /api/products/:id/photos/:photoId/main - Set main photo
router.put('/:id/photos/:photoId/main', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id, photoId } = req.params;
  
  const product = await Product.findByPk(id);
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }

  const photo = await ProductPhoto.findOne({
    where: { id: photoId, productId: id, isActive: true }
  });
  
  if (!photo) {
    res.status(404).json({ message: 'Photo tidak ditemukan' });
    return;
  }

  // Remove main photo status from all other photos for this product
  await ProductPhoto.update(
    { isMainPhoto: false },
    { where: { productId: id, isActive: true } }
  );

  // Set this photo as main
  await photo.update({ isMainPhoto: true });

  res.status(200).json({ message: 'Main photo updated successfully' });
}));

// DELETE /api/products/:id/photos/:photoId - Delete photo
router.delete('/:id/photos/:photoId', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id, photoId } = req.params;
  
  const product = await Product.findByPk(id);
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }

  const photo = await ProductPhoto.findOne({
    where: { id: photoId, productId: id, isActive: true }
  });
  
  if (!photo) {
    res.status(404).json({ message: 'Photo tidak ditemukan' });
    return;
  }

  // Mark as inactive instead of deleting
  await photo.update({ isActive: false });

  res.status(204).send();
}));

// PUT /api/products/:id/photos/reorder - Reorder photos
router.put('/:id/photos/reorder', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { photoOrders } = req.body; // Array of { photoId, sortOrder }
  
  const product = await Product.findByPk(id);
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }

  if (!photoOrders || !Array.isArray(photoOrders)) {
    res.status(400).json({ message: 'Invalid photo order data' });
    return;
  }

  // Update sort orders
  const updatePromises = photoOrders.map(({ photoId, sortOrder }) =>
    ProductPhoto.update(
      { sortOrder },
      { where: { id: photoId, productId: id, isActive: true } }
    )
  );

  await Promise.all(updatePromises);

  res.status(200).json({ message: 'Photo order updated successfully' });
}));

module.exports = router; 