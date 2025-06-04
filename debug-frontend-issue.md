# 🔧 Debug Guide: Product-Material Frontend Issues

## ✅ Backend Status (CONFIRMED WORKING)
- **Database**: Product.materialId properly connects to materials.id ✅
- **Model Relationships**: Product.belongsTo(Material) working ✅  
- **API Endpoints**: POST/PUT /api/products handle materialId correctly ✅
- **CRUD Operations**: Create/Update products with materials working ✅

## 🧪 Frontend Forms Analysis

### Create Product Form
**File**: `client/app/dashboard/products/create/page.js`
**Status**: ✅ **CORRECTLY IMPLEMENTED**

```javascript
// Form state includes materialId
const [formData, setFormData] = useState({
  materialId: '',  // ✅ Present
  // ... other fields
});

// Materials fetched correctly
useEffect(() => {
  const fetchMaterials = async () => {
    const response = await fetch('http://localhost:8080/api/materials', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setMaterials(data);  // ✅ Materials loaded
  };
}, [user]);

// Form field correctly implemented
<select name="materialId" value={formData.materialId} onChange={handleInputChange}>
  <option value="">Select material (optional)</option>
  {materials.map(material => (
    <option key={material.id} value={material.id}>
      {material.name} ({material.code})
    </option>
  ))}
</select>
```

### Edit Product Form  
**File**: `client/app/dashboard/products/[id]/edit/page.js`
**Status**: ✅ **CORRECTLY IMPLEMENTED**

```javascript
// Form loads existing materialId
setFormData({
  materialId: productData.materialId || '',  // ✅ Loads existing value
  // ... other fields
});

// Same dropdown implementation as create form ✅
```

## 🔍 Possible Issues & Solutions

### Issue 1: Authentication Problems
**Symptom**: Dropdown appears empty or API calls fail
**Solution**: 
1. Check if user is logged in: `localStorage.getItem('token')`
2. Verify token validity: Check Network tab in browser DevTools
3. Login with valid credentials: `email.admin@contoh.com` / `admin123`

### Issue 2: Materials API Not Loading
**Symptom**: Dropdown shows "Select material (optional)" but no options
**Solution**:
1. Open browser DevTools → Network tab
2. Look for API call to `/api/materials`
3. Check if it returns 200 OK with material data
4. If 401 error → Authentication issue
5. If 500 error → Backend issue

### Issue 3: Form Not Submitting materialId
**Symptom**: materialId not saved when creating/editing products
**Solution**:
1. Open DevTools → Network tab
2. Submit form and check POST/PUT request
3. Verify request body includes `materialId` field
4. Check server response for errors

### Issue 4: Browser Cache Issues
**Symptom**: Old code running despite updates
**Solution**:
1. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Check if both servers are running:
   - Backend: http://localhost:8080/api/health
   - Frontend: http://localhost:3000

## 🧪 Step-by-Step Debugging

### Step 1: Verify Servers Are Running
```bash
# Check backend health
curl http://localhost:8080/api/health
# Should return: {"status":"ok","database":"connected"}

# Check frontend
curl http://localhost:3000
# Should return HTML content
```

### Step 2: Test Materials API
```bash
# Login and get token first, then:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/materials
# Should return array of materials
```

### Step 3: Test Product Creation
1. Open http://localhost:3000/dashboard/products/create
2. Fill in required fields (name, code, category)
3. Select a material from Base Material dropdown  
4. Submit form
5. Check if product is created with correct materialId

### Step 4: Browser DevTools Inspection
1. Open DevTools (F12)
2. Go to Console tab - check for JavaScript errors
3. Go to Network tab - check API calls and responses  
4. Go to Application tab → Local Storage - verify auth token exists

## 🎯 Expected Behavior
- **Materials dropdown**: Should show list of available materials
- **Create product**: Should save with selected materialId
- **Edit product**: Should show current material selected and allow changes
- **View product**: Should display associated material name

## 📞 User Action Required
Please test the following and report what you see:

1. **Login**: Go to http://localhost:3000/login with `email.admin@contoh.com` / `admin123`
2. **Navigate**: Go to Products → Create New Product
3. **Check Dropdown**: Does the "Base Material" dropdown show material options?
4. **Create Test**: Try creating a product with a material selected
5. **Verify**: Check if the created product shows the assigned material

If any step fails, please share:
- Screenshot of the form
- Browser console errors (F12 → Console)
- Network requests (F12 → Network → look for failed requests) 