"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useState, useCallback } from "react";
import type { FunctionReference } from "convex/server";
import type {
  CloudinaryTransformation,
  UploadOptions,
  ListAssetsOptions,
  CloudinaryAsset,
  UploadStatus,
} from "../client/index.js";

// Re-export UploadStatus type for convenience
export type { UploadStatus } from "../client/index.js";

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

// ============================================================================
// UPLOAD STATUS TRACKING HOOKS
// ============================================================================

/**
 * Hook for tracking upload status with reactive updates.
 *
 * This hook enables reactive status tracking across browser tabs/devices.
 * Use it to show upload progress indicators or manage failed uploads.
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function UploadStatusIndicator() {
 *   const { uploads, isLoading } = useUploadStatus(
 *     api.cloudinary.getUploadsByStatus,
 *     "uploading",
 *     { userId: currentUserId }
 *   );
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       {uploads.length > 0 && (
 *         <p>{uploads.length} upload(s) in progress...</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUploadStatus(
  getUploadsByStatusFn: FunctionReference<
    "query",
    "public",
    Record<string, unknown>,
    CloudinaryAsset[]
  >,
  status: UploadStatus,
  options?: { userId?: string; limit?: number }
) {
  const queryArgs = { status, ...options };
  const uploads = useQuery(
    getUploadsByStatusFn,
    queryArgs as Record<string, unknown>
  );

  return {
    uploads: uploads || [],
    isLoading: uploads === undefined,
    hasPending: (uploads || []).some((u) => u.status === "pending"),
    hasUploading: (uploads || []).some((u) => u.status === "uploading"),
    hasFailed: (uploads || []).some((u) => u.status === "failed"),
  };
}

/**
 * Hook for managing pending uploads with full CRUD operations.
 *
 * Use this for a complete upload workflow with status tracking:
 * 1. Create a pending upload record
 * 2. Update status to "uploading" when starting
 * 3. Update to "completed" with final data, or "failed" with error
 *
 * @example
 * ```tsx
 * import { api } from "../convex/_generated/api";
 *
 * function TrackedUpload() {
 *   const {
 *     createPending,
 *     updateStatus,
 *     deletePending,
 *   } = usePendingUploads(
 *     api.cloudinary.createPendingUpload,
 *     api.cloudinary.updateUploadStatus,
 *     api.cloudinary.deletePendingUpload
 *   );
 *
 *   const handleUpload = async (file: File) => {
 *     // Create pending record (visible to other tabs)
 *     const { uploadId } = await createPending({ filename: file.name });
 *
 *     // Update to uploading
 *     await updateStatus(uploadId, "uploading");
 *
 *     try {
 *       // Perform actual upload...
 *       const result = await uploadToCloudinary(file);
 *
 *       // Update to completed
 *       await updateStatus(uploadId, "completed", {
 *         publicId: result.public_id,
 *         secureUrl: result.secure_url,
 *       });
 *     } catch (error) {
 *       // Update to failed
 *       await updateStatus(uploadId, "failed", {
 *         errorMessage: error.message,
 *       });
 *     }
 *   };
 * }
 * ```
 */
export function usePendingUploads(
  createPendingFn: FunctionReference<
    "mutation",
    "public",
    Record<string, unknown>,
    { uploadId: string; publicId: string }
  >,
  updateStatusFn: FunctionReference<
    "mutation",
    "public",
    Record<string, unknown>,
    CloudinaryAsset | null
  >,
  deletePendingFn: FunctionReference<
    "mutation",
    "public",
    Record<string, unknown>,
    { success: boolean; error?: string }
  >
) {
  const createMutation = useMutation(createPendingFn);
  const updateMutation = useMutation(updateStatusFn);
  const deleteMutation = useMutation(deletePendingFn);

  const createPending = useCallback(
    async (options?: {
      filename?: string;
      folder?: string;
      tags?: string[];
      userId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      return createMutation(options || {});
    },
    [createMutation]
  );

  const updateStatus = useCallback(
    async (
      uploadId: string,
      status: UploadStatus,
      data?: {
        errorMessage?: string;
        publicId?: string;
        cloudinaryUrl?: string;
        secureUrl?: string;
        format?: string;
        width?: number;
        height?: number;
        bytes?: number;
      }
    ) => {
      return updateMutation({ uploadId, status, ...data });
    },
    [updateMutation]
  );

  const deletePending = useCallback(
    async (uploadId: string) => {
      return deleteMutation({ uploadId });
    },
    [deleteMutation]
  );

  return {
    createPending,
    updateStatus,
    deletePending,
  };
}
