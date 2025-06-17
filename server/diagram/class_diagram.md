# WMS System Class Diagram

This diagram shows the complete architecture of the Warehouse Management System (WMS) including entities, boundary components (pages), controllers, and their relationships.

```mermaid
classDiagram
    %% Entity Classes (from Prisma Schema)
    class User {
        <<Entity>>
        +id: Int
        +name: String
        +email: String
        +phone: String
        +whatsappPhone: String
        +passwordHash: String
        +role: UserRole
        +isActive: Boolean
        +loginEnabled: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Material {
        <<Entity>>
        +id: Int
        +name: String
        +description: String
        +code: String
        +unit: String
        +qtyOnHand: Decimal
        +minStock: Decimal
        +maxStock: Decimal
        +reorderPoint: Decimal
        +reorderQty: Decimal
        +location: String
        +attributeType: String
        +attributeValue: String
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Product {
        <<Entity>>
        +id: Int
        +name: String
        +code: String
        +materialId: Int
        +productColorId: Int
        +productVariationId: Int
        +category: String
        +price: Decimal
        +qtyOnHand: Int
        +unit: String
        +description: String
        +defaultTarget: Int
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Order {
        <<Entity>>
        +id: Int
        +orderNumber: String
        +status: OrderStatus
        +targetPcs: Int
        +completedPcs: Int
        +customerNote: String
        +dueDate: DateTime
        +userId: Int
        +workerId: Int
        +workerContactId: Int
        +description: String
        +priority: Priority
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class OrderProduct {
        <<Entity>>
        +id: Int
        +orderId: Int
        +productId: Int
        +quantity: Int
        +unitPrice: Decimal
        +totalPrice: Decimal
        +notes: String
        +completedQty: Int
        +status: OrderProductStatus
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class MaterialMovement {
        <<Entity>>
        +id: Int
        +materialId: Int
        +orderId: Int
        +userId: Int
        +purchaseLogId: Int
        +movementType: MaterialMovementType
        +quantity: Decimal
        +unit: String
        +costPerUnit: Decimal
        +totalCost: Decimal
        +notes: String
        +qtyAfter: Decimal
        +movementDate: DateTime
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ProgressReport {
        <<Entity>>
        +id: Int
        +orderId: Int
        +orderProductId: Int
        +productId: Int
        +userId: Int
        +reportText: String
        +photoPath: String
        +percentage: Int
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ProductProgressReport {
        <<Entity>>
        +id: Int
        +progressReportId: Int
        +productId: Int
        +orderProductId: Int
        +itemsCompleted: Int
        +itemsTarget: Int
        +status: String
        +notes: String
        +completionDate: DateTime
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ProductProgressPhoto {
        <<Entity>>
        +id: Int
        +productProgressReportId: Int
        +photoPath: String
        +thumbnailPath: String
        +description: String
        +uploadDate: DateTime
        +fileSize: Int
        +mimeType: String
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ProductPhoto {
        <<Entity>>
        +id: Int
        +productId: Int
        +photoPath: String
        +thumbnailPath: String
        +description: String
        +isPrimary: Boolean
        +sortOrder: Int
        +fileSize: Int
        +mimeType: String
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class OrderLink {
        <<Entity>>
        +id: Int
        +orderId: Int
        +userId: Int
        +linkToken: String
        +isActive: Boolean
        +expiresAt: DateTime
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Contact {
        <<Entity>>
        +id: Int
        +name: String
        +phone: String
        +whatsappPhone: String
        +email: String
        +address: String
        +contactType: ContactType
        +company: String
        +notes: String
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ContactNote {
        <<Entity>>
        +id: Int
        +contactId: Int
        +orderId: Int
        +purchaseLogId: Int
        +createdBy: Int
        +noteType: NoteType
        +subject: String
        +content: String
        +followUpDate: DateTime
        +isImportant: Boolean
        +tags: String
        +attachmentPath: String
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class PurchaseLog {
        <<Entity>>
        +id: Int
        +materialId: Int
        +supplier: String
        +quantity: Decimal
        +unit: String
        +pricePerUnit: Decimal
        +totalCost: Decimal
        +purchaseDate: DateTime
        +invoiceNumber: String
        +receiptPath: String
        +notes: String
        +status: PurchaseStatus
        +deliveryDate: DateTime
        +receivedQuantity: Decimal
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ProductColour {
        <<Entity>>
        +id: Int
        +colorName: String
        +colorCode: String
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class ProductVariation {
        <<Entity>>
        +id: Int
        +variationType: String
        +variationValue: String
        +priceAdjustment: Decimal
        +isActive: Boolean
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class RemainingMaterial {
        <<Entity>>
        +id: Int
        +materialId: Int
        +quantity: Decimal
        +unit: String
        +notes: String
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Inventaris {
        <<Entity>>
        +id: Int
        +name: String
        +quantity: Int
        +unit: String
        +notes: String
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class Shipment {
        <<Entity>>
        +id: Int
        +orderId: Int
        +trackingNumber: String
        +carrier: String
        +shippedDate: DateTime
        +deliveredDate: DateTime
        +status: ShipmentStatus
        +notes: String
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class RecurringPlan {
        <<Entity>>
        +id: Int
        +productId: Int
        +quantity: Int
        +frequency: String
        +isActive: Boolean
        +nextDue: DateTime
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class StatusChange {
        <<Entity>>
        +id: Int
        +orderId: Int
        +changedBy: Int
        +fromStatus: OrderStatus
        +toStatus: OrderStatus
        +reason: String
        +notes: String
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    class MaterialPurchaseAlert {
        <<Entity>>
        +id: Int
        +materialId: Int
        +orderId: Int
        +alertType: MaterialPurchaseAlertType
        +requiredQuantity: Decimal
        +currentStock: Decimal
        +urgencyLevel: UrgencyLevel
        +message: String
        +status: AlertStatus
        +createdBy: Int
        +resolvedBy: Int
        +resolvedAt: DateTime
        +resolution: String
        +estimatedCost: Decimal
        +suggestedSupplier: String
        +createdAt: DateTime
        +updatedAt: DateTime
    }

    %% Boundary Classes (Pages)
    class DashboardPage {
        <<boundary>>
        +fetchSummary()
        +displayCharts()
        +handleRefresh()
    }

    class ProductsPage {
        <<boundary>>
        +fetchProducts()
        +fetchMaterials()
        +handleBulkAction()
        +handleDeleteProduct()
        +handleFilterChange()
    }

    class OrdersManagementPage {
        <<boundary>>
        +fetchOrders()
        +fetchTailors()
        +handleStatusChange()
        +handleCreate()
        +handleUpdate()
        +handleDelete()
    }

    class MaterialsPage {
        <<boundary>>
        +loadMaterials()
        +loadMaterialDetails()
        +handleCreateMaterial()
        +handleUpdateMaterial()
        +handleDeleteMaterial()
    }

    class ContactsPage {
        <<boundary>>
        +fetchContacts()
        +handleCreateContact()
        +handleUpdateContact()
        +handleDeleteContact()
        +fetchContactNotes()
    }

    class PurchaseLogsPage {
        <<boundary>>
        +fetchPurchaseLogs()
        +handleCreateLog()
        +handleUpdateLog()
        +handleDeleteLog()
    }

    class UsersPage {
        <<boundary>>
        +fetchUsers()
        +handleCreateUser()
        +handleUpdateUser()
        +toggleUserStatus()
    }

    class MaterialMovementPage {
        <<boundary>>
        +fetchMovements()
        +handleCreateMovement()
        +fetchAnalytics()
    }

    class ProgressPage {
        <<boundary>>
        +fetchProgressReports()
        +handleCreateReport()
        +fetchProgressPhotos()
    }

    class LoginPage {
        <<boundary>>
        +handleLogin()
        +validateCredentials()
    }

    class OrderLinkPage {
        <<boundary>>
        +fetchOrderByToken()
        +displayOrderDetails()
    }

    %% Controller Classes
    class DashboardController {
        <<controller>>
        +getAdminSummary()
        +getMonthlyStats()
    }

    class ProductController {
        <<controller>>
        +getProducts()
        +getProductById()
        +createProduct()
        +updateProduct()
        +deleteProduct()
        +getProductCategories()
        +getProductColors()
        +getProductVariations()
        +bulkDeleteProducts()
        +bulkActivateProducts()
        +bulkDeactivateProducts()
        +checkProductDeletable()
        +checkBulkDeleteProducts()
    }

    class ProductStockController {
        <<controller>>
        +completeOrderStock()
        +adjustProductStock()
        +setProductStock()
        +getProductStockMovements()
        +bulkCompleteOrdersStock()
    }

    class ProductColourController {
        <<controller>>
        +getProductColours()
        +getProductColourById()
        +createProductColour()
        +updateProductColour()
        +deleteProductColour()
    }

    class ProductVariationController {
        <<controller>>
        +getProductVariations()
        +getProductVariationById()
        +createProductVariation()
        +updateProductVariation()
        +deleteProductVariation()
    }

    class OrdersManagementController {
        <<controller>>
        +getOrdersList()
        +getWorkers()
        +getOrderDetails()
        +updateOrderStatus()
        +updateOrderWorker()
        +clearWorkersCache()
        +createOrder()
        +updateOrder()
        +deleteOrder()
        +getOrderTimeline()
    }

    class MaterialsManagementController {
        <<controller>>
        +getAllMaterials()
        +getMaterialById()
        +createMaterial()
        +updateMaterial()
        +deleteMaterial()
        +getMaterialsByCategory()
        +getMaterialsWithCriticalStock()
        +bulkUpdateMaterials()
        +exportMaterials()
        +importMaterials()
        +getInventoryAnalytics()
        +getStockMovements()
        +updateStockLevel()
        +adjustStock()
    }

    class ContactController {
        <<controller>>
        +getContacts()
        +getContactById()
        +createContact()
        +updateContact()
        +deleteContact()
        +toggleContactStatus()
        +getContactsByType()
        +searchContacts()
        +addContactNote()
    }

    class PurchaseLogController {
        <<controller>>
        +getAllPurchaseLogs()
        +getPurchaseLogById()
        +createPurchaseLog()
        +updatePurchaseLog()
        +deletePurchaseLog()
        +updatePurchaseLogStatus()
        +getPurchaseLogsByMaterial()
        +getPurchaseLogsBySupplier()
        +getPurchaseLogsByDateRange()
        +getPurchaseLogAnalytics()
    }

    class UserController {
        <<controller>>
        +getUsers()
        +getUserById()
        +createUser()
        +updateUser()
        +toggleUserStatus()
        +getOperatorUsers()
    }

    class MaterialMovementController {
        <<controller>>
        +getAllMovements()
        +getAnalytics()
        +getMovementsByOrder()
        +getMovementsByMaterial()
        +getMaterialInventory()
        +getMovementById()
        +createMovement()
        +updateMovement()
        +deleteMovement()
    }

    class ProgressReportController {
        <<controller>>
        +getProgressReports()
        +createProgressReport()
        +getProgressPhotos()
    }

    class AuthController {
        <<controller>>
        +login()
        +register()
        +logout()
        +validateToken()
    }

    class OrderLinkController {
        <<controller>>
        +generateOrderLink()
        +getOrderByToken()
        +validateOrderLink()
        +getRemainingMaterials()
    }

    %% Entity Relationships
    Order "1" *-- "*" OrderProduct
    Order "1" *-- "*" MaterialMovement
    Order "1" *-- "*" ProgressReport
    Order "1" *-- "1" OrderLink
    Order "1" *-- "1" Shipment
    Order "1" *-- "*" StatusChange
    Order "1" *-- "*" MaterialPurchaseAlert
    Order "1" *-- "*" ContactNote

    Contact "1" *-- "*" ContactNote
    Contact "1" *-- "*" Order

    PurchaseLog "1" *-- "*" ContactNote
    PurchaseLog "1" *-- "1" MaterialMovement

    Product "1" *-- "*" ProductPhoto
    Product "1" *-- "*" OrderProduct
    Product "1" *-- "*" ProgressReport
    Product "1" *-- "*" ProductProgressReport
    Product "1" *-- "*" RecurringPlan

    ProgressReport "1" *-- "*" ProductProgressReport
    ProductProgressReport "1" *-- "*" ProductProgressPhoto

    Material "1" *-- "*" Product
    Material "1" *-- "*" MaterialMovement
    Material "1" *-- "*" RemainingMaterial
    Material "1" *-- "*" MaterialPurchaseAlert
    Material "1" *-- "*" PurchaseLog

    User "1" *-- "*" Order
    User "1" *-- "*" MaterialMovement
    User "1" *-- "*" ProgressReport
    User "1" *-- "*" ContactNote
    User "1" *-- "*" OrderLink
    User "1" *-- "*" StatusChange
    User "1" *-- "*" MaterialPurchaseAlert

    ProductColour "1" *-- "*" Product
    ProductVariation "1" *-- "*" Product

    %% Page to Controller Relationships
    DashboardPage --> DashboardController : uses getAdminSummary()<br/>uses getMonthlyStats()

    ProductsPage --> ProductController : uses getProducts()<br/>uses getProductById()<br/>uses createProduct()<br/>uses updateProduct()<br/>uses deleteProduct()<br/>uses bulkDeleteProducts()<br/>uses checkProductDeletable()
    ProductsPage --> ProductStockController : uses adjustProductStock()<br/>uses setProductStock()<br/>uses getProductStockMovements()
    ProductsPage --> MaterialsManagementController : uses getAllMaterials()

    OrdersManagementPage --> OrdersManagementController : uses getOrdersList()<br/>uses getOrderDetails()<br/>uses createOrder()<br/>uses updateOrder()<br/>uses deleteOrder()<br/>uses updateOrderStatus()<br/>uses updateOrderWorker()<br/>uses getOrderTimeline()
    OrdersManagementPage --> ContactController : uses getContactsByType()

    MaterialsPage --> MaterialsManagementController : uses getAllMaterials()<br/>uses getMaterialById()<br/>uses createMaterial()<br/>uses updateMaterial()<br/>uses deleteMaterial()<br/>uses getInventoryAnalytics()

    ContactsPage --> ContactController : uses getContacts()<br/>uses getContactById()<br/>uses createContact()<br/>uses updateContact()<br/>uses deleteContact()<br/>uses addContactNote()

    PurchaseLogsPage --> PurchaseLogController : uses getAllPurchaseLogs()<br/>uses getPurchaseLogById()<br/>uses createPurchaseLog()<br/>uses updatePurchaseLog()<br/>uses deletePurchaseLog()

    UsersPage --> UserController : uses getUsers()<br/>uses getUserById()<br/>uses createUser()<br/>uses updateUser()<br/>uses toggleUserStatus()

    MaterialMovementPage --> MaterialMovementController : uses getAllMovements()<br/>uses getAnalytics()<br/>uses createMovement()<br/>uses getMovementsByMaterial()

    ProgressPage --> ProgressReportController : uses getProgressReports()<br/>uses createProgressReport()<br/>uses getProgressPhotos()

    LoginPage --> AuthController : uses login()<br/>uses register()

    OrderLinkPage --> OrderLinkController : uses getOrderByToken()<br/>uses getRemainingMaterials()

    %% Controller to Entity Relationships (Data Access)
    DashboardController --> Order : reads
    DashboardController --> Product : reads
    DashboardController --> MaterialMovement : reads

    ProductController --> Product : CRUD
    ProductController --> ProductPhoto : CRUD
    ProductController --> Material : reads
    ProductController --> ProductColour : reads
    ProductController --> ProductVariation : reads

    ProductStockController --> Product : updates
    ProductStockController --> MaterialMovement : creates

    OrdersManagementController --> Order : CRUD
    OrdersManagementController --> OrderProduct : CRUD
    OrdersManagementController --> Contact : reads
    OrdersManagementController --> StatusChange : creates

    MaterialsManagementController --> Material : CRUD
    MaterialsManagementController --> MaterialMovement : reads

    ContactController --> Contact : CRUD
    ContactController --> ContactNote : CRUD

    PurchaseLogController --> PurchaseLog : CRUD
    PurchaseLogController --> Material : reads

    UserController --> User : CRUD

    MaterialMovementController --> MaterialMovement : CRUD
    MaterialMovementController --> Material : reads/updates
    MaterialMovementController --> Order : reads

    ProgressReportController --> ProgressReport : CRUD
    ProgressReportController --> ProductProgressReport : CRUD
    ProgressReportController --> ProductProgressPhoto : CRUD

    AuthController --> User : reads/validates

    OrderLinkController --> OrderLink : CRUD
    OrderLinkController --> Order : reads
    OrderLinkController --> RemainingMaterial : reads
```

