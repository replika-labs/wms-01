# WMS Project - Use Case Analysis

### Primary Actors:

- **🔴 ADMIN** - Full system access and management capabilities
- **🔵 OPERATOR** - Limited operational access for daily tasks
- **⚪ GUEST** - Unauthenticated user with minimal access

### Access Levels:

- **Public** - No authentication required
- **Protected** - Requires authentication (`protect` middleware)
- **Admin Only** - Requires admin role (`protect` + `adminOnly`)

## User Roles

```typescript
enum UserRole {
  ADMIN    // Full system access
  OPERATOR // Limited operational access
}
```

## Use Cases by Module

### 🔐 Authentication & User Management

**Status: ✅ Fully Implemented**

| Use Case            | Actors   | Access Level |
| ------------------- | -------- | ------------ |
| User registration   | ⚪ GUEST | Public       |
| User login          | ⚪ GUEST | Public       |
| View all users      | 🔴 ADMIN | Admin Only   |
| Create new users    | 🔴 ADMIN | Admin Only   |
| Update user details | 🔴 ADMIN | Admin Only   |
| Toggle user status  | 🔴 ADMIN | Admin Only   |

### 📊 Dashboard & Analytics

**Status: ✅ Fully Implemented**

| Use Case                 | Actors   | Access Level |
| ------------------------ | -------- | ------------ |
| View dashboard summary   | 🔴 ADMIN | Admin Only   |
| View monthly statistics  | 🔴 ADMIN | Admin Only   |
| System health monitoring | 🔴 ADMIN | Admin Only   |
| Database debug info      | 🔴 ADMIN | Admin Only   |

### 📦 Orders Management

**Status: ✅ Fully Implemented**

| Use Case            | Actors                | Access Level |
| ------------------- | --------------------- | ------------ |
| View orders list    | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View order details  | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Create orders       | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Update orders       | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Delete orders       | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Update order status | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Assign workers      | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View order timeline | 🔴 ADMIN, 🔵 OPERATOR | Protected    |


### 🛍️ Product Management

**Status: ✅ Fully Implemented**

#### Read Operations (All Authenticated Users)

| Use Case                | Actors                | Access Level |
| ----------------------- | --------------------- | ------------ |
| View products list      | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View product details    | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View product categories | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View product colors     | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View stock movements    | 🔴 ADMIN, 🔵 OPERATOR | Protected    |

#### Write Operations (Admin Only)

| Use Case         | Actors   | Access Level |
| ---------------- | -------- | ------------ |
| Create products  | 🔴 ADMIN | Admin Only   |
| Update products  | 🔴 ADMIN | Admin Only   |
| Delete products  | 🔴 ADMIN | Admin Only   |
| Bulk operations  | 🔴 ADMIN | Admin Only   |
| Stock management | 🔴 ADMIN | Admin Only   |
| Photo management | 🔴 ADMIN | Admin Only   |

### 🏗️ Materials Management

**Status: ✅ Backend Implemented**

| Use Case            | Actors                | Access Level |
| ------------------- | --------------------- | ------------ |
| View materials      | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Create materials    | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Update materials    | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Delete materials    | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View critical stock | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Bulk operations     | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Import/Export       | 🔴 ADMIN, 🔵 OPERATOR | Protected    |

### 📊 Material Movement Tracking

**Status: ✅ Backend Implemented**

| Use Case         | Actors                | Access Level |
| ---------------- | --------------------- | ------------ |
| View movements   | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Create movements | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Update movements | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| View analytics   | 🔴 ADMIN, 🔵 OPERATOR | Protected    |

**Movement Types:**

- `IN` - Material received
- `OUT` - Material consumed
- `ADJUST` - Inventory adjustments

### 👥 Contact Management

**Status: ✅ Fully Implemented**

| Use Case        | Actors                | Access Level |
| --------------- | --------------------- | ------------ |
| View contacts   | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Create contacts | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Update contacts | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Delete contacts | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Search contacts | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Filter by type  | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Add notes       | 🔴 ADMIN, 🔵 OPERATOR | Protected    |

