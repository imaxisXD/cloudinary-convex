"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import React, { useState, useCallback, useRef } from "react";
import type { FunctionReference } from "convex/server";
import type {
  CloudinaryTransformation,
  UploadOptions,
  ListAssetsOptions,
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

// Transform result type
export interface TransformResult {
  transformedUrl: string;
  secureUrl: string;
}

// Delete result type
export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Type definitions for the API functions that apps should create using makeCloudinaryAPI.
 * These are the function references that React hooks expect.
 */
export interface CloudinaryAPI {
  upload: FunctionReference<
    "action",
    "public",
    {
      base64Data: string;
      filename?: string;
      folder?: string;
      tags?: string[];
      transformation?: CloudinaryTransformation;
      publicId?: string;
      userId?: string;
    },
    UploadResult
  >;
  transform: FunctionReference<
    "query",
    "public",
    {
      publicId: string;
      transformation: CloudinaryTransformation;
    },
    TransformResult
  >;
  listAssets: FunctionReference<
    "query",
    "public",
    {
      userId?: string;
      folder?: string;
      tags?: string[];
      limit?: number;
      orderBy?: "uploadedAt" | "updatedAt";
      order?: "asc" | "desc";
    },
    CloudinaryAsset[]
  >;
  getAsset: FunctionReference<
    "query",
    "public",
    { publicId: string },
    CloudinaryAsset | null
  >;
  deleteAsset: FunctionReference<
    "action",
    "public",
    { publicId: string },
    DeleteResult
  >;
  updateAsset: FunctionReference<
    "mutation",
    "public",
    {
      publicId: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
    CloudinaryAsset | null
  >;
}

/**
 * Upload hook with progress tracking.
 *
 * **Important:** This hook requires a function reference from your app's API,
 * NOT the component reference directly. Components cannot be called from React.
 *
 * @example
 * ```tsx
 * // First, create API functions in your Convex backend:
 * // convex/cloudinary.ts
 * import { makeCloudinaryAPI } from "@imaxis/cloudinary-convex";
 * export const { upload } = makeCloudinaryAPI(components.cloudinary, config);
 *
 * // Then use in React:
 * import { api } from "../convex/_generated/api";
 *
 * function MyComponent() {
 *   const { upload, isUploading, progress } = useCloudinaryUpload(api.cloudinary.upload);
 *   // ...
 * }
 * ```
 */
export function useCloudinaryUpload(
  uploadFn: FunctionReference<
    "action",
    "public",
    Record<string, unknown>,
    UploadResult
  >
) {
  const uploadAction = useAction(uploadFn);
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

/**
 * Hook for generating transformed image URLs.
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function MyComponent({ publicId }: { publicId: string }) {
 *   const { transformedUrl, isLoading } = useCloudinaryImage(
 *     api.cloudinary.transform,
 *     publicId,
 *     { width: 300, height: 300, crop: "fill" }
 *   );
 *   // ...
 * }
 * ```
 */
export function useCloudinaryImage(
  transformFn: FunctionReference<
    "query",
    "public",
    Record<string, unknown>,
    TransformResult
  >,
  publicId: string | null,
  transformation?: CloudinaryTransformation
) {
  const transformedUrl = useQuery(
    transformFn,
    publicId && transformation ? { publicId, transformation } : "skip"
  );

  return {
    transformedUrl: transformedUrl?.transformedUrl,
    secureUrl: transformedUrl?.secureUrl,
    isLoading: transformedUrl === undefined,
  };
}

/**
 * Hook for listing assets.
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function MyComponent() {
 *   const { assets, isLoading } = useCloudinaryAssets(api.cloudinary.listAssets, {
 *     folder: "uploads",
 *     limit: 20,
 *   });
 *   // ...
 * }
 * ```
 */
export function useCloudinaryAssets(
  listAssetsFn: FunctionReference<
    "query",
    "public",
    Record<string, unknown>,
    CloudinaryAsset[]
  >,
  options?: ListAssetsOptions
) {
  const queryArgs = options ? { ...options } : {};
  const assets = useQuery(listAssetsFn, queryArgs as Record<string, unknown>);

  return {
    assets: assets || [],
    isLoading: assets === undefined,
  };
}

/**
 * Hook for getting a single asset.
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function MyComponent({ publicId }: { publicId: string }) {
 *   const { asset, isLoading } = useCloudinaryAsset(api.cloudinary.getAsset, publicId);
 *   // ...
 * }
 * ```
 */
export function useCloudinaryAsset(
  getAssetFn: FunctionReference<
    "query",
    "public",
    Record<string, unknown>,
    CloudinaryAsset | null
  >,
  publicId: string | null
) {
  const asset = useQuery(getAssetFn, publicId ? { publicId } : "skip");

  return {
    asset,
    isLoading: asset === undefined,
  };
}

/**
 * Hook for asset operations (delete, update).
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function MyComponent() {
 *   const { deleteAsset, updateAsset } = useCloudinaryOperations(
 *     api.cloudinary.deleteAsset,
 *     api.cloudinary.updateAsset
 *   );
 *
 *   const handleDelete = async (publicId: string) => {
 *     await deleteAsset(publicId);
 *   };
 *   // ...
 * }
 * ```
 */
export function useCloudinaryOperations(
  deleteAssetFn: FunctionReference<
    "action",
    "public",
    Record<string, unknown>,
    DeleteResult
  >,
  updateAssetFn: FunctionReference<
    "mutation",
    "public",
    Record<string, unknown>,
    CloudinaryAsset | null
  >
) {
  const deleteAction = useAction(deleteAssetFn);
  const updateMutation = useMutation(updateAssetFn);

  const deleteAsset = useCallback(
    async (publicId: string) => {
      return deleteAction({ publicId });
    },
    [deleteAction]
  );

  const updateAsset = useCallback(
    async (
      publicId: string,
      updates: { tags?: string[]; metadata?: Record<string, unknown> }
    ) => {
      return updateMutation({ publicId, ...updates });
    },
    [updateMutation]
  );

  return {
    deleteAsset,
    updateAsset,
  };
}

/**
 * React component for displaying Cloudinary images with transformations.
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function MyComponent() {
 *   return (
 *     <CloudinaryImage
 *       transformFn={api.cloudinary.transform}
 *       publicId="my-image-id"
 *       transformation={{ width: 300, height: 300, crop: "fill" }}
 *       alt="My image"
 *     />
 *   );
 * }
 * ```
 */
export interface CloudinaryImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  transformFn: FunctionReference<
    "query",
    "public",
    Record<string, unknown>,
    TransformResult
  >;
  publicId: string;
  transformation?: CloudinaryTransformation;
  fallback?: React.ReactNode;
  loader?: React.ReactNode;
}

export const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  transformFn,
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
    transformFn,
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

/**
 * File upload component with drag and drop.
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function MyComponent() {
 *   return (
 *     <CloudinaryUpload
 *       uploadFn={api.cloudinary.upload}
 *       onUploadComplete={(result) => console.log("Uploaded:", result)}
 *       options={{ folder: "uploads" }}
 *     />
 *   );
 * }
 * ```
 */
export interface CloudinaryUploadProps {
  uploadFn: FunctionReference<
    "action",
    "public",
    Record<string, unknown>,
    UploadResult
  >;
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
  uploadFn,
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
    useCloudinaryUpload(uploadFn);
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
