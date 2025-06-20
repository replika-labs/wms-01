'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthWrapper from '../../../../components/AuthWrapper';
import DashboardLayout from '../../../../components/DashboardLayout';
import Link from 'next/link';

export default function EditProductPage() {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableVariations, setAvailableVariations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    materialId: '',
    category: '',
    price: '',
    qtyOnHand: 0,
    unit: 'pcs',
    description: '',
    defaultTarget: 0,
    productColorId: '',
    productVariationId: '',
    isActive: true
  });

  // Photo states
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [photosToDelete, setPhotosToDelete] = useState([]);

  // Validation state
  const [errors, setErrors] = useState({});

  // Product code state (read-only)
  const [productCode, setProductCode] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
      return;
    }
  }, [router]);

  // Fetch product data and materials
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Fetch product data
        const productResponse = await fetch(`http://localhost:8080/api/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!productResponse.ok) {
          throw new Error('Failed to fetch product data');
        }

        const productResponse_data = await productResponse.json();
        const productData = productResponse_data.success && productResponse_data.product
          ? productResponse_data.product
          : productResponse_data;

        // Set form data
        setFormData({
          name: productData.name || '',
          materialId: productData.materialId || '',
          category: productData.category || '',
          price: productData.price || '',
          qtyOnHand: productData.qtyOnHand || 0,
          unit: productData.unit || 'pcs',
          description: productData.description || '',
          defaultTarget: productData.defaultTarget || 0,
          productColorId: productData.productColorId || '',
          productVariationId: productData.productVariationId || '',
          isActive: productData.isActive !== false
        });

        // Set product code (read-only)
        setProductCode(productData.code || '');

        // Set existing photos
        if (productData.photos) {
          setExistingPhotos(productData.photos);
          // Set main photo index
          const mainPhotoIdx = productData.photos.findIndex(photo => photo.isPrimary);
          setMainPhotoIndex(mainPhotoIdx >= 0 ? mainPhotoIdx : 0);
        }

        // Fetch materials
        const materialsResponse = await fetch('http://localhost:8080/api/materials-management?limit=100', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (materialsResponse.ok) {
          const materialsData = await materialsResponse.json();
          if (materialsData.success && materialsData.data?.materials) {
            setMaterials(materialsData.data.materials);
          } else {
            setMaterials(materialsData.materials || materialsData || []);
          }
        }

        // Fetch available colors
        const colorsResponse = await fetch('http://localhost:8080/api/products/colors', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (colorsResponse.ok) {
          const colorsData = await colorsResponse.json();
          if (colorsData.success) {
            setAvailableColors(colorsData.colors || []);
          }
        }

        // Fetch available variations
        const variationsResponse = await fetch('http://localhost:8080/api/products/variations', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (variationsResponse.ok) {
          const variationsData = await variationsResponse.json();
          if (variationsData.success) {
            setAvailableVariations(variationsData.variations || {});
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load product data');
      } finally {
        setLoading(false);
      }
    };

    if (user && productId) {
      fetchData();
    }
  }, [user, productId]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };



  // Handle drag and drop for new photos
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    const totalPhotos = existingPhotos.length + newPhotos.length + validFiles.length;
    if (totalPhotos > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }

    const photosToAdd = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
      isNew: true
    }));

    setNewPhotos(prev => [...prev, ...photosToAdd]);
  };

  // Remove existing photo
  const removeExistingPhoto = (photoId) => {
    setExistingPhotos(prev => prev.filter(photo => photo.id !== photoId));
    setPhotosToDelete(prev => [...prev, photoId]);

    // Adjust main photo index if needed
    const remainingPhotos = existingPhotos.filter(photo => photo.id !== photoId);
    if (mainPhotoIndex >= remainingPhotos.length + newPhotos.length) {
      setMainPhotoIndex(Math.max(0, remainingPhotos.length + newPhotos.length - 1));
    }
  };

  // Remove new photo
  const removeNewPhoto = (photoId) => {
    setNewPhotos(prev => prev.filter(photo => photo.id !== photoId));

    // Adjust main photo index if needed
    const totalPhotos = existingPhotos.length + newPhotos.filter(photo => photo.id !== photoId).length;
    if (mainPhotoIndex >= totalPhotos) {
      setMainPhotoIndex(Math.max(0, totalPhotos - 1));
    }
  };

  // Set main photo
  const setMainPhoto = (index, isExisting = true) => {
    setMainPhotoIndex(index);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.price && isNaN(Number(formData.price))) {
      newErrors.price = 'Price must be a valid number';
    }

    if (isNaN(Number(formData.qtyOnHand)) || Number(formData.qtyOnHand) < 0) {
      newErrors.qtyOnHand = 'Quantity must be a valid non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();

      // Add form data
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
          // For numeric fields, ensure they're sent as numbers
          if (key === 'qtyOnHand' || key === 'defaultTarget' || key === 'price') {
            const numValue = Number(formData[key]);
            if (!isNaN(numValue)) {
              submitData.append(key, numValue.toString());
            }
          } else {
            submitData.append(key, formData[key]);
          }
        }
      });



      // Debug: Log what's being sent
      console.log('Form data being sent for update:');
      for (let [key, value] of submitData.entries()) {
        console.log(key, value);
      }

      // Add new photos
      newPhotos.forEach((photo, index) => {
        submitData.append('photos', photo.file);
      });

      // Add photos to delete
      if (photosToDelete.length > 0) {
        submitData.append('photosToDelete', JSON.stringify(photosToDelete));
      }

      // Set main photo info
      const totalPhotos = existingPhotos.length + newPhotos.length;
      if (totalPhotos > 0) {
        if (mainPhotoIndex < existingPhotos.length) {
          // Main photo is an existing photo
          submitData.append('mainPhotoId', existingPhotos[mainPhotoIndex].id);
        } else {
          // Main photo is a new photo
          const newPhotoIndex = mainPhotoIndex - existingPhotos.length;
          submitData.append('mainPhotoIndex', newPhotoIndex.toString());
        }
      }

      const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      const result = await response.json();

      if (result.success) {
        setSuccess('Product updated successfully!');

        setTimeout(() => {
          router.push(`/dashboard/products`);
        }, 1000);
      } else {
        throw new Error(result.message || 'Failed to update product');
      }

    } catch (error) {
      console.error('Error updating product:', error);
      setError(error.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <AuthWrapper>
        <DashboardLayout user={user}>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  // Get all photos for display (existing + new)
  const allPhotos = [...existingPhotos, ...newPhotos];

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/dashboard/products/${productId}`}
                className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
              >
                ← Back to Product
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              <p className="text-gray-600">Update product information</p>
            </div>
            <Link
              href="/dashboard/products"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              All Products
            </Link>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="Enter product name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? 'border-red-300' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select category</option>
                    <option value="Hijab">Hijab</option>
                    <option value="Scrunchie">Scrunchie</option>
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Material
                  </label>
                  <select
                    name="materialId"
                    value={formData.materialId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select material (optional)</option>
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Code
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono">
                    {productCode || 'Loading...'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Product codes cannot be modified after creation
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing and Inventory */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Inventory</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (Rp)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.price ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="0"
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    name="qtyOnHand"
                    value={formData.qtyOnHand}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.qtyOnHand ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors.qtyOnHand && <p className="mt-1 text-sm text-red-600">{errors.qtyOnHand}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="meter">Meters</option>
                    <option value="yard">Yards</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Product is active
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Colors and Variations */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Color & Variation</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Color
                  </label>
                  <select
                    name="productColorId"
                    value={formData.productColorId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select color (optional)</option>
                    {availableColors.map(color => (
                      <option key={color.id} value={color.id}>
                        {color.colorName} ({color.colorCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variation Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Variation
                  </label>
                  <select
                    name="productVariationId"
                    value={formData.productVariationId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select variation (optional)</option>
                    {Object.keys(availableVariations).map(type => (
                      <optgroup key={type} label={type}>
                        {(availableVariations[type] || []).map(variation => (
                          <option key={variation.id} value={variation.id}>
                            {variation.variationValue}
                            {variation.priceAdjustment && ` (+Rp ${Number(variation.priceAdjustment).toLocaleString()})`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Photo Management */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Photos</h2>

              {/* Current Photos */}
              {allPhotos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">
                    Current Photos ({allPhotos.length}/10)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {allPhotos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className={`relative bg-gray-100 rounded-lg overflow-hidden aspect-square ${index === mainPhotoIndex ? 'ring-2 ring-blue-500' : ''
                          }`}
                      >
                        <img
                          src={photo.isNew ? photo.preview : `http://localhost:8080${photo.thumbnailPath || photo.photoPath}`}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 right-1 flex space-x-1">
                          {index === mainPhotoIndex && (
                            <span className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                              Main
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => photo.isNew ? removeNewPhoto(photo.id) : removeExistingPhoto(photo.id)}
                            className="bg-red-500 text-white text-xs px-1 py-0.5 rounded hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                        {index !== mainPhotoIndex && (
                          <button
                            type="button"
                            onClick={() => setMainPhoto(index)}
                            className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded hover:bg-opacity-70"
                          >
                            Set Main
                          </button>
                        )}
                        {photo.isNew && (
                          <div className="absolute bottom-1 right-1">
                            <span className="bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                              New
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Photos */}
              {allPhotos.length < 10 && (
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Add New Photos</h3>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                      }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="text-4xl mb-4">📷</div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drag and drop photos here, or
                    </p>
                    <label className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        click to browse
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                      Maximum 10 photos total, 5MB each. Supported: JPG, PNG, GIF
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href={`/dashboard/products/${productId}`}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 