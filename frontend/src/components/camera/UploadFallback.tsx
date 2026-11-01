import React, { useCallback, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { validateFileType, validateFileSizeByName } from '../../utils/imageValidation';
import type { CapturedPhoto } from '../../hooks/useCamera';
import { BUSINESS } from '../../config/business';

interface UploadFallbackProps {
  photos: CapturedPhoto[];
  onPhotosAdded: (photos: CapturedPhoto[]) => void;
  onRemove: (id: string) => void;
}

/**
 * UploadFallback
 *
 * Used when:
 * - Camera permission is denied
 * - No camera is available (desktop)
 * - User prefers to upload existing photos
 *
 * Accepts JPEG, PNG, WebP. Multi-file. Drag-and-drop.
 * Reuses the same CapturedPhoto type and thumbnail display.
 */
export function UploadFallback({ photos, onPhotosAdded, onRemove }: UploadFallbackProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newErrors: string[] = [];
      const validPhotos: CapturedPhoto[] = [];

      const remaining = BUSINESS.limits.maxImagesPerJob - photos.length;
      const toProcess = fileArray.slice(0, remaining);

      if (fileArray.length > remaining) {
        newErrors.push(
          `Maximum ${BUSINESS.limits.maxImagesPerJob} photos allowed. ` +
          `${fileArray.length - remaining} file(s) were not added.`
        );
      }

      for (const file of toProcess) {
        const typeErr = validateFileType(file);
        if (typeErr) { newErrors.push(typeErr); continue; }

        const sizeErr = validateFileSizeByName(file);
        if (sizeErr) { newErrors.push(sizeErr); continue; }

        const thumbnailUrl = URL.createObjectURL(file);
        validPhotos.push({
          id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          blob: file,
          thumbnailUrl,
          capturedAt: new Date(),
        });
      }

      setErrors(newErrors);
      if (validPhotos.length > 0) {
        onPhotosAdded(validPhotos);
      }
    },
    [photos.length, onPhotosAdded]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void processFiles(e.target.files);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) void processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const count = photos.length;
  const min = BUSINESS.limits.minImagesRecommended;
  const max = BUSINESS.limits.maxImagesPerJob;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        aria-label="Upload photos: click or drag files here"
        className={`
          border-2 border-dashed rounded-lg p-10 text-center cursor-pointer
          transition-colors duration-150
          ${isDragging
            ? 'border-accent-400 bg-accent-50'
            : 'border-neutral-200 hover:border-neutral-400 bg-neutral-50'
          }
        `}
      >
        <Upload
          className="w-8 h-8 mx-auto mb-3 text-neutral-400"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-neutral-700">
          Click to select photos, or drag and drop
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          JPEG, PNG, WebP: up to 15 MB each
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* Count indicator */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          {count} / {max} photos added
          {count < min && ` (${min - count} more recommended for best results)`}
          {count >= min && count < max && ' (good coverage, add more angles if available)'}
          {count >= max && ' (maximum reached)'}
        </span>
        {count >= min && (
          <span className="badge-success">
            Minimum recommendation met
          </span>
        )}
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-100 p-3 space-y-1"
        >
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">{err}</p>
          ))}
        </div>
      )}

      {/* Thumbnail tray */}
      {photos.length > 0 && (
        <div
          className="grid grid-cols-4 sm:grid-cols-6 gap-2"
          role="list"
          aria-label="Uploaded photos"
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded overflow-hidden bg-neutral-100 group"
              role="listitem"
            >
              <img
                src={photo.thumbnailUrl}
                alt={`Uploaded photo captured at ${photo.capturedAt.toLocaleTimeString()}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onRemove(photo.id)}
                className="absolute top-1 right-1 w-5 h-5 bg-neutral-900/70 text-white rounded-full
                           flex items-center justify-center opacity-0 group-hover:opacity-100
                           focus-visible:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
