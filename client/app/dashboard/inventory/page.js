'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '../../components/AuthWrapper';
import DashboardLayout from '../../components/DashboardLayout';

export default function InventoryPage() {
  const [inventory, setInventory] = useState({
    materials: [],
    products: [],
    otherItems: []
  });
  const [materials, setMaterials] = useState([]); // For material dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('materials'); // 'materials', 'products', 'other'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const router = useRouter();

  // Photo upload states
  const [photos, setPhotos] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Edit modal photo states
  const [editPhotos, setEditPhotos] = useState([]);
  const [editDragActive, setEditDragActive] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    qtyOnHand: 0,
    unit: 'pcs',
    safetyStock: 0,
    description: '',
    type: 'material', // 'material', 'product', 'other'
    category: '', // untuk other items dan products
    // Product-specific fields
    materialId: '',
    price: '',
    defaultTarget: 0,
    isActive: true
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
    
    // Get tab from URL if present
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['materials', 'products', 'other'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
    
    fetchMaterials();
    fetchInventory();
  }, []);

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error('Failed to fetch materials for dropdown:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found in localStorage');
        setError('Authentication token not found. Please login again.');
        return;
      }

      console.log('Fetching inventory with token:', token.substring(0, 10) + '...');
      
      // Fetch materials
      const materialsRes = await fetch('/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!materialsRes.ok) {
        const errorData = await materialsRes.json().catch(() => ({}));
        console.error('Materials fetch failed:', materialsRes.status, errorData);
        throw new Error(`Failed to fetch materials: ${materialsRes.status} ${errorData.message || ''}`);
      }
      const materialsData = await materialsRes.json();

      // Fetch products
      const productsRes = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!productsRes.ok) {
        const errorData = await productsRes.json().catch(() => ({}));
        console.error('Products fetch failed:', productsRes.status, errorData);
        throw new Error(`Failed to fetch products: ${productsRes.status} ${errorData.message || ''}`);
      }
      const productsData = await productsRes.json();

      // Fetch other inventory items
      const otherRes = await fetch('/api/inventaris', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!otherRes.ok) {
        const errorData = await otherRes.json().catch(() => ({}));
        console.error('Other inventory fetch failed:', otherRes.status, errorData);
        throw new Error(`Failed to fetch other inventory: ${otherRes.status} ${errorData.message || ''}`);
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

      switch (formData.type) {
        case 'material':
          endpoint = '/api/materials';
          const res1 = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
          });
          
          if (!res1.ok) {
            const errorData = await res1.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to add ${formData.type}`);
          }
          break;

        case 'product':
          endpoint = '/api/products';
          // Use FormData for file upload
          const formDataToSend = new FormData();
          
          // Add form fields
          formDataToSend.append('name', formData.name);
          formDataToSend.append('code', formData.code);
          if (formData.materialId) formDataToSend.append('materialId', formData.materialId);
          if (formData.category) formDataToSend.append('category', formData.category);
          if (formData.price) formDataToSend.append('price', formData.price);
          formDataToSend.append('qtyOnHand', formData.qtyOnHand || 0);
          formDataToSend.append('unit', formData.unit || 'pcs');
          if (formData.description) formDataToSend.append('description', formData.description);
          formDataToSend.append('defaultTarget', formData.defaultTarget || 0);
          formDataToSend.append('isActive', formData.isActive);

          // Add photos
          photos.forEach((photo) => {
            formDataToSend.append('photos', photo.file);
          });

          const res2 = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
              // Don't set Content-Type, let browser set it with boundary for FormData
            },
            body: formDataToSend
          });

          if (!res2.ok) {
            const errorData = await res2.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to add ${formData.type}`);
          }
          break;

        case 'other':
          endpoint = '/api/inventaris';
          const payload = {
            itemName: formData.name,
            qty: formData.qtyOnHand,
            unit: formData.unit,
            category: formData.category,
            description: formData.description
          };

          const res3 = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (!res3.ok) {
            const errorData = await res3.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to add ${formData.type}`);
          }
          break;

        default:
          throw new Error('Invalid item type');
      }
      
      await fetchInventory();
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to add item:', err);
      setError(err.message || `Failed to add ${formData.type}`);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let payload = { ...formData };

      switch (selectedItem.type) {
        case 'material':
          endpoint = `/api/materials/${selectedItem.id}`;
          break;
        case 'product':
          endpoint = `/api/products/${selectedItem.id}`;
          // Prepare product payload
          payload = {
            name: formData.name,
            code: formData.code,
            materialId: formData.materialId || null,
            category: formData.category || null,
            price: formData.price ? parseFloat(formData.price) : null,
            qtyOnHand: formData.qtyOnHand || 0,
            unit: formData.unit || 'pcs',
            description: formData.description
          };
          break;
        case 'other':
          endpoint = `/api/inventaris/${selectedItem.id}`;
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update ${selectedItem.type}`);
      }
      
      await fetchInventory();
      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
    } catch (err) {
      console.error('Failed to update item:', err);
      setError(err.message || `Failed to update ${selectedItem.type}`);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Are you sure you want to delete this ${item.type}?`)) return;

    try {
      const token = localStorage.getItem('token');
      let endpoint = '';

      switch (item.type) {
        case 'material':
          endpoint = `/api/materials/${item.id}`;
          break;
        case 'product':
          endpoint = `/api/products/${item.id}`;
          break;
        case 'other':
          endpoint = `/api/inventaris/${item.id}`;
          break;
        default:
          throw new Error('Invalid item type');
      }

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`Failed to delete ${item.type}`);
      await fetchInventory();
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError(`Failed to delete ${item.type}`);
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || item.itemName || '',
      code: item.code || '',
      qtyOnHand: item.qtyOnHand || item.qty || 0,
      unit: item.unit || 'pcs',
      safetyStock: item.safetyStock || 0,
      description: item.description || '',
      type: item.type,
      category: item.category || '',
      materialId: item.materialId || '',
      price: item.price || '',
      defaultTarget: item.defaultTarget || 0,
      isActive: item.isActive || true
    });
    
    // Load existing photos for products
    if (item.type === 'product' && item.photos) {
      const existingPhotos = item.photos.map(photo => ({
        id: photo.id,
        photoUrl: photo.photoUrl,
        thumbnailUrl: photo.thumbnailUrl,
        isMain: photo.isMainPhoto,
        sortOrder: photo.sortOrder,
        originalFileName: photo.originalFileName,
        isNew: false // Existing photo
      }));
      setEditPhotos(existingPhotos);
    } else {
      setEditPhotos([]);
    }
    
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      qtyOnHand: 0,
      unit: 'pcs',
      safetyStock: 0,
      description: '',
      type: activeTab === 'other' ? 'other' : activeTab.slice(0, -1),
      category: '',
      materialId: '',
      price: '',
      defaultTarget: 0,
      isActive: true
    });
    setPhotos([]);
    setEditPhotos([]);
  };

  // Photo handling functions
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    if (photos.length + validFiles.length > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }

    const newPhotos = validFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      isMain: photos.length === 0 && index === 0 // First photo is main by default
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (id) => {
    const photoToRemove = photos.find(photo => photo.id === id);
    if (photoToRemove?.preview) {
      URL.revokeObjectURL(photoToRemove.preview);
    }
    setPhotos(prev => {
      const newPhotos = prev.filter(photo => photo.id !== id);
      // If removed photo was main, set first remaining as main
      if (photoToRemove?.isMain && newPhotos.length > 0) {
        newPhotos[0].isMain = true;
      }
      return newPhotos;
    });
  };

  const setMainPhoto = (id) => {
    setPhotos(prev => prev.map(photo => ({
      ...photo,
      isMain: photo.id === id
    })));
  };

  // Edit modal photo handling functions
  const handleEditDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setEditDragActive(true);
    } else if (e.type === "dragleave") {
      setEditDragActive(false);
    }
  };

  const handleEditDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleEditFiles(e.dataTransfer.files);
    }
  };

  const handleEditFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleEditFiles(e.target.files);
    }
  };

  const handleEditFiles = (files) => {
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    if (editPhotos.length + validFiles.length > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }

    const newPhotos = validFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      isMain: editPhotos.length === 0 && index === 0,
      isNew: true // Flag to identify new photos
    }));

    setEditPhotos(prev => [...prev, ...newPhotos]);
  };

  const removeEditPhoto = (id) => {
    const photoToRemove = editPhotos.find(photo => photo.id === id);
    if (photoToRemove?.preview && photoToRemove.isNew) {
      URL.revokeObjectURL(photoToRemove.preview);
    }
    setEditPhotos(prev => {
      const newPhotos = prev.filter(photo => photo.id !== id);
      // If removed photo was main, set first remaining as main
      if (photoToRemove?.isMain && newPhotos.length > 0) {
        newPhotos[0].isMain = true;
      }
      return newPhotos;
    });
  };

  const setEditMainPhoto = (id) => {
    setEditPhotos(prev => prev.map(photo => ({
      ...photo,
      isMain: photo.id === id
    })));
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

  if (!user) return null;

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <button
              onClick={() => {
                setFormData({ ...formData, type: activeTab === 'other' ? 'other' : activeTab.slice(0, -1) });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add {activeTab === 'other' ? 'Item' : activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}</span>
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {activeTab === 'products' ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        {activeTab === 'materials' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety Stock</th>
                        )}
                        {activeTab === 'other' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentItems().map((item) => (
                    <tr key={item.id}>
                      {activeTab === 'products' ? (
                        <>
                          {/* Photo Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-16 w-16 flex-shrink-0">
                              {item.photos && item.photos.length > 0 ? (
                                <img
                                  className="h-16 w-16 rounded-lg object-cover"
                                  src={item.photos.find(p => p.isMainPhoto)?.thumbnailUrl || item.photos[0]?.thumbnailUrl}
                                  alt={item.name}
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTI2IDI4QzI3LjEwNDYgMjggMjggMjcuMTA0NiAyOCAyNkMyOCAyNC44OTU0IDI3LjEwNDYgMjQgMjYgMjRDMjQuODk1NCAyNCAyNCAyNC44OTU0IDI0IDI2QzI0IDI3LjEwNDYgMjQuODk1NCAyOCAyNiAyOFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI2IDMwTDMwIDM0TDM4IDI2TDQ0IDMyVjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                  }}
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Name Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.code}</div>
                            {item.category && (
                              <div className="text-xs text-gray-400">{item.category}</div>
                            )}
                          </td>
                          {/* Price Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.price ? `IDR ${parseFloat(item.price).toLocaleString()}` : '-'}
                          </td>
                          {/* Stock Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.qtyOnHand || 0} {item.unit}</div>
                            {item.Material && (
                              <div className="text-xs text-gray-500">Material: {item.Material.name}</div>
                            )}
                          </td>
                          {/* Actions Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openEditModal(item)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name || item.itemName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.code || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.qtyOnHand || item.qty || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                          {activeTab === 'materials' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.safetyStock || 0}
                            </td>
                          )}
                          {activeTab === 'other' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.category || '-'}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
                      <label className="block text-sm font-medium text-gray-700">Name</label>
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
                        <label className="block text-sm font-medium text-gray-700">Code</label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    
                    {/* Product-specific fields */}
                    {formData.type === 'product' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Base Material</label>
                          <select
                            value={formData.materialId}
                            onChange={(e) => setFormData({...formData, materialId: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select Material (Optional)</option>
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name} ({material.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Category</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select Category</option>
                            <option value="Hijab">Hijab</option>
                            <option value="Dress">Dress</option>
                            <option value="Pants">Pants</option>
                            <option value="Skirt">Skirt</option>
                            <option value="Blouse">Blouse</option>
                            <option value="Abaya">Abaya</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Price (IDR)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <input
                        type="number"
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
                          value={formData.safetyStock}
                          onChange={(e) => setFormData({...formData, safetyStock: parseFloat(e.target.value)})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    {formData.type === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
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

                    {/* Photo Upload Section for Products */}
                    {formData.type === 'product' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Photos</label>
                        
                        {/* Upload Area */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                            dragActive 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="photo-upload"
                          />
                          <label htmlFor="photo-upload" className="cursor-pointer">
                            <div className="text-gray-600">
                              <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <p className="mt-1 text-sm">
                                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB (Max 10 photos)</p>
                            </div>
                          </label>
                        </div>

                        {/* Photo Preview */}
                        {photos.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Photos Preview</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {photos.map((photo) => (
                                <div key={photo.id} className="relative group">
                                  <div className={`relative rounded-lg overflow-hidden ${photo.isMain ? 'ring-2 ring-blue-500' : ''}`}>
                                    <img
                                      src={photo.preview}
                                      alt={photo.name}
                                      className="w-full h-20 object-cover"
                                    />
                                    {photo.isMain && (
                                      <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                                        Main
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                                      <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                                        {!photo.isMain && (
                                          <button
                                            type="button"
                                            onClick={() => setMainPhoto(photo.id)}
                                            className="bg-white text-gray-900 px-1 py-0.5 rounded text-xs hover:bg-gray-100"
                                          >
                                            Set Main
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => removePhoto(photo.id)}
                                          className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="mt-1 text-xs text-gray-500 truncate">{photo.name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
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

          {/* Edit Item Modal */}
          {showEditModal && selectedItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                  Edit {selectedItem.type === 'other' ? 'Item' : selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
                </h2>
                <form onSubmit={handleEditItem}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    {selectedItem.type !== 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Code</label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    
                    {/* Product-specific fields */}
                    {selectedItem.type === 'product' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Base Material</label>
                          <select
                            value={formData.materialId}
                            onChange={(e) => setFormData({...formData, materialId: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select Material (Optional)</option>
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name} ({material.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Category</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select Category</option>
                            <option value="Hijab">Hijab</option>
                            <option value="Dress">Dress</option>
                            <option value="Pants">Pants</option>
                            <option value="Skirt">Skirt</option>
                            <option value="Blouse">Blouse</option>
                            <option value="Abaya">Abaya</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Price (IDR)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <input
                        type="number"
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
                    {selectedItem.type === 'material' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Safety Stock</label>
                        <input
                          type="number"
                          value={formData.safetyStock}
                          onChange={(e) => setFormData({...formData, safetyStock: parseFloat(e.target.value)})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    {selectedItem.type === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
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

                    {/* Photo Upload Section for Products */}
                    {selectedItem.type === 'product' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Photos</label>
                        
                        {/* Upload Area */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                            editDragActive 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDragEnter={handleEditDrag}
                          onDragLeave={handleEditDrag}
                          onDragOver={handleEditDrag}
                          onDrop={handleEditDrop}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleEditFileSelect}
                            className="hidden"
                            id="edit-photo-upload"
                          />
                          <label htmlFor="edit-photo-upload" className="cursor-pointer">
                            <div className="text-gray-600">
                              <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <p className="mt-1 text-sm">
                                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB (Max 10 photos)</p>
                            </div>
                          </label>
                        </div>

                        {/* Photo Preview */}
                        {editPhotos.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Photos Preview</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {editPhotos.map((photo) => (
                                <div key={photo.id} className="relative group">
                                  <div className={`relative rounded-lg overflow-hidden ${photo.isMain ? 'ring-2 ring-blue-500' : ''}`}>
                                    <img
                                      src={photo.isNew ? photo.preview : `http://localhost:8080${photo.thumbnailUrl}`}
                                      alt={photo.originalFileName || photo.name}
                                      className="w-full h-20 object-cover"
                                    />
                                    {photo.isMain && (
                                      <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                                        Main
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                                      <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                                        {!photo.isMain && (
                                          <button
                                            type="button"
                                            onClick={() => setEditMainPhoto(photo.id)}
                                            className="bg-white text-gray-900 px-1 py-0.5 rounded text-xs hover:bg-gray-100"
                                          >
                                            Set Main
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => removeEditPhoto(photo.id)}
                                          className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="mt-1 text-xs text-gray-500 truncate">{photo.originalFileName || photo.name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedItem(null);
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
                      Update {selectedItem.type === 'other' ? 'Item' : selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
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