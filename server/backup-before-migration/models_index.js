const User = require('./User');
const Material = require('./Material');
const Product = require('./Product');
const Order = require('./Order');
const OrderProduct = require('./OrderProduct');
const MaterialMovement = require('./MaterialMovement');
const ProgressReport = require('./ProgressReport');
const RemainingFabric = require('./RemainingFabric');
const Inventaris = require('./Inventaris');
const OrderLink = require('./OrderLink');
const ProductMaterial = require('./ProductMaterial');
const Shipment = require('./Shipment');
const RecurringPlan = require('./RecurringPlan');
const StatusChange = require('./StatusChange');
const FabricType = require('./FabricType');
const ProductColour = require('./ProductColour');
const ProductVariation = require('./ProductVariation');
const ProductPhoto = require('./ProductPhoto');
const MaterialPurchaseAlert = require('./MaterialPurchaseAlert');
const PurchaseLog = require('./PurchaseLog');
const Contact = require('./Contact');
const ContactNote = require('./ContactNote');

// Relasi User - Order
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Relasi User - Order (Tailor) - DEPRECATED: Now using Contact
User.hasMany(Order, { foreignKey: 'tailorId', as: 'TailorOrders' });
Order.belongsTo(User, { foreignKey: 'tailorId', as: 'Tailor' });

// Relasi Contact - Order (Tailor Contact)
Contact.hasMany(Order, { foreignKey: 'tailorContactId', as: 'TailorOrders' });
Order.belongsTo(Contact, { foreignKey: 'tailorContactId', as: 'TailorContact' });

// Relasi User - MaterialMovement
User.hasMany(MaterialMovement, { foreignKey: 'userId' });
MaterialMovement.belongsTo(User, { foreignKey: 'userId' });

// Relasi User - ProgressReport
User.hasMany(ProgressReport, { foreignKey: 'userId' });
ProgressReport.belongsTo(User, { foreignKey: 'userId' });

// Relasi User - RemainingFabric
// RemainingFabric now relates to Material, not User/Order based on the new diagram

// Relasi User - OrderLink (Penjahit yang menerima OrderLink)
User.hasOne(OrderLink, { foreignKey: 'userId' }); // Asumsi 1 user penjahit punya 1 OrderLink aktif per order (atau per waktu? per order lebih masuk akal)
OrderLink.belongsTo(User, { foreignKey: 'userId' });

// Relasi Order - OrderProduct - Product
Order.belongsToMany(Product, { through: OrderProduct, foreignKey: 'orderId' });
Product.belongsToMany(Order, { through: OrderProduct, foreignKey: 'productId' });

// Relasi Material - MaterialMovement
Material.hasMany(MaterialMovement, { foreignKey: 'materialId' });
MaterialMovement.belongsTo(Material, { foreignKey: 'materialId' });

// Relasi Order - MaterialMovement
Order.hasMany(MaterialMovement, { foreignKey: 'orderId' }); // MaterialMovement bisa terkait Order (keluar untuk produksi)
MaterialMovement.belongsTo(Order, { foreignKey: 'orderId' });

// NEW: Relasi PurchaseLog - MaterialMovement (Purchase Integration)
PurchaseLog.hasOne(MaterialMovement, { foreignKey: 'purchaseLogId', as: 'movement' });
MaterialMovement.belongsTo(PurchaseLog, { foreignKey: 'purchaseLogId', as: 'PurchaseLog' });

// Relasi Order - ProgressReport
Order.hasMany(ProgressReport, { foreignKey: 'orderId' });
ProgressReport.belongsTo(Order, { foreignKey: 'orderId' });

// Relasi Order - RemainingFabric (Dihapus, RemainingFabric relasi ke Material)

// Relasi Order - OrderLink
Order.hasOne(OrderLink, { foreignKey: 'orderId' }); // 1 Order punya 1 OrderLink
OrderLink.belongsTo(Order, { foreignKey: 'orderId' });

// Relasi Material - ProductMaterial - Product (Many-to-Many untuk kebutuhan material per produk)
Material.hasMany(ProductMaterial, { foreignKey: 'materialId' });
ProductMaterial.belongsTo(Material, { foreignKey: 'materialId' });
Product.hasMany(ProductMaterial, { foreignKey: 'productId' });
ProductMaterial.belongsTo(Product, { foreignKey: 'productId' });

