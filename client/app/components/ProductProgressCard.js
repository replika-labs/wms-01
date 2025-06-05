'use client';

import { useState, useRef } from 'react';

export default function ProductProgressCard({ 
  product, 
  orderProduct, 
  productProgress, 
  onProgressChange,
  onPhotoUpload,
  isSubmitting = false,
  errors = {}
}) {
  const [localProgress, setLocalProgress] = useState({
    pcsFinished: productProgress?.pcsFinished || 0,
    fabricUsed: productProgress?.fabricUsed || 0,
    workHours: productProgress?.workHours || 0,
    qualityScore: productProgress?.qualityScore || 100,
    qualityNotes: productProgress?.qualityNotes || '',
    challenges: productProgress?.challenges || '',
    estimatedCompletion: productProgress?.estimatedCompletion || '',
    photos: productProgress?.photos || []
  });

  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Handle input changes
  const handleInputChange = (field, value) => {
    const updatedProgress = {
      ...localProgress,
      [field]: value
    };
    setLocalProgress(updatedProgress);
    
    // Notify parent component
    onProgressChange(product.id, orderProduct.id, updatedProgress);
  };

  // Handle photo upload
  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    const newPhotos = [];

    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      const photoData = {
        id: Date.now() + i,
        file: file,
        url: previewUrl,
        caption: '',
        type: 'progress',
        isNew: true
      };

      newPhotos.push(photoData);
    }

    const updatedPhotos = [...localProgress.photos, ...newPhotos];
    const updatedProgress = {
      ...localProgress,
      photos: updatedPhotos
    };

    setLocalProgress(updatedProgress);
    onProgressChange(product.id, orderProduct.id, updatedProgress);
    
    if (onPhotoUpload) {
      onPhotoUpload(product.id, newPhotos);
    }

    setUploadingPhotos(false);
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    handlePhotoUpload(Array.from(e.target.files));
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handlePhotoUpload(files);
  };

  // Remove photo
  const removePhoto = (photoIndex) => {
    const updatedPhotos = localProgress.photos.filter((_, index) => index !== photoIndex);
    const updatedProgress = {
      ...localProgress,
      photos: updatedPhotos
    };
    setLocalProgress(updatedProgress);
    onProgressChange(product.id, orderProduct.id, updatedProgress);
  };

  // Calculate suggested fabric usage
  const calculateSuggestedFabric = () => {
    if (!localProgress.pcsFinished || localProgress.pcsFinished <= 0) return 0;
    // Default estimation: 0.5 units per piece, can be customized per product
    return (localProgress.pcsFinished * 0.5).toFixed(2);
  };

  // Get quality grade
  const getQualityGrade = (score) => {
    if (score >= 95) return { grade: 'A+', color: 'text-green-600' };
    if (score >= 90) return { grade: 'A', color: 'text-green-600' };
    if (score >= 85) return { grade: 'B+', color: 'text-blue-600' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (score >= 75) return { grade: 'C+', color: 'text-yellow-600' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-600' };
    return { grade: 'D', color: 'text-red-600' };
  };

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (!orderProduct.qty || orderProduct.qty === 0) return 0;
    return Math.round((localProgress.pcsFinished / orderProduct.qty) * 100);
  };

  const qualityGrade = getQualityGrade(localProgress.qualityScore);
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Product Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
          <p className="text-sm text-gray-500">
            Target: {orderProduct.qty} pieces | Material: {product.Material?.name || 'No material'}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${qualityGrade.color}`}>
            {qualityGrade.grade}
          </div>
          <div className="text-xs text-gray-500">Quality Grade</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              completionPercentage >= 100 ? 'bg-green-500' :
              completionPercentage >= 75 ? 'bg-blue-500' :
              completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(completionPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pieces Completed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pieces Completed *
          </label>
          <input
            type="number"
            min="0"
            max={orderProduct.qty}
            value={localProgress.pcsFinished}
            onChange={(e) => handleInputChange('pcsFinished', parseInt(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors[`product_${product.id}_pcs`] ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
            placeholder="0"
          />
          {errors[`product_${product.id}_pcs`] && (
            <p className="text-xs text-red-600 mt-1">{errors[`product_${product.id}_pcs`]}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Max: {orderProduct.qty} pieces
          </p>
        </div>

        {/* Fabric Used */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fabric Used
            {product.Material && (
              <span className="text-xs text-gray-500 ml-1">({product.Material.unit})</span>
            )}
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              min="0"
              value={localProgress.fabricUsed}
              onChange={(e) => handleInputChange('fabricUsed', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={() => handleInputChange('fabricUsed', parseFloat(calculateSuggestedFabric()))}
              className="px-3 py-2 bg-blue-100 text-blue-600 text-xs rounded-r-md hover:bg-blue-200 transition-colors"
              disabled={isSubmitting || !localProgress.pcsFinished}
            >
              Auto
            </button>
          </div>
          {localProgress.pcsFinished > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              💡 Suggested: {calculateSuggestedFabric()} {product.Material?.unit || 'units'}
            </p>
          )}
        </div>

        {/* Work Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Hours
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={localProgress.workHours}
            onChange={(e) => handleInputChange('workHours', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
            placeholder="0.0"
          />
        </div>

        {/* Quality Score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quality Score (0-100)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="100"
              value={localProgress.qualityScore}
              onChange={(e) => handleInputChange('qualityScore', parseInt(e.target.value))}
              className="flex-1"
              disabled={isSubmitting}
            />
            <span className={`text-sm font-medium ${qualityGrade.color} min-w-[3rem]`}>
              {localProgress.qualityScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Quality Notes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quality Notes
        </label>
        <textarea
          rows="2"
          value={localProgress.qualityNotes}
          onChange={(e) => handleInputChange('qualityNotes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          placeholder="Any quality observations or notes..."
        />
      </div>

      {/* Challenges */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Challenges (Optional)
        </label>
        <textarea
          rows="2"
          value={localProgress.challenges}
          onChange={(e) => handleInputChange('challenges', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          placeholder="Any challenges faced during production..."
        />
      </div>

      {/* Photo Upload Section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Progress Photos ({localProgress.photos.length}/5)
        </label>
        
        {/* Photo Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isSubmitting || uploadingPhotos || localProgress.photos.length >= 5}
          />
          
          {uploadingPhotos ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Uploading...</span>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="mt-1 text-sm text-gray-600">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isSubmitting || localProgress.photos.length >= 5}
                >
                  Click to upload
                </button>
                {' '}or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
            </div>
          )}
        </div>

        {/* Photo Previews */}
        {localProgress.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            {localProgress.photos.map((photo, index) => (
              <div key={photo.id || index} className="relative group">
                <img
                  src={photo.url}
                  alt={`Progress ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isSubmitting}
                >
                  ×
                </button>
                <input
                  type="text"
                  value={photo.caption || ''}
                  onChange={(e) => {
                    const updatedPhotos = [...localProgress.photos];
                    updatedPhotos[index] = { ...photo, caption: e.target.value };
                    handleInputChange('photos', updatedPhotos);
                  }}
                  placeholder="Photo caption"
                  className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {localProgress.pcsFinished > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Efficiency</div>
              <div className="font-medium">
                {localProgress.workHours > 0 
                  ? `${(localProgress.pcsFinished / localProgress.workHours).toFixed(1)} pcs/hr`
                  : 'N/A'
                }
              </div>
            </div>
            <div>
              <div className="text-gray-500">Fabric/Piece</div>
              <div className="font-medium">
                {localProgress.pcsFinished > 0 && localProgress.fabricUsed > 0
                  ? `${(localProgress.fabricUsed / localProgress.pcsFinished).toFixed(2)} ${product.Material?.unit || 'units'}`
                  : 'N/A'
                }
              </div>
            </div>
            <div>
              <div className="text-gray-500">Quality</div>
              <div className={`font-medium ${qualityGrade.color}`}>{qualityGrade.grade}</div>
            </div>
            <div>
              <div className="text-gray-500">Photos</div>
              <div className="font-medium">{localProgress.photos.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 