## Architecture Overview

This class diagram represents a **Clean Architecture** implementation of a Warehouse Management System with the following layers:

### 🏗️ **Entities Layer**

Domain entities representing the core business objects, defined in the Prisma schema:

- **User Management**: User accounts with roles and permissions
- **Product Management**: Products, variations, colors, and photos
- **Order Management**: Orders, order products, and status tracking
- **Inventory Management**: Materials, movements, and stock levels
- **Progress Tracking**: Reports and photo documentation
- **Contact Management**: Suppliers, workers, customers
- **Purchase Management**: Purchase logs and alerts

### 🎯 **Boundary Layer** (UI/Pages)

Frontend React pages that handle user interactions:

- Dashboard for analytics and overview
- CRUD pages for all major entities
- Authentication pages
- Public order tracking via links

### 🔧 **Controller Layer** (Business Logic)

Backend controllers that handle business rules and data operations:

- Each controller manages specific domain logic
- Controllers interact with entities through Prisma ORM
- API endpoints expose controller methods to frontend

### 🔄 **Data Flow**

1. **User Interaction**: User interacts with boundary components (pages)
2. **API Calls**: Pages call controller methods via REST API routes
3. **Business Logic**: Controllers process requests and apply business rules
4. **Data Access**: Controllers interact with entities via Prisma ORM
5. **Response**: Data flows back through the layers to the UI

### 📊 **Key Relationships**

- **Entity Relationships**: Defined by foreign keys and Prisma relations
- **Page → Controller**: Via API routes (HTTP requests)
- **Controller → Entity**: Via Prisma ORM (database operations)

This architecture ensures **separation of concerns**, **maintainability**, and **testability** while following clean architecture principles.
