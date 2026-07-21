import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, FileVideo, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  acceptType?: 'image' | 'video' | 'any';
  maxSizeMB?: number;
  label?: string;
}

export default function FileUpload({ 
  onUploadSuccess, 
  acceptType = 'any', 
  maxSizeMB = 50, 
  label 
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedExtensions = () => {
    if (acceptType === 'image') return '.jpg,.jpeg,.png,.gif,.webp,.svg';
    if (acceptType === 'video') return '.mp4,.mpeg,.ogg,.webm,.mov,.avi';
    return '.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mpeg,.ogg,.webm,.mov,.avi';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    setSuccess(null);

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    // Validate type
    if (acceptType === 'image' && !file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP, etc.)');
      return;
    }
    if (acceptType === 'video' && !file.type.startsWith('video/')) {
      setError('Please upload a video file (MP4, WebM, etc.)');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await response.json();
      if (data.success && data.url) {
        setSuccess('File uploaded successfully!');
        onUploadSuccess(data.url);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase block">
          {label}
        </label>
      )}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative w-full border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
            : 'border-slate-200 bg-slate-50/30 hover:border-indigo-400 hover:bg-slate-50/70'
        } ${uploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={getAcceptedExtensions()}
          onChange={handleChange}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-indigo-600">Uploading and processing file...</p>
              <p className="text-[10px] text-slate-400">Please do not close this window</p>
            </>
          ) : (
            <>
              <div className="p-2.5 bg-slate-100 rounded-full text-slate-500 group-hover:scale-110 transition-transform">
                {acceptType === 'image' ? (
                  <ImageIcon className="h-6 w-6 text-slate-500" />
                ) : acceptType === 'video' ? (
                  <FileVideo className="h-6 w-6 text-slate-500" />
                ) : (
                  <UploadCloud className="h-6 w-6 text-slate-500" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">
                  Drag & Drop file here, or <span className="text-indigo-600 underline">browse</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Supports {acceptType === 'any' ? 'Images & Videos' : acceptType === 'image' ? 'Images (JPEG, PNG, WebP)' : 'Videos (MP4, WebM)'} up to {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload Feedback */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-[10.5px] font-bold text-rose-700">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[10.5px] font-bold text-emerald-800">
          <CheckCircle className="h-4 w-4 text-emerald-650 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
