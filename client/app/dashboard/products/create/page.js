'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '../../../components/AuthWrapper';
import DashboardLayout from '../../../components/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';

export default function CreateProductPage() {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    materialId: '',
    category: '',
    price: '',
    qtyOnHand: 0,
    unit: 'pcs',
    description: '',
    defaultTarget: 0,
    isActive: true
  });

  // Photo upload states
  const [photos, setPhotos] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);

  // Validation state
  const [errors, setErrors] = useState({});

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

  // Fetch materials for dropdown
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8080/api/materials', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMaterials(data);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };

    if (user) {
      fetchMaterials();
    }
  }, [user]);

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

  // Handle drag and drop
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

    if (photos.length + validFiles.length > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }

    const newPhotos = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => {
      const filtered = prev.filter(photo => photo.id !== photoId);
      if (mainPhotoIndex >= filtered.length) {
        setMainPhotoIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const setMainPhoto = (index) => {
    setMainPhotoIndex(index);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Product code is required';
    }

    if (!formData.category.trim()) {
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

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();

      // Add form data
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      // Add photos
      photos.forEach((photo, index) => {
        submitData.append('photos', photo.file);
        if (index === mainPhotoIndex) {
          submitData.append('mainPhotoIndex', index.toString());
        }
      });

      const response = await fetch('http://localhost:8080/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }

      const result = await response.json();
      setSuccess('Product created successfully!');
      
      // Redirect to products list after a short delay
      setTimeout(() => {
        router.push('/dashboard/products');
      }, 2000);

    } catch (error) {
      console.error('Error creating product:', error);
      setError(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
              <p className="text-gray-600">Add a new product to your catalog</p>
            </div>
            <Link
              href="/dashboard/products"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              ← Back to Products
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.code ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter product code"
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Hijab, Dress, Pants"
                  />
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-300' : 'border-gray-300'
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.qtyOnHand ? 'border-red-300' : 'border-gray-300'
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Target
                    </label>
                    <input
                      type="number"
                      name="defaultTarget"
                      value={formData.defaultTarget}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

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

            {/* Photo Upload */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Photos</h2>
              
              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
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
                  Maximum 10 photos, 5MB each. Supported: JPG, PNG, GIF
                </p>
              </div>

              {/* Photo Preview */}
              {photos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">
                    Uploaded Photos ({photos.length}/10)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className={`relative bg-gray-100 rounded-lg overflow-hidden aspect-square ${
                          index === mainPhotoIndex ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <Image
                          src={photo.preview}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                          unoptimized
                        />
                        <div className="absolute top-1 right-1 flex space-x-1">
                          {index === mainPhotoIndex && (
                            <span className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                              Main
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/dashboard/products"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 