import React, { useState, useRef } from 'react';
import { XMarkIcon, CameraIcon, PhotoIcon } from '@heroicons/react/24/outline';
import CameraCapture from './CameraCapture';

export default function PhotoSelectionModal({ isOpen, onClose, onPhotoSelect, currentPhotoUrl, playerName }) {
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);

  const handleCameraCapture = (photoBlob) => {
    setShowCamera(false);
    onPhotoSelect(photoBlob);
    onClose();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onPhotoSelect(file);
      onClose();
    } else if (file) {
      alert('Please select an image file (JPG, PNG, etc.)');
    }
  };

  if (!isOpen) return null;

  // If camera is open, show camera component
  if (showCamera) {
    return (
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 max-w-md w-full mx-4 overflow-hidden">
        
        {/* Header */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Update Photo
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Photo Display */}
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-2xl flex items-center justify-center shadow-lg">
              {currentPhotoUrl ? (
                <img 
                  src={currentPhotoUrl} 
                  alt={playerName}
                  className="w-32 h-32 rounded-2xl object-cover"
                />
              ) : (
                <span className="text-primary-600 dark:text-primary-400 font-bold text-4xl">
                  {playerName?.split(' ').map(n => n[0]).join('') || '?'}
                </span>
              )}
            </div>
          </div>

          {/* Player Name */}
          <div className="text-center mb-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              {playerName || 'Player'}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose how to update their photo
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowCamera(true)}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 rounded-xl hover:from-primary-700 hover:to-primary-800 flex items-center justify-center space-x-3 shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-[1.02]"
            >
              <CameraIcon className="w-6 h-6" />
              <span className="font-medium">Take Photo</span>
            </button>

            <button
              onClick={handleFileUpload}
              className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-300 dark:hover:border-primary-600 flex items-center justify-center space-x-3 transition-all duration-200"
            >
              <PhotoIcon className="w-6 h-6" />
              <span className="font-medium">Upload from Device</span>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}