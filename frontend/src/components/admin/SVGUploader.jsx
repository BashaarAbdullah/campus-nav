// frontend/src/components/admin/SVGUploader.jsx
// Drag-and-drop or file input for uploading SVG files – validates file type and size

import React, { useState, useRef, useCallback } from 'react';

const SVGUploader = ({ onUpload, label = 'Upload SVG', accept = '.svg', maxSize = 5 * 1024 * 1024 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    setError(null);
    setLoading(true);

    // Validate file type
    const validTypes = ['image/svg+xml', 'text/xml', 'application/xml'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(file.type) && ext !== 'svg') {
      setError('Please upload a valid SVG file.');
      setLoading(false);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size exceeds ${maxSize / 1024 / 1024}MB limit.`);
      setLoading(false);
      return;
    }

    try {
      // Read file as text
      const svgText = await file.text();
      // Verify it's valid SVG (basic check)
      if (!svgText.trim().startsWith('<svg') && !svgText.includes('<svg')) {
        setError('The file does not appear to be a valid SVG.');
        setLoading(false);
        return;
      }

      setFile(file);
      setPreview(svgText);
      // Call onUpload with the SVG data and the file name
      if (onUpload) {
        await onUpload(svgText, file.name);
      }
    } catch (err) {
      setError('Failed to read file. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onUpload, maxSize]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={loading}
        />
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600">
            {loading ? 'Processing...' : preview ? 'File loaded' : label}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {file ? file.name : 'Drag & drop or click to browse'}
          </p>
          {file && (
            <p className="text-xs text-gray-400">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 text-red-600 text-sm">{error}</div>
      )}

      {preview && !error && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Preview:</span>
            <button
              onClick={handleReset}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
          <div className="border rounded p-2 bg-gray-50 max-h-48 overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SVGUploader;