**Contact Types:**

- `CUSTOMER` - End customers
- `SUPPLIER` - Material suppliers
- `WORKER` - Production workers
- `OTHER` - Other contacts

### 📋 Purchase Logs

**Status: ✅ Backend Implemented**

| Use Case             | Actors                | Access Level |
| -------------------- | --------------------- | ------------ |
| View purchase logs   | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Create purchase logs | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Update purchase logs | 🔴 ADMIN, 🔵 OPERATOR | Protected    |
| Delete purchase logs | 🔴 ADMIN, 🔵 OPERATOR | Protected    |

use_cases = [
    [2, "UC-WMS-02", "Login pengguna", "Admin, Operator"],
    logout
    [7, "UC-WMS-07", "Melihat ringkasan dashboard", "Admin"],
    [8, "UC-WMS-08", "Melihat statistik bulanan", "Admin"],
    [11, "UC-WMS-11", "Melihat daftar pesanan", "Admin, Operator"],
    [12, "UC-WMS-12", "Melihat detail pesanan", "Admin, Operator"],
    [13, "UC-WMS-13", "Membuat pesanan", "Admin, Operator"],
    [14, "UC-WMS-14", "Memperbarui pesanan", "Admin, Operator"],
    [15, "UC-WMS-15", "Menghapus pesanan", "Admin, Operator"],
    [16, "UC-WMS-16", "Mengubah status pesanan", "Admin, Operator"],
    [17, "UC-WMS-17", "Menugaskan pekerja", "Admin, Operator"],
    [18, "UC-WMS-18", "Melihat timeline pesanan", "Admin, Operator"],
    [19, "UC-WMS-19", "Melihat daftar produk", "Admin, Operator"],
    [20, "UC-WMS-20", "Melihat detail produk", "Admin, Operator"],
    [21, "UC-WMS-21", "Melihat kategori produk", "Admin, Operator"],
    [22, "UC-WMS-22", "Melihat warna produk", "Admin, Operator"],
    [23, "UC-WMS-23", "Melihat pergerakan stok", "Admin, Operator"],
    [24, "UC-WMS-24", "Membuat produk", "Admin"],
    [25, "UC-WMS-25", "Memperbarui produk", "Admin"],
    [26, "UC-WMS-26", "Menghapus produk", "Admin"],
    [27, "UC-WMS-27", "Operasi massal produk", "Admin"],
    [28, "UC-WMS-28", "Manajemen stok", "Admin"],
    [29, "UC-WMS-29", "Manajemen foto produk", "Admin"],
    [30, "UC-WMS-30", "Melihat material", "Admin, Operator"],
    [31, "UC-WMS-31", "Menambah material", "Admin, Operator"],
    [32, "UC-WMS-32", "Memperbarui material", "Admin, Operator"],
    [33, "UC-WMS-33", "Menghapus material", "Admin, Operator"],
    [34, "UC-WMS-34", "Melihat stok kritis", "Admin, Operator"],
    [37, "UC-WMS-37", "Melihat pergerakan material", "Admin, Operator"],
    [41, "UC-WMS-41", "Melihat kontak", "Admin, Operator"],
    [42, "UC-WMS-42", "Menambah kontak", "Admin, Operator"],
    [43, "UC-WMS-43", "Memperbarui kontak", "Admin, Operator"],
    [44, "UC-WMS-44", "Menghapus kontak", "Admin, Operator"],
    [45, "UC-WMS-45", "Mencari kontak", "Admin, Operator"],
    [46, "UC-WMS-46", "Filter kontak berdasarkan tipe", "Admin, Operator"],
    [47, "UC-WMS-47", "Menambahkan catatan ke kontak", "Admin, Operator"],
    [48, "UC-WMS-48", "Melihat log pembelian", "Admin, Operator"],
    [49, "UC-WMS-49", "Menambah log pembelian", "Admin, Operator"],
    [50, "UC-WMS-50", "Memperbarui log pembelian", "Admin, Operator"],
    [51, "UC-WMS-51", "Menghapus log pembelian", "Admin, Operator"],
]
