import React, { useState } from 'react';
import { Upload, Image, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const ImageUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ text: 'Please select a valid image file', type: 'error' });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ text: 'File size must be less than 5MB', type: 'error' });
        return;
      }

      setSelectedFile(file);
      setMessage({ text: '', type: '' });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ text: 'Please select an image first', type: 'error' });
      return;
    }

    setUploading(true);
    setMessage({ text: '', type: '' });

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('http://localhost:8080/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          text: `Image uploaded successfully! URL: ${result.imageUrl}`, 
          type: 'success' 
        });
        // Reset form
        setSelectedFile(null);
        setPreview(null);
        document.getElementById('file-input').value = '';
      } else {
        setMessage({ 
          text: result.error || 'Upload failed', 
          type: 'error' 
        });
      }
    } catch (error) {
      setMessage({ 
        text: 'Network error. Please check if the backend server is running.', 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const event = { target: { files: [files[0]] } };
      handleFileSelect(event);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Image Upload to AWS S3
      </h1>

      {/* Upload Area */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg text-gray-600 mb-2">
          Drag and drop an image here, or click to select
        </p>
        <p className="text-sm text-gray-500">
          Supports: JPG, PNG, GIF (Max: 5MB)
        </p>
        
        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Preview:</h3>
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-w-full h-64 object-contain mx-auto rounded-lg shadow-md"
            />
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-600">
                File: {selectedFile?.name} ({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="mt-6 text-center">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
            !selectedFile || uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 active:transform active:scale-95'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center">
              <Loader className="animate-spin h-5 w-5 mr-2" />
              Uploading...
            </div>
          ) : (
            'Upload to S3'
          )}
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mt-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400' 
            : 'bg-red-100 border border-red-400'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            )}
            <p className={`${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Make sure your Ballerina backend is running on port 8080</li>
          <li>• Images will be uploaded to the ecogreen3600 S3 bucket</li>
          <li>• Supported formats: JPG, PNG, GIF</li>
          <li>• Maximum file size: 5MB</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;