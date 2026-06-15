"use client";

import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { UPLOAD_CONFIG } from "@/lib/constants";
import { ImageType } from "@prisma/client";

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  type: ImageType;
}

interface ScreenshotUploadProps {
  onFilesChange: (files: { file: File; type: ImageType }[]) => void;
}

export const ScreenshotUpload: React.FC<ScreenshotUploadProps> = ({
  onFilesChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFilesAdded = (filesList: FileList | null) => {
    if (!filesList) return;
    setError(null);

    const newFiles: UploadedFile[] = [];
    const currentCount = uploadedFiles.length;

    if (currentCount + filesList.length > UPLOAD_CONFIG.maxFilesPerTrade) {
      setError(`You can upload a maximum of ${UPLOAD_CONFIG.maxFilesPerTrade} images per trade.`);
      return;
    }

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];

      // Validate file size (10MB)
      if (file.size > UPLOAD_CONFIG.maxFileSize) {
        setError(`File "${file.name}" is too large. Max size is 10MB.`);
        continue;
      }

      // Validate MIME type
      if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type as any)) {
        setError(`File "${file.name}" has an invalid type. Only JPG, PNG, and WebP are allowed.`);
        continue;
      }

      // Assign type sequentially based on current uploads
      let defaultType: ImageType = ImageType.ENTRY;
      const index = currentCount + newFiles.length;
      if (index === 0) defaultType = ImageType.BEFORE_ENTRY;
      else if (index === 1) defaultType = ImageType.ENTRY;
      else if (index === 2) defaultType = ImageType.EXIT;

      newFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        type: defaultType,
      });
    }

    const updated = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updated);
    triggerChange(updated);
  };

  const removeFile = (id: string) => {
    const fileToRemove = uploadedFiles.find((f) => f.id === id);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    const updated = uploadedFiles.filter((f) => f.id !== id);
    setUploadedFiles(updated);
    triggerChange(updated);
  };

  const changeFileType = (id: string, type: ImageType) => {
    const updated = uploadedFiles.map((f) =>
      f.id === id ? { ...f, type } : f
    );
    setUploadedFiles(updated);
    triggerChange(updated);
  };

  const triggerChange = (files: UploadedFile[]) => {
    onFilesChange(files.map((f) => ({ file: f.file, type: f.type })));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFilesAdded(e.dataTransfer.files);
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Trade Screenshots (Max {UPLOAD_CONFIG.maxFilesPerTrade})
        </label>
        <span className="text-xs text-gray-500">
          JPG, PNG, WebP up to 10MB
        </span>
      </div>

      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={handleSelectFiles}
        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-lg p-6 bg-gray-950 hover:bg-gray-900/50 hover:border-gray-700 transition cursor-pointer text-center group"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFilesAdded(e.target.files)}
          multiple
          accept={UPLOAD_CONFIG.allowedMimeTypes.join(",")}
          className="hidden"
        />
        <Upload className="h-8 w-8 text-gray-500 group-hover:text-blue-500 transition mb-3" />
        <p className="text-sm text-gray-300 font-medium">
          Drag & drop your screenshots here, or{" "}
          <span className="text-blue-500 group-hover:underline">browse</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports Before Entry, Entry, and Exit charts
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-500 font-medium bg-red-950/20 border border-red-900/50 rounded-md p-3">
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {uploadedFiles.map((uploaded) => (
            <div
              key={uploaded.id}
              className="relative border border-gray-800 bg-gray-950 rounded-md p-2 flex flex-col space-y-2"
            >
              <div className="relative aspect-video w-full rounded overflow-hidden bg-gray-900 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploaded.previewUrl}
                  alt={uploaded.file.name}
                  className="object-cover w-full h-full"
                />
                <button
                  type="button"
                  onClick={() => removeFile(uploaded.id)}
                  className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 truncate font-mono">
                  {uploaded.file.name}
                </p>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-gray-500 font-medium shrink-0">
                    Type:
                  </span>
                  <select
                    value={uploaded.type}
                    onChange={(e) =>
                      changeFileType(uploaded.id, e.target.value as ImageType)
                    }
                    className="w-full text-xs bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5 text-gray-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value={ImageType.BEFORE_ENTRY}>Before Entry</option>
                    <option value={ImageType.ENTRY}>Entry</option>
                    <option value={ImageType.EXIT}>Exit</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
