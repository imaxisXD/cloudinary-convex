"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import React, { useState, useCallback, useRef } from "react";
import type {
  CloudinaryTransformation,
  UploadOptions,
  ListAssetsOptions,
  CloudinaryComponent,
  CloudinaryAsset,
} from "../client/index.js";

// Upload result type matching the backend response
export interface UploadResult {
  success: boolean;
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: string;
}

// Upload hook with progress tracking
export function useCloudinaryUpload(component: CloudinaryComponent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadAction = useAction((component.lib as any).upload);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = useCallback(
    async (file: File | string, options?: UploadOptions) => {
      try {
        setIsUploading(true);
        setProgress(0);
        setError(null);
        setResult(null);

        let base64Data: string;
        if (typeof file === "string") {
          base64Data = file;
        } else {
          // Simulate progress for file reading
          setProgress(20);
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              setProgress(50);
              resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        setProgress(75);
        const uploadResult = await uploadAction({
          base64Data,
          filename: typeof file !== "string" ? file.name : options?.filename,
          ...options,
        });

        if (uploadResult.success) {
          setProgress(100);
          setResult(uploadResult);
          return uploadResult;
        } else {
          throw new Error(uploadResult.error || "Upload failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadAction]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    result,
    reset,
  };
}

// Hook for generating transformed image URLs
export function useCloudinaryImage(
  component: CloudinaryComponent,
  publicId: string | null,
  transformation?: CloudinaryTransformation
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component lib requires dynamic typing
  const libTransform = (component.lib as any).transform;
  const transformedUrl = useQuery(
    libTransform,
    publicId && transformation ? { publicId, transformation } : "skip"
  );

  return {
    transformedUrl: transformedUrl?.transformedUrl,
    secureUrl: transformedUrl?.secureUrl,
    isLoading: transformedUrl === undefined,
  };
}

// Hook for listing assets
export function useCloudinaryAssets(
  component: CloudinaryComponent,
  options?: ListAssetsOptions
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component lib requires dynamic typing
  const libListAssets = (component.lib as any).listAssets;
  const assets = useQuery(libListAssets, options || {}) as CloudinaryAsset[] | undefined;

  return {
    assets: assets || [],
    isLoading: assets === undefined,
  };
}

// Hook for getting a single asset
export function useCloudinaryAsset(
  component: CloudinaryComponent,
  publicId: string | null
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component lib requires dynamic typing
  const libGetAsset = (component.lib as any).getAsset;
  const asset = useQuery(
    libGetAsset,
    publicId ? { publicId } : "skip"
  ) as CloudinaryAsset | null | undefined;

  return {
    asset,
    isLoading: asset === undefined,
  };
}

// Hook for asset operations (delete, update)
export function useCloudinaryOperations(component: CloudinaryComponent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteAction = useAction((component.lib as any).deleteAsset);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMutation = useMutation((component.lib as any).updateAsset);

  const deleteAsset = useCallback(
    async (publicId: string) => {
      return deleteAction({ publicId });
    },
    [deleteAction]
  );

  const updateAsset = useCallback(
    async (publicId: string, updates: { tags?: string[]; metadata?: Record<string, unknown> }) => {
      return updateMutation({ publicId, ...updates });
    },
    [updateMutation]
  );

  return {
    deleteAsset,
    updateAsset,
  };
}

// React component for displaying Cloudinary images with transformations
export interface CloudinaryImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  component: CloudinaryComponent;
  publicId: string;
  transformation?: CloudinaryTransformation;
  fallback?: React.ReactNode;
  loader?: React.ReactNode;
}

export const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  component,
  publicId,
  transformation,
  fallback,
  loader,
  alt = "",
  className,
  style,
  ...imgProps
}: CloudinaryImageProps) => {
  const { transformedUrl, secureUrl, isLoading } = useCloudinaryImage(
    component,
    publicId,
    transformation
  );
  const [_imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  if (isLoading) {
    return loader ? <>{loader}</> : <div>Loading...</div>;
  }

  if (imageError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <img
      {...imgProps}
      src={secureUrl || transformedUrl}
      alt={alt}
      className={className}
      style={style}
      onLoad={() => setImageLoading(false)}
      onError={() => setImageError(true)}
    />
  );
};

// File upload component with drag and drop
export interface CloudinaryUploadProps {
  component: CloudinaryComponent;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  options?: UploadOptions;
  accept?: string;
  multiple?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({
  component,
  onUploadComplete,
  onUploadError,
  options,
  accept = "image/*",
  multiple = false,
  className,
  style,
  children,
}) => {
  const { upload, isUploading, progress, error } =
    useCloudinaryUpload(component);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        try {
          const result = await upload(file, options);
          onUploadComplete?.(result);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Upload failed";
          onUploadError?.(errorMessage);
        }
      }
    },
    [upload, options, onUploadComplete, onUploadError]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div
      className={`cloudinary-upload ${isDragOver ? "drag-over" : ""} ${className || ""}`}
      style={{
        border: "2px dashed #ccc",
        borderRadius: "8px",
        padding: "20px",
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: isDragOver ? "#f0f0f0" : "transparent",
        ...style,
      }}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {children || (
        <div>
          <p>Drag and drop files here, or click to select</p>
          {isUploading && (
            <div>
              <p>Uploading... {progress}%</p>
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#e0e0e0",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "8px",
                    backgroundColor: "#4CAF50",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}
          {error && <p style={{ color: "red" }}>Error: {error}</p>}
        </div>
      )}
    </div>
  );
};
