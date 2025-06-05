'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '../../components/AuthWrapper';
import DashboardLayout from '../../components/DashboardLayout';

export default function EnhancedInventoryPage() {
  const [inventory, setInventory] = useState({
    materials: [],
    products: [],
    otherItems: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('materials');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [materials, setMaterials] = useState([]); // For product material dropdown
  const [fabricTypeSearch, setFabricTypeSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [showFabricDropdown, setShowFabricDropdown] = useState(false);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const router = useRouter();

  // Enhanced form states for new Material and Product fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    qtyOnHand: 0,
    unit: 'pcs',
    safetyStock: 0,
    description: '',
    type: 'material',
    category: '',
    // Material fields
    fabricTypeColor: '',
    purchaseDate: '',
    numberOfRolls: 1,
    totalUnits: 0,
    store: '',
    image: '',
    price: 0,
    // Product fields
    materialId: '',
    materialName: '', // For display purposes
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    
    fetchInventory();
    fetchFabricTypes();
    fetchMaterials();
  }, []);

  const fetchFabricTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/fabric-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFabricTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch fabric types:', err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      // Fetch materials
      const materialsRes = await fetch('/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!materialsRes.ok) {
        throw new Error('Failed to fetch materials');
      }
      const materialsData = await materialsRes.json();

      // Fetch products
      const productsRes = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!productsRes.ok) {
        throw new Error('Failed to fetch products');
      }
      const productsData = await productsRes.json();

      // Fetch other inventory items
      const otherRes = await fetch('/api/inventaris', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!otherRes.ok) {
        throw new Error('Failed to fetch other inventory');
      }
      const otherData = await otherRes.json();

      setInventory({
        materials: materialsData,
        products: productsData,
        otherItems: otherData
      });
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let payload = { ...formData };

      switch (formData.type) {
        case 'material':
          endpoint = '/api/materials';
          payload = {
            name: formData.name,
            code: formData.code || undefined,
            qtyOnHand: formData.qtyOnHand,
            unit: formData.unit,
            safetyStock: formData.safetyStock,
            description: formData.description,
            fabricTypeColor: formData.fabricTypeColor || undefined,
            purchaseDate: formData.purchaseDate || undefined,
            numberOfRolls: formData.numberOfRolls || undefined,
            totalUnits: formData.totalUnits || undefined,
            store: formData.store || undefined,
            image: formData.image || undefined,
            price: formData.price || undefined
          };
          break;
        case 'product':
          endpoint = '/api/products';
          payload = {
            name: formData.name,
            code: formData.code,
            materialId: formData.materialId || undefined,
            category: formData.category || undefined,
            price: formData.price || undefined,
            qtyOnHand: formData.qtyOnHand,
            unit: formData.unit,
            description: formData.description,
            defaultTarget: formData.defaultTarget || 0
          };
          break;
        case 'other':
          endpoint = '/api/inventaris';
          payload = {
            itemName: formData.name,
            qty: formData.qtyOnHand,
            unit: formData.unit,
            category: formData.category,
            description: formData.description
          };
          break;
        default:
          throw new Error('Invalid item type');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to add ${formData.type}`);
      }
      
      await fetchInventory();
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to add item:', err);
      setError(err.message || `Failed to add ${formData.type}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      qtyOnHand: 0,
      unit: 'pcs',
      safetyStock: 0,
      description: '',
      type: 'material',
      category: '',
      fabricTypeColor: '',
      purchaseDate: '',
      numberOfRolls: 1,
      totalUnits: 0,
      store: '',
      image: '',
      price: 0,
      materialId: '',
      materialName: ''
    });
    setFabricTypeSearch('');
    setMaterialSearch('');
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'materials':
        return inventory.materials.map(item => ({ ...item, type: 'material' }));
      case 'products':
        return inventory.products.map(item => ({ ...item, type: 'product' }));
      case 'other':
        return inventory.otherItems.map(item => ({ 
          ...item, 
          type: 'other',
          name: item.itemName,
          qtyOnHand: item.qty
        }));
      default:
        return [];
    }
  };

  const filteredFabricTypes = fabricTypes.filter(ft => 
    ft.fabricName.toLowerCase().includes(fabricTypeSearch.toLowerCase())
  );

  const filteredMaterials = materials.filter(mat => 
    mat.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const handleFabricTypeSelect = (fabricType) => {
    setFormData({...formData, fabricTypeColor: fabricType.fabricName});
    setFabricTypeSearch(fabricType.fabricName);
    setShowFabricDropdown(false);
  };

  const handleMaterialSelect = (material) => {
    setFormData({...formData, materialId: material.id, materialName: material.name});
    setMaterialSearch(material.name);
    setShowMaterialDropdown(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR' 
    }).format(amount);
  };

  if (!user) return null;

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Enhanced Inventory Management</h1>
            <button
              onClick={() => {
                setFormData({ ...formData, type: activeTab === 'other' ? 'other' : activeTab.slice(0, -1) });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Add {activeTab === 'other' ? 'Item' : activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['materials', 'products', 'other'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              Loading inventory...
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      {activeTab === 'materials' && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fabric Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Units</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      {activeTab === 'materials' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety Stock</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentItems().map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.name || item.itemName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.code || '-'}</td>
                        {activeTab === 'materials' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.fabricTypeColor || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.purchaseDate)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalUnits || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.store || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.price)}</td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.qtyOnHand || item.qty || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                        {activeTab === 'materials' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.safetyStock || 0}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => console.log('Edit:', item)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => console.log('Delete:', item)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Item Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                  Add New {formData.type === 'other' ? 'Item' : formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
                </h2>
                <form onSubmit={handleAddItem}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    {formData.type !== 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Code (Auto-generated if empty)</label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Leave empty for auto-generation"
                        />
                      </div>
                    )}

                    {/* Enhanced Material Fields */}
                    {formData.type === 'material' && (
                      <>
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700">Fabric Type & Color</label>
                          <input
                            type="text"
                            value={fabricTypeSearch}
                            onChange={(e) => {
                              setFabricTypeSearch(e.target.value);
                              setFormData({...formData, fabricTypeColor: e.target.value});
                              setShowFabricDropdown(true);
                            }}
                            onFocus={() => setShowFabricDropdown(true)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., SILK-ROSE GOLD"
                          />
                          {showFabricDropdown && filteredFabricTypes.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                              {filteredFabricTypes.map((ft) => (
                                <div
                                  key={ft.id}
                                  onClick={() => handleFabricTypeSelect(ft)}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                >
                                  <div className="font-medium">{ft.fabricName}</div>
                                  <div className="text-gray-500 text-xs">Code: {ft.fabricCode}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                          <input
                            type="date"
                            value={formData.purchaseDate}
                            onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Number of Rolls</label>
                          <input
                            type="number"
                            value={formData.numberOfRolls}
                            onChange={(e) => setFormData({...formData, numberOfRolls: parseInt(e.target.value)})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            min="1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total Units</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.totalUnits}
                            onChange={(e) => setFormData({...formData, totalUnits: parseFloat(e.target.value)})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Store/Supplier</label>
                          <input
                            type="text"
                            value={formData.store}
                            onChange={(e) => setFormData({...formData, store: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Hijabertex"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Price per Unit</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Image URL</label>
                          <input
                            type="url"
                            value={formData.image}
                            onChange={(e) => setFormData({...formData, image: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="https://..."
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.qtyOnHand}
                        onChange={(e) => setFormData({...formData, qtyOnHand: parseFloat(e.target.value)})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="pcs">Pieces</option>
                        <option value="meter">Meters</option>
                        <option value="roll">Rolls</option>
                        <option value="kg">Kilograms</option>
                        <option value="unit">Units</option>
                      </select>
                    </div>
                    
                    {formData.type === 'material' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Safety Stock</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.safetyStock}
                          onChange={(e) => setFormData({...formData, safetyStock: parseFloat(e.target.value)})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows="3"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowFabricDropdown(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Add {formData.type === 'other' ? 'Item' : formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 