// Relasi RemainingFabric - Material
Material.hasMany(RemainingFabric, { foreignKey: 'materialId' });
RemainingFabric.belongsTo(Material, { foreignKey: 'materialId' });

// Relasi RecurringPlan - Product
Product.hasMany(RecurringPlan, { foreignKey: 'productId' }); // 1 Product bisa punya banyak RecurringPlan
RecurringPlan.belongsTo(Product, { foreignKey: 'productId' });

// Relasi Shipment - Order
Order.hasOne(Shipment, { foreignKey: 'orderId' }); // 1 Order bisa punya 0 atau 1 Shipment
Shipment.belongsTo(Order, { foreignKey: 'orderId' });

// Relasi StatusChange - Order
Order.hasMany(StatusChange, { foreignKey: 'orderId' });
StatusChange.belongsTo(Order, { foreignKey: 'orderId' });

// Relasi StatusChange - User
User.hasMany(StatusChange, { foreignKey: 'changedBy' });
StatusChange.belongsTo(User, { foreignKey: 'changedBy' });

// New relationships for enhanced Product model

// Relasi Material - Product (Product references base Material)
Material.hasMany(Product, { foreignKey: 'materialId' });
Product.belongsTo(Material, { foreignKey: 'materialId' });

// Relasi Product - ProductColour
Product.hasMany(ProductColour, { foreignKey: 'productId', as: 'colours' });
ProductColour.belongsTo(Product, { foreignKey: 'productId' });

// Relasi Product - ProductVariation  
Product.hasMany(ProductVariation, { foreignKey: 'productId', as: 'variations' });
ProductVariation.belongsTo(Product, { foreignKey: 'productId' });

// Relasi Product - ProductPhoto
Product.hasMany(ProductPhoto, { foreignKey: 'productId', as: 'photos' });
ProductPhoto.belongsTo(Product, { foreignKey: 'productId' });

// NEW: MaterialPurchaseAlert relationships
Material.hasMany(MaterialPurchaseAlert, { foreignKey: 'materialId', as: 'purchaseAlerts' });
MaterialPurchaseAlert.belongsTo(Material, { foreignKey: 'materialId' });

Order.hasMany(MaterialPurchaseAlert, { foreignKey: 'orderId', as: 'purchaseAlerts' });
MaterialPurchaseAlert.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(MaterialPurchaseAlert, { foreignKey: 'createdBy', as: 'createdAlerts' });
MaterialPurchaseAlert.belongsTo(User, { foreignKey: 'createdBy', as: 'CreatedByUser' });

User.hasMany(MaterialPurchaseAlert, { foreignKey: 'resolvedBy', as: 'resolvedAlerts' });
MaterialPurchaseAlert.belongsTo(User, { foreignKey: 'resolvedBy', as: 'ResolvedByUser' });

// NEW: PurchaseLog relationships
Material.hasMany(PurchaseLog, { foreignKey: 'materialId', as: 'purchaseLogs' });
PurchaseLog.belongsTo(Material, { foreignKey: 'materialId' });

// NEW: Contact relationships
Contact.hasMany(ContactNote, { foreignKey: 'contactId', as: 'contactNotes' });
ContactNote.belongsTo(Contact, { foreignKey: 'contactId' });

// Contact Notes relationships with Orders and PurchaseLog
Order.hasMany(ContactNote, { foreignKey: 'orderId', as: 'contactNotes' });
ContactNote.belongsTo(Order, { foreignKey: 'orderId' });

PurchaseLog.hasMany(ContactNote, { foreignKey: 'purchaseLogId', as: 'contactNotes' });
ContactNote.belongsTo(PurchaseLog, { foreignKey: 'purchaseLogId' });

// Contact Notes relationship with User (creator)
User.hasMany(ContactNote, { foreignKey: 'createdBy', as: 'createdContactNotes' });
ContactNote.belongsTo(User, { foreignKey: 'createdBy', as: 'CreatedByUser' });

module.exports = {
  User,
  Material,
  Product,
  Order,
  OrderProduct,
  MaterialMovement,
  ProgressReport,
  RemainingFabric,
  Inventaris,
  OrderLink,
  ProductMaterial,
  Shipment,
  RecurringPlan,
  StatusChange,
  FabricType,
  ProductColour,
  ProductVariation,
  ProductPhoto,
  MaterialPurchaseAlert,
  PurchaseLog,
  Contact,
  ContactNote,
}; 