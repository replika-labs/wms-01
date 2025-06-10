'use client';

import { useState, useRef } from 'react';

export default function ProductProgressCard({
  product,
  orderProduct,
  productProgress,
  onProgressChange,
  onPhotoUpload,
  isSubmitting = false,
  errors = {},
  completion = null // Pass existing completion data
}) {
  // Calculate existing progress and remaining work
  const alreadyCompleted = completion?.completed || orderProduct.completedQty || 0;
  const totalTarget = completion?.target || orderProduct.quantity || 0;
  const remainingToComplete = Math.max(0, totalTarget - alreadyCompleted);
  const currentSessionMax = remainingToComplete; // Max pieces that can be completed in this session

  const [localProgress, setLocalProgress] = useState({
    pcsFinished: productProgress?.pcsFinished || 0,
    materialUsed: productProgress?.materialUsed || 0,
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

  // Calculate suggested material usage
  const calculateSuggestedMaterial = () => {
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

  // Calculate completion percentage (cumulative)
  const getCompletionPercentage = () => {
    if (!totalTarget || totalTarget === 0) return 0;
    const cumulativeCompleted = alreadyCompleted + localProgress.pcsFinished;
    return Math.round((cumulativeCompleted / totalTarget) * 100);
  };

  // Calculate current session percentage
  const getCurrentSessionPercentage = () => {
    if (!totalTarget || totalTarget === 0) return 0;
    return Math.round((localProgress.pcsFinished / totalTarget) * 100);
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
            Target: {totalTarget} pieces | Material: {product.baseMaterial?.name || 'No material linked'}
          </p>
          {alreadyCompleted > 0 && (
            <p className="text-sm text-blue-600 font-medium">
              ✅ Already completed: {alreadyCompleted} pieces | Remaining: {remainingToComplete} pieces
            </p>
          )}
          {remainingToComplete === 0 && (
            <p className="text-sm text-green-600 font-bold">
              🎉 This product is fully completed!
            </p>
          )}
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
          <span className="text-sm text-gray-600">Overall Progress</span>
          <span className="text-sm font-medium">
            {completionPercentage}% ({alreadyCompleted + localProgress.pcsFinished}/{totalTarget})
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 relative">
          {/* Already completed progress */}
          <div
            className="h-3 rounded-l-full bg-green-400 absolute left-0"
            style={{ width: `${Math.min((alreadyCompleted / totalTarget) * 100, 100)}%` }}
          />
          {/* Current session progress */}
          <div
            className="h-3 bg-blue-500 absolute"
            style={{
              left: `${Math.min((alreadyCompleted / totalTarget) * 100, 100)}%`,
              width: `${Math.min(getCurrentSessionPercentage(), 100 - (alreadyCompleted / totalTarget) * 100)}%`
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Previous: {alreadyCompleted}</span>
          <span>This session: +{localProgress.pcsFinished}</span>
          <span>Remaining: {remainingToComplete - localProgress.pcsFinished}</span>
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pieces Completed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pieces to Complete This Session *
            {alreadyCompleted > 0 && (
              <span className="text-xs text-blue-600 ml-1">(Additional to {alreadyCompleted} already done)</span>
            )}
          </label>
          <input
            type="number"
            min="0"
            max={currentSessionMax}
            value={localProgress.pcsFinished}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              // Ensure the value doesn't exceed remaining capacity
              const validValue = Math.min(value, currentSessionMax);
              handleInputChange('pcsFinished', validValue);
            }}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[`product_${product.id}_pcs`] ? 'border-red-300' : 'border-gray-300'
              } ${remainingToComplete === 0 ? 'bg-gray-100' : ''}`}
            disabled={isSubmitting || remainingToComplete === 0}
            placeholder={remainingToComplete === 0 ? "Fully completed" : "0"}
          />
          {errors[`product_${product.id}_pcs`] && (
            <p className="text-xs text-red-600 mt-1">{errors[`product_${product.id}_pcs`]}</p>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {remainingToComplete > 0 ? (
              <>
                <p>Max this session: {currentSessionMax} pieces</p>
                <p>Will complete: {alreadyCompleted + localProgress.pcsFinished}/{totalTarget} total</p>
              </>
            ) : (
              <p className="text-green-600">✅ This product is fully completed</p>
            )}
          </div>
        </div>

        {/* Material Used */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material Used
            {product.baseMaterial && (
              <span className="text-xs text-gray-500 ml-1">({product.baseMaterial.unit})</span>
            )}
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              min="0"
              value={localProgress.materialUsed}
              onChange={(e) => handleInputChange('materialUsed', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={() => handleInputChange('materialUsed', parseFloat(calculateSuggestedMaterial()))}
              className="px-3 py-2 bg-blue-100 text-blue-600 text-xs rounded-r-md hover:bg-blue-200 transition-colors"
              disabled={isSubmitting || !localProgress.pcsFinished}
            >
              Auto
            </button>
          </div>
          {localProgress.pcsFinished > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              💡 Suggested: {calculateSuggestedMaterial()} {product.baseMaterial?.unit || 'units'}
            </p>
          )}
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
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
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
      {(localProgress.pcsFinished > 0 || alreadyCompleted > 0) && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            {localProgress.pcsFinished > 0 ? 'Current Session Summary' : 'Product Status'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Total Progress</div>
              <div className="font-medium">
                {alreadyCompleted + localProgress.pcsFinished}/{totalTarget} ({completionPercentage}%)
              </div>
            </div>
            <div>
              <div className="text-gray-500">This Session</div>
              <div className="font-medium">
                +{localProgress.pcsFinished} pieces
              </div>
            </div>
            <div>
              <div className="text-gray-500">Material/Piece</div>
              <div className="font-medium">
                {localProgress.pcsFinished > 0 && localProgress.materialUsed > 0
                  ? `${(localProgress.materialUsed / localProgress.pcsFinished).toFixed(2)} ${product.baseMaterial?.unit || 'units'}`
                  : 'N/A'
                }
              </div>
            </div>
            <div>
              <div className="text-gray-500">Quality</div>
              <div className={`font-medium ${qualityGrade.color}`}>{qualityGrade.grade}</div>
            </div>
          </div>
          {remainingToComplete - localProgress.pcsFinished > 0 && (
            <div className="mt-2 text-xs text-blue-600">
              📋 Still need: {remainingToComplete - localProgress.pcsFinished} more pieces to complete this product
            </div>
          )}
          {(alreadyCompleted + localProgress.pcsFinished) >= totalTarget && (
            <div className="mt-2 text-xs text-green-600 font-medium">
              🎉 This will complete the entire product!
            </div>
          )}
        </div>
      )}
    </div>
  );
} 