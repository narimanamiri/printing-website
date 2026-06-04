'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileCheck, AlertCircle, Loader } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface UploadResponse {
  success: boolean;
  orderId: string;
  filename: string;
  weight: number;
  cost: number;
  volume: number;
}

interface UploadProps {
  onSuccess?: (data: UploadResponse) => void;
}

export function STLUploader({ onSuccess }: UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setError('Please upload an STL file');
      return;
    }

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('email', email);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = (await response.json()) as UploadResponse;
      onSuccess?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <Loader className="w-12 h-12 text-blue-500 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 text-blue-500" />
          )}

          <div>
            <p className="text-lg font-semibold text-gray-900">
              {isLoading ? 'Processing your file...' : 'Drop your STL file here'}
            </p>
            <p className="text-sm text-gray-600">
              or click to select from your computer
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

interface EstimateCardProps {
  weight: number;
  cost: number;
  volume: number;
}

export function EstimateCard({ weight, cost, volume }: EstimateCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-green-600" />
        Price Estimate
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Estimated Weight:</span>
          <span className="font-semibold text-gray-900">{weight.toFixed(1)}g</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Volume:</span>
          <span className="font-semibold text-gray-900">{(volume / 1000).toFixed(2)}cm³</span>
        </div>
        <div className="h-px bg-gradient-to-r from-blue-200 to-transparent" />
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total Cost:</span>
          <span className="text-2xl font-bold text-blue-600">{formatPrice(cost)}</span>
        </div>
      </div>
    </div>
  );
}
