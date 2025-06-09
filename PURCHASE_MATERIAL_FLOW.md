# Purchase to Material Movement Flow

## Overview

When a purchase is marked as "RECEIVED", the system automatically creates a material movement with type "IN" to update the stock. This ensures inventory levels are automatically maintained when materials arrive.

## Flow Process

### 1. Purchase Creation

```javascript
// Status: PENDING
const purchase = {
  materialId: 1,
  supplier: 'ABC Supplier',
  quantity: 100,
  costPerUnit: 1500,
  status: 'PENDING',
};
```

### 2. Status Changes

- **PENDING** → **ORDERED**: No stock change
- **ORDERED** → **RECEIVED**: ✅ **Automatic stock increase**
- **RECEIVED** → **PENDING/ORDERED**: ✅ **Automatic stock decrease (reversal)**

### 3. When Status = "RECEIVED"

The system automatically:

1. **Creates MaterialMovement**:

   ```javascript
   {
     materialId: purchase.materialId,
     purchaseLogId: purchase.id,
     movementType: "IN",
     quantity: receivedQuantity || quantity,
     costPerUnit: purchase.costPerUnit,
     notes: "Automatic stock in from purchase: [supplier]",
     qtyAfter: currentStock + receivedQuantity
   }
   ```

2. **Updates Material Stock**:
   ```javascript
   material.qtyOnHand += receivedQuantity;
   ```

## Key Features

### ✅ Automatic Stock Management

- Purchase "RECEIVED" → Stock automatically increases
- Purchase status changed from "RECEIVED" → Stock automatically decreases (reversal)

### ✅ Audit Trail

- All purchase-generated movements are marked with `purchaseLogId`
- Cannot be manually edited or deleted
- Clear notes indicating source purchase

### ✅ Data Integrity

- Uses database transactions for consistency
- Prevents negative stock on reversal
- Validates stock levels before changes

### ✅ Business Logic

- Uses `receivedQuantity` if specified, otherwise `quantity`
- Tracks actual received amount vs ordered amount
- Maintains cost tracking through material movements

## API Endpoints

### Update Purchase Status

```http
PUT /api/purchase-logs/:id/status
Content-Type: application/json

{
  "status": "RECEIVED"
}
```

### Response

```json
{
  "success": true,
  "message": "Status updated to RECEIVED and stock updated",
  "data": {
    "id": 1,
    "status": "RECEIVED",
    "material": { ... }
  }
}
```

## Material Movement Integration

### Frontend Display

- Material movements show purchase information
- Purchase-generated movements marked as "Purchase-generated"
- Cannot edit/delete purchase movements from material movement page

### Stock Tracking

- Real-time stock updates in material list
- Historical tracking through movement records
- Cost averaging through purchase costs

## Error Handling

### Common Scenarios

1. **Negative Stock on Reversal**: Prevents status change
2. **Missing Material**: Validates material exists
3. **Transaction Failures**: Rolls back all changes
4. **Duplicate Movements**: Prevents multiple movements for same purchase

### Error Messages

- Clear business-friendly error messages
- Detailed logging for debugging
- Proper HTTP status codes

## Database Schema

### Relationships

```
PurchaseLog (1) ←→ (1) MaterialMovement
PurchaseLog (N) → (1) Material
MaterialMovement (N) → (1) Material
```

### Key Fields

- `PurchaseLog.status`: PENDING, ORDERED, RECEIVED, CANCELLED
- `MaterialMovement.purchaseLogId`: Links to purchase
- `MaterialMovement.movementType`: Always "IN" for purchases
- `Material.qtyOnHand`: Updated automatically
